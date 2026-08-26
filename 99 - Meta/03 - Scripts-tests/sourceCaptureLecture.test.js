// SPDX-License-Identifier: AGPL-3.0-only
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sourceCaptureLecture = require("../02 - Scripts/sourceCaptureLecture.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockApp } = require("./_testUtils.js");

const ALL_TEMPLATES = Object.values(sourceCaptureLecture.stubTemplates());

test("Lecture: picking existing Course/Unit/Lecturer creates no new stubs", async () => {
    installMockNotice();
    const { created, frontmatterEdits, state } = installMockApp({
        folders: {
            "04 - MOCS/Courses": ["Cognitive Psychology"],
            "04 - MOCS/Units": ["Unit 1"],
            "09 - Entities/Agents": ["Dr. Vance"],
        },
        files: {
            "04 - MOCS/Courses/Cognitive Psychology.md": { frontmatter: { default_lecturer: "Dr. Vance" } },
            "04 - MOCS/Units/Unit 1.md": { frontmatter: { course: "[[Cognitive Psychology]]" } },
            "09 - Entities/Agents/Dr. Vance.md": { frontmatter: { tags: "agent/person" } },
        },
    });
    const tp = createMockTp({
        suggestions: ["Cognitive Psychology", "Unit 1", "Dr. Vance"],
        prompts: ["Intro to Memory", "3", "2024-03-01", "", "memory, encoding"],
        templates: ALL_TEMPLATES,
        vaultState: state,
    });

    const result = await sourceCaptureLecture(tp, helpers);

    assert.equal(result.noteTitle, "2024-03-01 – Cognitive Psychology – Intro to Memory");
    assert.match(result.yamlFields, /course: "\[\[Cognitive Psychology\]\]"\n/);
    assert.match(result.yamlFields, /unit: "\[\[Unit 1\]\]"\n/);
    assert.match(result.yamlFields, /lecturer: "\[\[Dr\. Vance\]\]"\n/);
    assert.match(result.yamlFields, /lecture_num: "3"\n/);
    assert.match(result.yamlFields, /date_given: "2024-03-01"\n/);
    assert.match(result.yamlFields, /keywords: "memory, encoding"\n/);
    assert.match(result.body, /^# 2024-03-01 – Cognitive Psychology – Intro to Memory/);
    assert.equal(tp._calls.createNew.length, 0, "no stubs should be born when everything already exists");
    assert.equal(created.length, 0);
    assert.equal(frontmatterEdits.length, 0, "an existing course must not get its default_lecturer overwritten");
});

test("Lecture: '➕ Create New' at every step births Course, Unit, and Person from their templates", async () => {
    installMockNotice();
    const { created, frontmatterEdits, state } = installMockApp({ folders: {}, files: {} }); // empty vault
    const tp = createMockTp({
        suggestions: ["➕ Create New", "➕ Create New", "➕ Create New"],
        prompts: [
            "Neuroscience 101", // new course name
            "Unit 1",           // new unit name
            "Dr. Smith",        // new lecturer name
            "Synapses",         // lecture title
            "1",                // lecture number
            "2024-01-10",       // lecture date
            "http://example.com", // recording url
            "synapse",          // keywords
        ],
        templates: ALL_TEMPLATES,
        vaultState: state,
    });

    const result = await sourceCaptureLecture(tp, helpers);

    assert.equal(result.noteTitle, "2024-01-10 – Neuroscience 101 – Synapses");
    assert.match(result.yamlFields, /course: "\[\[Neuroscience 101\]\]"\n/);
    // COURSE-QUALIFIED unit name (#58) — a bare "Unit 1" would collide with
    // any other course's "Unit 1" in the flat Units folder.
    assert.match(result.yamlFields, /unit: "\[\[Neuroscience 101 – Unit 1\]\]"\n/);
    assert.match(result.yamlFields, /lecturer: "\[\[Dr\. Smith\]\]"\n/);

    // Stubs are born from the template files, never hand-written strings.
    assert.equal(created.length, 0, "no stub content should be written by hand");
    assert.deepEqual(tp._calls.createNew, [
        { template: "(TEMPLATE) Course MOC", filename: "Neuroscience 101", folder: "04 - MOCS/Courses" },
        { template: "(TEMPLATE) Unit MOC", filename: "Neuroscience 101 – Unit 1", folder: "04 - MOCS/Units" },
        { template: "(TEMPLATE) Person", filename: "Dr. Smith", folder: "09 - Entities/Agents" },
    ]);

    // Picker-known fills: the unit learns its course; the brand-new course
    // self-populates default_lecturer from the first capture.
    assert.deepEqual(frontmatterEdits, [
        { path: "04 - MOCS/Units/Neuroscience 101 – Unit 1.md", frontmatter: { course: "[[Neuroscience 101]]" } },
        { path: "04 - MOCS/Courses/Neuroscience 101.md", frontmatter: { default_lecturer: "[[Dr. Smith]]" } },
    ]);
});

test("Lecture: default_lecturer accepts quoted-link and unquoted-link frontmatter forms", async () => {
    for (const storedValue of ["[[Dr. Vance]]", [["Dr. Vance"]]]) {
        installMockNotice();
        const { state } = installMockApp({
            folders: {
                "04 - MOCS/Courses": ["Cognitive Psychology"],
                "04 - MOCS/Units": ["Unit 1"],
                "09 - Entities/Agents": [], // Dr. Vance has no note yet
            },
            files: {
                "04 - MOCS/Courses/Cognitive Psychology.md": { frontmatter: { default_lecturer: storedValue } },
                "04 - MOCS/Units/Unit 1.md": { frontmatter: { course: "[[Cognitive Psychology]]" } },
            },
        });
        const tp = createMockTp({
            suggestions: ["Cognitive Psychology", "Unit 1", "Dr. Vance"],
            prompts: ["Intro to Memory", "", "", "", ""],
            templates: ALL_TEMPLATES,
            vaultState: state,
        });

        const result = await sourceCaptureLecture(tp, helpers);

        // The normalized bare name is offered and used — not "[[Dr. Vance]]".
        assert.match(result.yamlFields, /lecturer: "\[\[Dr\. Vance\]\]"\n/);
        assert.deepEqual(tp._calls.createNew, [
            { template: "(TEMPLATE) Person", filename: "Dr. Vance", folder: "09 - Entities/Agents" },
        ], `person stub should be born with the bare name for stored value ${JSON.stringify(storedValue)}`);
    }
});

test("Lecture: a second course's same-named unit gets its own note, not the first course's (#58)", async () => {
    installMockNotice();
    // "Unit 1" already exists and belongs to Cognitive Psychology. The picker
    // filters it out of the Neuroscience list — which is exactly what used to
    // hide the collision — so the user types the same generic name again.
    const { frontmatterEdits, state } = installMockApp({
        folders: {
            "04 - MOCS/Courses": ["Cognitive Psychology", "Neuroscience 101"],
            "04 - MOCS/Units": ["Unit 1"],
            "09 - Entities/Agents": ["Dr. Smith"],
        },
        files: {
            "04 - MOCS/Courses/Cognitive Psychology.md": { frontmatter: {} },
            "04 - MOCS/Courses/Neuroscience 101.md": { frontmatter: {} },
            "04 - MOCS/Units/Unit 1.md": { frontmatter: { course: "[[Cognitive Psychology]]" } },
            "09 - Entities/Agents/Dr. Smith.md": { frontmatter: { tags: "agent/person" } },
        },
    });
    const tp = createMockTp({
        suggestions: ["Neuroscience 101", "➕ Create New", "Dr. Smith"],
        prompts: ["Unit 1", "Synapses", "1", "2024-01-10", "", ""],
        templates: ALL_TEMPLATES,
        vaultState: state,
    });

    const result = await sourceCaptureLecture(tp, helpers);

    assert.match(result.yamlFields, /unit: "\[\[Neuroscience 101 – Unit 1\]\]"\n/,
        "the lecture must not link the other course's unit note");
    assert.deepEqual(tp._calls.createNew, [
        { template: "(TEMPLATE) Unit MOC", filename: "Neuroscience 101 – Unit 1", folder: "04 - MOCS/Units" },
    ], "a distinct unit note is born instead of silently reusing the existing one");
    assert.deepEqual(frontmatterEdits, [
        { path: "04 - MOCS/Units/Neuroscience 101 – Unit 1.md", frontmatter: { course: "[[Neuroscience 101]]" } },
    ], "and Cognitive Psychology's Unit 1 is left untouched");
});

test("Lecture: picking a unit off the list keeps its existing name, qualified or not", async () => {
    installMockNotice();
    // Vaults captured before #58 hold bare unit names. Picking one must reuse
    // that note as-is, never re-qualify it into a second, parallel note.
    const { state } = installMockApp({
        folders: {
            "04 - MOCS/Courses": ["Cognitive Psychology"],
            "04 - MOCS/Units": ["Unit 1"],
            "09 - Entities/Agents": ["Dr. Vance"],
        },
        files: {
            "04 - MOCS/Courses/Cognitive Psychology.md": { frontmatter: {} },
            "04 - MOCS/Units/Unit 1.md": { frontmatter: { course: "[[Cognitive Psychology]]" } },
            "09 - Entities/Agents/Dr. Vance.md": { frontmatter: { tags: "agent/person" } },
        },
    });
    const tp = createMockTp({
        suggestions: ["Cognitive Psychology", "Unit 1", "Dr. Vance"],
        prompts: ["Intro to Memory", "", "", "", ""],
        templates: ALL_TEMPLATES,
        vaultState: state,
    });

    const result = await sourceCaptureLecture(tp, helpers);

    assert.match(result.yamlFields, /unit: "\[\[Unit 1\]\]"\n/);
    assert.equal(tp._calls.createNew.length, 0, "no second note for a unit that already exists");
});

test("Lecture: typing a unit name that already carries its course is not qualified twice", async () => {
    installMockNotice();
    const { state } = installMockApp({
        folders: {
            "04 - MOCS/Courses": ["Cognitive Psychology"],
            "04 - MOCS/Units": [],
            "09 - Entities/Agents": ["Dr. Vance"],
        },
        files: {
            "04 - MOCS/Courses/Cognitive Psychology.md": { frontmatter: {} },
            "09 - Entities/Agents/Dr. Vance.md": { frontmatter: { tags: "agent/person" } },
        },
    });
    const tp = createMockTp({
        suggestions: ["Cognitive Psychology", "➕ Create New", "Dr. Vance"],
        prompts: ["Cognitive Psychology – Unit 1", "Intro to Memory", "", "", "", ""],
        templates: ALL_TEMPLATES,
        vaultState: state,
    });

    const result = await sourceCaptureLecture(tp, helpers);

    assert.match(result.yamlFields, /unit: "\[\[Cognitive Psychology – Unit 1\]\]"\n/);
    assert.deepEqual(tp._calls.createNew, [
        { template: "(TEMPLATE) Unit MOC", filename: "Cognitive Psychology – Unit 1", folder: "04 - MOCS/Units" },
    ]);
});

test("Lecture: cancelling the course picker aborts capture before any prompts", async () => {
    installMockNotice();
    const { state } = installMockApp({ folders: {}, files: {} });
    const tp = createMockTp({ suggestions: [null], templates: ALL_TEMPLATES, vaultState: state });
    const result = await sourceCaptureLecture(tp, helpers);
    assert.equal(result, null);
});

test("Lecture: the template files stubs are born from exist in the vault", () => {
    const templatesDir = path.join(__dirname, "..", "00 - Templates");
    for (const name of ALL_TEMPLATES) {
        assert.ok(
            fs.existsSync(path.join(templatesDir, `${name}.md`)),
            `${name}.md not found in 00 - Templates — renaming it breaks lecture stub creation`
        );
    }
});
