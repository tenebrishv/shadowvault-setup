const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCaptureBook = require("../02 - Scripts/sourceCaptureBook.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockFetch, jsonResponse } = require("./_testUtils.js");

test("Book: ISBN lookup succeeds -> only asks for general_subject fallback and specific_subject", async () => {
    installMockNotice();
    installMockFetch(async () => jsonResponse({
        title: "Thinking, Fast and Slow",
        authors: [{ name: "Daniel Kahneman" }],
        publishers: ["Farrar, Straus and Giroux"],
        publish_date: "2011",
    }));
    const tp = createMockTp({ prompts: ["9780374275631", "Psychology", "Cognitive biases"] });

    const result = await sourceCaptureBook(tp, helpers);

    assert.equal(result.noteTitle, "Thinking, Fast and Slow");
    assert.match(result.yamlFields, /authors: "Daniel Kahneman"\n/);
    assert.match(result.yamlFields, /publish_date: "2011"\n/);
    assert.match(result.yamlFields, /publisher: "Farrar, Straus and Giroux"\n/);
    assert.match(result.yamlFields, /isbn: "9780374275631"\n/);
    assert.match(result.yamlFields, /general_subject: "Psychology"\n/);
    assert.match(result.yamlFields, /specific_subject: "Cognitive biases"\n/);
    assert.match(result.body, /^> \[!meta\]- Metadata/); // no "# Title" heading for Book (matches existing behavior)
});

test("Book: no ISBN -> manual fallback for every field", async () => {
    installMockNotice();
    installMockFetch(async () => { throw new Error("fetch should not be called without an ISBN"); });
    const tp = createMockTp({
        prompts: ["", "Atomic Habits", "James Clear", "2018", "Avery", "Self-help", "Habit formation"],
    });

    const result = await sourceCaptureBook(tp, helpers);

    assert.equal(result.noteTitle, "Atomic Habits");
    assert.match(result.yamlFields, /authors: "James Clear"\n/);
    assert.match(result.yamlFields, /publish_date: "2018"\n/);
    assert.match(result.yamlFields, /publisher: "Avery"\n/);
    assert.match(result.yamlFields, /isbn:\n/); // empty, not quoted
    assert.match(result.yamlFields, /general_subject: "Self-help"\n/);
    assert.match(result.yamlFields, /specific_subject: "Habit formation"\n/);
});

test("Book: cancelling the required title prompt aborts capture", async () => {
    installMockNotice();
    const tp = createMockTp({ prompts: ["", null] }); // skip ISBN, then cancel the title prompt
    const result = await sourceCaptureBook(tp, helpers);
    assert.equal(result, null);
});
