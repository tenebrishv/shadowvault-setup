/*
 * Dashboard enum conformance.
 *
 * frontmatterSchema.test.js pins what the vault WRITES. This file pins what the
 * vault READS: every `status`/`growth`/`type`/`period` literal in a dashboard or
 * periodic-note query must be a member of the same enums, and the shared badge
 * view must map every value in them.
 *
 * WHY THIS EXISTS
 * The Sources Dashboard spent four minor versions querying `status = "reading"`
 * — a value no producer has ever written — so it rendered empty for real vault
 * content while looking perfectly healthy. Nothing failed, because a Dataview
 * query that matches nothing is indistinguishable from a vault with no notes.
 * The same silence let a `type: daily` badge arm outlive its producer. Both are
 * read-side drift, and only a read-side check catches them.
 *
 * Tests the TEXT of the queries, not their results — Dataview cannot run
 * outside Obsidian. That is enough: the defect class here is a literal that no
 * longer exists in the enum, which is visible in the source.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schema = require("./_frontmatterSchema.js");
const badgeView = require("../05 - Views/badge-table/view.js");

const NEXUS_DIR = path.join(__dirname, "..", "..", "08 - Nexus");
const TEMPLATES_DIR = path.join(__dirname, "..", "00 - Templates");
const METADATA_DOC = path.join(__dirname, "..", "01 - Documentation", "METADATA.md");

const ENUM_FIELDS = ["status", "growth", "type", "period"];

// Periodic templates carry vault-wide queries that filter on `type`; they drift
// exactly like a dashboard does. (TEMPLATE) Daily Enhanced.md's `type != "daily"`
// survived the enum change that killed the value it names.
const SCANNED_TEMPLATES = [
    "(TEMPLATE) Daily Enhanced.md",
    "(TEMPLATE) Weekly.md",
    "(TEMPLATE) Monthly.md",
    "(TEMPLATE) Yearly.md",
];

function scannedFiles() {
    const files = fs.readdirSync(NEXUS_DIR)
        .filter(f => f.endsWith(".md"))
        .map(f => [path.join("08 - Nexus", f), path.join(NEXUS_DIR, f)]);
    for (const name of SCANNED_TEMPLATES) {
        files.push([path.join("99 - Meta/00 - Templates", name), path.join(TEMPLATES_DIR, name)]);
    }
    return files;
}

// ---------------------------------------------------------------------------
// Literal extraction
//
// Four shapes, because the dashboards now speak two query languages:
//   DQL   status = "inbox"            /  contains(list("a","b"), status)
//   JS    p.status === "inbox"        /  ["a","b"].includes(p.status)
// The `\b` before the field name matches after a `p.` prefix too, since "." is
// not a word character — so one pattern covers both languages' comparisons.
//
// Every line-break-adjacent regex here uses \r?\n for the same reason
// frontmatterSchema.test.js does: this repo checks out CRLF on Windows, and an
// \n-only pattern matches NOTHING and passes silently.
// ---------------------------------------------------------------------------

const PATTERNS = [
    // status = "inbox"  |  p.type !== "moc"
    { re: /\b(status|growth|type|period)\s*(?:!==|===|!=|==|=)\s*"([^"]*)"/g, field: 1, value: 2 },
    // "inbox" = status
    { re: /"([^"]*)"\s*(?:!==|===|!=|==|=)\s*\b(status|growth|type|period)\b/g, field: 2, value: 1 },
];

// ["a","b"].includes(p.status)  and  contains(list("a","b"), status)
const LIST_PATTERNS = [
    /\[([^\]]*)\]\.includes\(\s*p\.(status|growth|type|period)\s*\)/g,
    /\blist\(([^)]*)\)\s*,\s*\b(status|growth|type|period)\b/g,
];

function extractLiterals(text) {
    const found = [];
    for (const { re, field, value } of PATTERNS) {
        for (const m of text.matchAll(re)) {
            found.push({ field: m[field], value: m[value] });
        }
    }
    for (const re of LIST_PATTERNS) {
        for (const m of text.matchAll(re)) {
            for (const lit of m[1].matchAll(/"([^"]*)"/g)) {
                found.push({ field: m[2], value: lit[1] });
            }
        }
    }
    return found;
}

test("Query parser: reads both DQL and DataviewJS comparison shapes", () => {
    const sample = [
        'WHERE status = "inbox"',
        'AND type != "periodic"',
        '.where(p => p.growth === "seedling")',
        '["inbox", "processing"].includes(p.status)',
        'WHERE !contains(list("archived"), status)',
        // Must NOT match: an alias, not a comparison.
        'TABLE WITHOUT ID key AS "Type"',
    ].join("\r\n");

    const got = extractLiterals(sample).map(l => `${l.field}=${l.value}`).sort();
    assert.deepEqual(got, [
        "growth=seedling",
        "status=archived",
        "status=inbox",
        "status=inbox",
        "status=processing",
        "type=periodic",
    ]);
});

// ---------------------------------------------------------------------------
// The check itself
// ---------------------------------------------------------------------------

test("Dashboards: every enum literal in a query is a member of that enum", () => {
    const violations = [];
    let total = 0;

    for (const [rel, abs] of scannedFiles()) {
        for (const { field, value } of extractLiterals(fs.readFileSync(abs, "utf8"))) {
            total++;
            if (!schema.ENUMS[field].includes(value)) {
                violations.push(`${rel}: ${field} = "${value}"`);
            }
        }
    }

    // A silent parse failure (bad regex, renamed folder) would find zero
    // literals and report zero violations — green, and worthless. The floor is
    // deliberately well under the current count so ordinary edits don't trip it.
    assert.ok(total >= 10, `Query parser found only ${total} enum literals; it is probably broken`);

    assert.deepEqual(
        violations, [],
        `${violations.length} quer(y/ies) filter on a value outside the canonical enum — ` +
        `they will silently match nothing:\n  ${violations.join("\n  ")}`,
    );
});

// ---------------------------------------------------------------------------
// The shared badge view
//
// Read straight off the module rather than regex-parsed: view.js exports its
// maps under a `typeof module` guard precisely so this file can. See its header.
// ---------------------------------------------------------------------------

const BADGE_MAPS = {
    growth: badgeView.GROWTH_BADGES,
    status: badgeView.STATUS_BADGES,
    type: badgeView.TYPE_BADGES,
};

for (const [field, map] of Object.entries(BADGE_MAPS)) {
    test(`Badge view: the ${field} map is total over the ${field} enum`, () => {
        assert.deepEqual(
            Object.keys(map).sort(), [...schema.ENUMS[field]].sort(),
            `badge-table's ${field} map and the ${field} enum disagree — an enum value ` +
            `with no arm renders a blank badge, which is how "daily" survived its producer`,
        );
    });
}

// METADATA.md#visual-badges is the human-readable statement of the same mapping.
// Parsed the same way frontmatterSchema.test.js parses its enum tables.
const metadataDoc = fs.readFileSync(METADATA_DOC, "utf8");

function documentedBadges(doc, field) {
    const re = new RegExp(`\\*\\*${field}\\*\\*\\s*\\r?\\n\\r?\\n((?:\\|.*\\r?\\n)+)`, "i");
    const m = re.exec(doc);
    if (!m) return null;
    const out = {};
    for (const row of m[1].split(/\r?\n/)) {
        const cells = row.split("|");
        const value = cells[1]?.trim();
        const badge = cells[2]?.trim();
        if (!value || !badge || /^-+$/.test(value) || value.toLowerCase() === "value") continue;
        out[value] = badge;
    }
    return out;
}

for (const [field, map] of Object.entries(BADGE_MAPS)) {
    test(`Badge view: the ${field} map matches METADATA.md#visual-badges`, () => {
        const documented = documentedBadges(metadataDoc, field);
        assert.ok(documented, `METADATA.md has no badge table for "${field}"`);
        assert.deepEqual(
            map, documented,
            `badge-table's ${field} map differs from METADATA.md, which the docs call the ` +
            `single source of truth for this mapping`,
        );
    });
}
