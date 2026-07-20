/*
 * Frontmatter schema conformance.
 *
 * Checks every frontmatter producer in the vault against the single fixture in
 * _frontmatterSchema.js: the ~21 templates, the Source Capture base-YAML
 * builder, the 9 per-type capture modules, and the METADATA.md field tables.
 *
 * Tests external behaviour only — the YAML TEXT each producer emits — never how
 * a template or helper builds it. See docs/adr/0003.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schema = require("./_frontmatterSchema.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockApp, failingFetch } = require("./_testUtils.js");

const TEMPLATES_DIR = path.join(__dirname, "..", "00 - Templates");
const METADATA_DOC = path.join(__dirname, "..", "01 - Documentation", "METADATA.md");

const KNOWN_FIELDS = schema.allKnownFields();

// ---------------------------------------------------------------------------
// Parser
//
// Deliberately minimal — it handles only the YAML these producers actually
// emit. Every rule below exists because a naive alternative fails, and most of
// those failures are SILENT (an unparsed template contributes no violations and
// the suite stays green), which is why the count assertions below matter.
// ---------------------------------------------------------------------------

// Opening delimiter. The four periodic templates put their "---" on the same
// line as the closing "%>" of a leading Templater block ("%>---"), so a
// `line === "---"` guard would skip all four without a word.
const OPEN_DELIM = /^(?:.*%>)?---\s*$/;
const CLOSE_DELIM = /^---\s*$/;
const KEY_LINE = /^([A-Za-z0-9_-]+):/;

// Strips a trailing "# comment". Two conditions, both load-bearing:
//   - the "#" must sit outside double quotes, so a "#" inside a quoted string
//     survives (`split("#")[0]` would maul it);
//   - the "#" must be preceded by whitespace or start the value, which is what
//     YAML actually requires. Without this, `url: https://example.com/p#frag`
//     silently loses everything from the fragment on.
// Apostrophes are deliberately NOT treated as quote delimiters: no template
// uses single-quoted YAML, and treating them as delimiters breaks any value
// containing a word like "Don't".
function stripComment(s) {
    let inDouble = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '"') inDouble = !inDouble;
        else if (c === "#" && !inDouble && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
    }
    return s;
}

// Returns Map<field, { value, isExpression }>, or null when there is no
// frontmatter block at all.
function parseFrontmatter(text) {
    const lines = text.split(/\r?\n/);
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
        if (OPEN_DELIM.test(lines[i])) { start = i; break; }
    }
    if (start === -1) return null;

    let end = -1;
    for (let i = start + 1; i < lines.length; i++) {
        if (CLOSE_DELIM.test(lines[i])) { end = i; break; }
    }
    if (end === -1) return null;

    const fields = new Map();
    for (const line of lines.slice(start + 1, end)) {
        const m = KEY_LINE.exec(line);
        if (!m) continue; // list items ("  - x") and blanks belong to the previous key
        const key = m[1];
        // Split on the FIRST colon only: `created: <% tp.date.now("YYYY-MM-DDTHH:mm") %>`
        // has three more after the key.
        const rest = line.slice(line.indexOf(":") + 1);
        const value = stripComment(rest).trim().replace(/^["']|["']$/g, "");
        fields.set(key, { value, isExpression: /<%/.test(rest) });
    }
    return fields;
}

function checkVocabulary(producer, fields, allowed) {
    for (const field of fields.keys()) {
        assert.ok(
            KNOWN_FIELDS.has(field),
            `${producer}: unknown field "${field}" — not in the schema vocabulary. ` +
            `Add it to VOCABULARY in _frontmatterSchema.js (and to METADATA.md) if it is intentional.`,
        );
        if (allowed) {
            assert.ok(
                allowed.has(field),
                `${producer}: emits "${field}", which is a known field but is not in this ` +
                `producer's contract. Add it to required/optional in _frontmatterSchema.js.`,
            );
        }
    }
}

function checkEnums(producer, fields) {
    for (const [field, legal] of Object.entries(schema.ENUMS)) {
        const entry = fields.get(field);
        if (!entry || entry.isExpression || entry.value === "") continue;
        assert.ok(
            legal.includes(entry.value),
            `${producer}: ${field} "${entry.value}" is not in enum [${legal.join(", ")}]`,
        );
    }
}

// ---------------------------------------------------------------------------
// The parser itself
//
// Every rule here exists because a plausible naive parser gets it wrong, and
// the resulting failure is SILENT — a mis-parsed field simply doesn't appear,
// contributing no violations. These lock the behaviour in.
// ---------------------------------------------------------------------------

test("Parser: a comment-valued field parses as empty, not as the comment text", () => {
    // Link-affordance comments (see CONTEXT.md). Reading the hint as the value
    // makes the field truthy, which is the bug that poisoned the lecturer picker.
    const fields = parseFrontmatter('---\ndefault_lecturer: # "[[link to an agent/person]]"\n---\n');
    assert.equal(fields.get("default_lecturer").value, "");
});

test("Parser: a '#' not preceded by whitespace is not a comment", () => {
    const fields = parseFrontmatter("---\nurl: https://example.com/page#section\n---\n");
    assert.equal(fields.get("url").value, "https://example.com/page#section");
});

test("Parser: a '#' inside a quoted string is not a comment", () => {
    const fields = parseFrontmatter('---\ntitle: "Sharp # Notes"\n---\n');
    assert.equal(fields.get("title").value, "Sharp # Notes");
});

test("Parser: an apostrophe does not open a quoted region", () => {
    const fields = parseFrontmatter("---\ntitle: Don't Stop # trailing\n---\n");
    assert.equal(fields.get("title").value, "Don't Stop");
});

test("Parser: only the first colon separates key from value", () => {
    const fields = parseFrontmatter('---\ncreated: <% tp.date.now("YYYY-MM-DDTHH:mm") %>\n---\n');
    assert.equal(fields.get("created").isExpression, true);
    assert.match(fields.get("created").value, /YYYY-MM-DDTHH:mm/);
});

test("Parser: finds frontmatter that follows a leading <%* … %> block", () => {
    // The four periodic templates open with a Templater block and glue "%>" to
    // "---". A `line === "---"` guard would skip all four in total silence.
    const fields = parseFrontmatter("<%*\nconst x = 1;\n%>---\ntype: periodic\n---\n");
    assert.equal(fields.get("type").value, "periodic");
});

test("Parser: returns null when there is no frontmatter block", () => {
    assert.equal(parseFrontmatter("<%*\nconst x = 1;\n%>\n# Just a heading\n"), null);
});

test("Parser: list items are attributed to their key, not parsed as fields", () => {
    const fields = parseFrontmatter('---\naliases:\n  - "One"\n  - "Two"\ntags: course\n---\n');
    assert.deepEqual([...fields.keys()], ["aliases", "tags"]);
});

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const templateFiles = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith(".md"));

test("Schema: every template on disk is classified by the fixture", () => {
    for (const file of templateFiles) {
        const name = file.replace(/\.md$/, "");
        assert.ok(
            schema.TEMPLATES[name] || schema.EXEMPT_TEMPLATES[name],
            `${file} has no entry in _frontmatterSchema.js. Every template must be ` +
            `classified (contract or explicit exemption) — a new template cannot opt ` +
            `out of conformance by being forgotten.`,
        );
    }
});

test("Schema: every fixture entry corresponds to a template on disk", () => {
    const onDisk = new Set(templateFiles.map(f => f.replace(/\.md$/, "")));
    for (const name of [...Object.keys(schema.TEMPLATES), ...Object.keys(schema.EXEMPT_TEMPLATES)]) {
        assert.ok(onDisk.has(name), `_frontmatterSchema.js references "${name}", which no longer exists.`);
    }
});

test("Schema: the number of classified templates equals the number on disk", () => {
    // Fails CLOSED. Every parser bug above fails green — an unparsed template
    // simply contributes no violations — so the counts are asserted directly.
    const classified = Object.keys(schema.TEMPLATES).length + Object.keys(schema.EXEMPT_TEMPLATES).length;
    assert.equal(
        classified, templateFiles.length,
        `${classified} templates classified but ${templateFiles.length} .md files found in ${TEMPLATES_DIR}`,
    );
});

for (const [name, contract] of Object.entries(schema.TEMPLATES)) {
    test(`Schema: ${name} conforms`, () => {
        const text = fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.md`), "utf8");
        const fields = parseFrontmatter(text);

        assert.ok(fields, `${name}: no frontmatter block found (parser found no --- delimiters)`);
        assert.ok(fields.size > 0, `${name}: frontmatter block parsed to zero fields`);

        for (const field of contract.required) {
            assert.ok(fields.has(field), `${name}: missing required field "${field}"`);
        }

        const allowed = new Set([...contract.required, ...(contract.optional || [])]);
        checkVocabulary(name, fields, allowed);
        checkEnums(name, fields);

        if (contract.typeValue) {
            assert.equal(
                fields.get("type")?.value, contract.typeValue,
                `${name}: expected type "${contract.typeValue}"`,
            );
        }
    });
}

for (const [name, reason] of Object.entries(schema.EXEMPT_TEMPLATES)) {
    test(`Schema: ${name} is exempt and still emits no frontmatter`, () => {
        const text = fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.md`), "utf8");
        assert.equal(
            parseFrontmatter(text), null,
            `${name} is exempt (${reason}) but now has a frontmatter block. ` +
            `Give it a contract in _frontmatterSchema.js instead.`,
        );
    });
}

// ---------------------------------------------------------------------------
// Source Capture — base YAML
// ---------------------------------------------------------------------------

test("Schema: buildBaseYaml emits exactly the base capture fields", () => {
    const tp = createMockTp({});
    const yaml = helpers.buildBaseYaml(tp, { tag: "source/book", typeName: "Book", noteTitle: "X" });
    const fields = parseFrontmatter(yaml + "---\n");

    assert.ok(fields, "buildBaseYaml: output did not parse as frontmatter");
    for (const field of schema.BASE_CAPTURE_FIELDS) {
        assert.ok(fields.has(field), `buildBaseYaml: missing base field "${field}"`);
    }
    checkVocabulary("buildBaseYaml", fields, new Set(schema.BASE_CAPTURE_FIELDS));
    checkEnums("buildBaseYaml", fields);
});

test("Schema: buildBaseYaml requests the documented date formats", () => {
    // The mocked tp.date.now returns its own arguments, so the emitted value IS
    // the format string — a real-date test could not see a YYYY-MM-DD vs
    // YYYY-MM-DDTHH:mm slip at all.
    const tp = createMockTp({});
    const yaml = helpers.buildBaseYaml(tp, { tag: "source/book", typeName: "Book", noteTitle: "X" });
    const fields = parseFrontmatter(yaml + "---\n");

    for (const [field, format] of Object.entries(schema.BASE_CAPTURE_DATE_FORMATS)) {
        assert.equal(fields.get(field)?.value, format, `buildBaseYaml: ${field} built with the wrong date format`);
    }
});

test("Schema: buildBaseYaml sets type thought for Thought, source otherwise", () => {
    const tp = createMockTp({});
    const asThought = helpers.buildBaseYaml(tp, { tag: "note/thought", typeName: "Thought", noteTitle: "X" });
    const asBook = helpers.buildBaseYaml(tp, { tag: "source/book", typeName: "Book", noteTitle: "X" });

    assert.equal(parseFrontmatter(asThought + "---\n").get("type").value, schema.CAPTURE_TYPE_VALUES.Thought);
    assert.equal(parseFrontmatter(asBook + "---\n").get("type").value, schema.CAPTURE_TYPE_VALUES._default);
});

// ---------------------------------------------------------------------------
// Source Capture — per-type modules
//
// Each module is invoked for real down its manual-prompt fallback (fetch mocked
// to fail), and the yamlFields string it returns is parsed.
// ---------------------------------------------------------------------------

// Invokes one capture module down its manual-prompt fallback. Shared by the
// frontmatter loop and the inline-field loop below so each module's prompt
// wiring is described once.
async function runCapture(type, contract) {
    installMockNotice();
    failingFetch();

    const mockOptions = { prompts: contract.promptScript };
    if (contract.suggestions) mockOptions.suggestions = contract.suggestions;
    if (contract.mockApp) {
        const { state } = installMockApp(contract.mockApp);
        mockOptions.vaultState = state;
        mockOptions.templates = ["(TEMPLATE) Course MOC", "(TEMPLATE) Unit MOC", "(TEMPLATE) Person"];
    }

    const capture = require(`../02 - Scripts/sourceCapture${type}.js`);
    const result = await capture(createMockTp(mockOptions), helpers);

    assert.ok(result, `${type}: capture returned null (prompt script out of sync with the module?)`);
    return result;
}

for (const [type, contract] of Object.entries(schema.CAPTURE)) {
    test(`Schema: ${type} capture emits its documented fields`, async () => {
        const result = await runCapture(type, contract);

        const fields = parseFrontmatter(`---\n${result.yamlFields}---\n`);
        assert.ok(fields, `${type}: yamlFields did not parse`);

        for (const field of contract.required) {
            assert.ok(fields.has(field), `${type} capture: missing documented field "${field}"`);
        }
        checkVocabulary(`${type} capture`, fields, new Set([...contract.required, ...(contract.optional || [])]));
        checkEnums(`${type} capture`, fields);
    });
}

// ---------------------------------------------------------------------------
// Source Capture — inline fields in the note BODY (docs/adr/0005)
//
// The second surface a capture module writes to. Dataview merges same-named
// frontmatter and inline declarations into one array, so an inline field that
// restates a frontmatter key silently doubles it. See the contract comment in
// _frontmatterSchema.js for why both clauses below are needed.
// ---------------------------------------------------------------------------

// Dataview inline field on its own line, optionally inside a callout ("> ").
// Only the line form is matched because that is the only form these modules
// emit; the bracketed `[key:: value]` form would need its own pattern.
const INLINE_FIELD = /^\s*>?\s*([A-Za-z0-9_ -]+?)\s*::\s*(.*)$/;
const FENCE = /^\s*```/;

// Returns [{ key, value, line }] for every inline field declared in a body.
// Fenced code blocks are skipped: the Lecture module emits Dataview queries,
// and a query containing "::" is code, not a declaration.
function parseInlineFields(body) {
    const found = [];
    let inFence = false;
    body.split(/\r?\n/).forEach((line, i) => {
        if (FENCE.test(line)) { inFence = !inFence; return; }
        if (inFence) return;
        const m = INLINE_FIELD.exec(line);
        if (m) found.push({ key: m[1], value: m[2].trim(), line: i + 1 });
    });
    return found;
}

test("Inline: the placeholder allowlist covers every capture module", () => {
    assert.deepEqual(
        Object.keys(schema.CAPTURE_INLINE_PLACEHOLDERS).sort(),
        Object.keys(schema.CAPTURE).sort(),
        "every module in CAPTURE needs an entry in CAPTURE_INLINE_PLACEHOLDERS " +
        "(an empty array is the answer for most of them)",
    );
});

for (const [type, contract] of Object.entries(schema.CAPTURE)) {
    test(`Inline: ${type} capture declares no field twice`, async () => {
        const result = await runCapture(type, contract);

        const frontmatterKeys = new Set(
            [...parseFrontmatter(`---\n${result.yamlFields}---\n`).keys()].map(k => k.toLowerCase()),
        );
        const allowed = new Set(schema.CAPTURE_INLINE_PLACEHOLDERS[type].map(k => k.toLowerCase()));

        for (const { key, value, line } of parseInlineFields(result.body)) {
            const lower = key.toLowerCase();

            // Clause 1 — no echo. Case-insensitive: Dataview canonicalises
            // inline keys, so `Course::` and `course:` are the same field.
            assert.ok(
                !frontmatterKeys.has(lower),
                `${type} capture, body line ${line}: inline field "${key}::" restates the ` +
                `frontmatter key "${lower}". Dataview merges them into one array, so every ` +
                `query on "${lower}" gets the value twice. Render it as plain markdown ` +
                `(**${key}:** …) — that displays identically and declares no field.`,
            );

            // Clause 2 — no captured value.
            assert.equal(
                value, "",
                `${type} capture, body line ${line}: inline field "${key}::" is written with a ` +
                `captured value ("${value}"). Values the capture knows belong in frontmatter; ` +
                `inline fields are empty placeholders for prose written later.`,
            );

            assert.ok(
                allowed.has(lower),
                `${type} capture, body line ${line}: undocumented inline field "${key}::". ` +
                `Add it to CAPTURE_INLINE_PLACEHOLDERS.${type} in _frontmatterSchema.js if it is ` +
                `a deliberate placeholder.`,
            );
        }
    });
}

// ---------------------------------------------------------------------------
// METADATA.md
//
// Coupled at field NAMES and ENUM VALUES only. Descriptions, ordering and prose
// stay free-form, so editing the docs for clarity never breaks the build.
// ---------------------------------------------------------------------------

const metadataDoc = fs.readFileSync(METADATA_DOC, "utf8");

// Field names from every fenced ```yaml block.
// NOTE: every line-break match here is \r?\n. Git checks this repo out with
// CRLF on Windows, so an \n-only regex silently matches NOTHING — the doc
// parses as zero fields and the bidirectional checks fail wholesale.
function documentedFields(doc) {
    const found = new Set();
    for (const block of doc.matchAll(/```yaml\r?\n([\s\S]*?)```/g)) {
        for (const line of block[1].split(/\r?\n/)) {
            const m = KEY_LINE.exec(line);
            if (m) found.add(m[1]);
        }
    }
    return found;
}

// Enum values from a table introduced by a bolded field name, e.g.
//   **growth**
//   | Value | Badge |
//   |---|---|
//   | seedling | 🌱 Seedling |
function documentedEnum(doc, field) {
    const re = new RegExp(`\\*\\*${field}\\*\\*\\s*\\r?\\n\\r?\\n((?:\\|.*\\r?\\n)+)`, "i");
    const m = re.exec(doc);
    if (!m) return null;
    return m[1]
        .split(/\r?\n/)
        .map(row => row.split("|")[1]?.trim())
        .filter(v => v && !/^-+$/.test(v) && v.toLowerCase() !== "value");
}

// Both directions report EVERY violation at once. A first-failure-only
// assertion turns "the docs are missing six fields" into six sequential
// red-fix-red cycles.
test("Doc parser: reads CRLF documents as well as LF", () => {
    // Git checks this repo out with CRLF on Windows. An \n-only regex matches
    // nothing at all — the doc parses as zero fields, and BOTH bidirectional
    // checks below fail wholesale with a misleading "79 fields undocumented".
    const crlf = '**growth**\r\n\r\n| Value | Badge |\r\n|---|---|\r\n| seedling | x |\r\n\r\n' +
                 '```yaml\r\nid:\r\ntitle:\r\n```\r\n';
    assert.deepEqual([...documentedFields(crlf)].sort(), ["id", "title"]);
    assert.deepEqual(documentedEnum(crlf, "growth"), ["seedling"]);
});

test("Schema: every documented field is in the fixture vocabulary", () => {
    const unknown = [...documentedFields(metadataDoc)].filter(f => !KNOWN_FIELDS.has(f));
    assert.deepEqual(
        unknown, [],
        `METADATA.md documents ${unknown.length} field(s) no producer emits: ${unknown.join(", ")}`,
    );
});

test("Schema: every fixture field is documented in METADATA.md", () => {
    const documented = documentedFields(metadataDoc);
    const undocumented = [...KNOWN_FIELDS].filter(f => !documented.has(f));
    assert.deepEqual(
        undocumented, [],
        `${undocumented.length} field(s) in the fixture vocabulary appear in no METADATA.md ` +
        `yaml block: ${undocumented.join(", ")}`,
    );
});

for (const field of ["type", "growth", "status", "period"]) {
    test(`Schema: METADATA.md and the fixture agree on the ${field} enum`, () => {
        const documented = documentedEnum(metadataDoc, field);
        assert.ok(documented, `METADATA.md has no value table for "${field}"`);
        assert.deepEqual(
            [...documented].sort(), [...schema.ENUMS[field]].sort(),
            `${field} enum differs between METADATA.md and _frontmatterSchema.js`,
        );
    });
}
