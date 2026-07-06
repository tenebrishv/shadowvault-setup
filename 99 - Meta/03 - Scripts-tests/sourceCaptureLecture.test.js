const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCaptureLecture = require("../02 - Scripts/sourceCaptureLecture.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockApp } = require("./_testUtils.js");

test("Lecture: picking existing Course/Unit/Lecturer creates no new stubs", async () => {
    installMockNotice();
    const created = installMockApp({
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
    });

    const result = await sourceCaptureLecture(tp, helpers);

    assert.equal(result.noteTitle, "Intro to Memory");
    assert.match(result.yamlFields, /course: "\[\[Cognitive Psychology\]\]"\n/);
    assert.match(result.yamlFields, /unit: "\[\[Unit 1\]\]"\n/);
    assert.match(result.yamlFields, /lecturer: "\[\[Dr\. Vance\]\]"\n/);
    assert.match(result.yamlFields, /lecture_num: "3"\n/);
    assert.match(result.yamlFields, /date_given: "2024-03-01"\n/);
    assert.match(result.yamlFields, /keywords: "memory, encoding"\n/);
    assert.match(result.body, /^# Intro to Memory/);
    assert.equal(created.length, 0, "no stubs should be created when everything already exists");
});

test("Lecture: choosing '➕ Create New' at every step stubs out Course, Unit, and Person", async () => {
    installMockNotice();
    const created = installMockApp({ folders: {}, files: {} }); // empty vault: nothing exists yet
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
    });

    const result = await sourceCaptureLecture(tp, helpers);

    assert.equal(result.noteTitle, "Synapses");
    assert.match(result.yamlFields, /course: "\[\[Neuroscience 101\]\]"\n/);
    assert.match(result.yamlFields, /unit: "\[\[Unit 1\]\]"\n/);
    assert.match(result.yamlFields, /lecturer: "\[\[Dr\. Smith\]\]"\n/);

    assert.equal(created.length, 3);
    const [course, unit, person] = created;
    assert.equal(course.path, "04 - MOCS/Courses/Neuroscience 101.md");
    assert.match(course.content, /tags:\n {2}- course/);
    assert.equal(unit.path, "04 - MOCS/Units/Unit 1.md");
    assert.match(unit.content, /course: "\[\[Neuroscience 101\]\]"/);
    assert.equal(person.path, "09 - Entities/Agents/Dr. Smith.md");
    assert.match(person.content, /tags: agent\/person/);
});

test("Lecture: cancelling the course picker aborts capture before any prompts", async () => {
    installMockNotice();
    installMockApp({ folders: {}, files: {} });
    const tp = createMockTp({ suggestions: [null] });
    const result = await sourceCaptureLecture(tp, helpers);
    assert.equal(result, null);
});
