const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCaptureBook = require("../02 - Scripts/sourceCaptureBook.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockFetch, jsonResponse } = require("./_testUtils.js");

// The shape below is a real /api/books?jscmd=data response, trimmed. Keep it
// that way: this mock previously described the *edition* endpoint's flat shape
// (bare `publishers: ["..."]`, top-level `title`), which no endpoint the module
// calls actually returns — so the suite passed green while capture was broken
// against the live API. Re-probe with curl before editing these fixtures.
const OPEN_LIBRARY_RESPONSE = {
    "ISBN:9780374275631": {
        title: "Thinking, Fast and Slow",
        authors: [{ name: "Daniel Kahneman", url: "https://openlibrary.org/authors/OL225457A/" }],
        publishers: [{ name: "Farrar, Straus and Giroux" }],
        publish_date: "2011",
    },
};

test("Book: ISBN lookup succeeds -> only asks for general_subject fallback and specific_subject", async () => {
    installMockNotice();
    const requested = [];
    installMockFetch(async (url) => {
        requested.push(url);
        return jsonResponse(OPEN_LIBRARY_RESPONSE);
    });
    const tp = createMockTp({ prompts: ["9780374275631", "Psychology", "Cognitive biases"] });

    const result = await sourceCaptureBook(tp, helpers);

    // Pins the endpoint, not just the parsing: /isbn/<isbn>.json answers 302,
    // which fetch surfaces as a non-ok response, so every lookup silently fell
    // through to the manual path.
    assert.match(requested[0], /\/api\/books\?bibkeys=ISBN:9780374275631&/);
    assert.match(requested[0], /jscmd=data/);

    assert.equal(result.noteTitle, "Thinking, Fast and Slow");
    assert.match(result.yamlFields, /authors: "Daniel Kahneman"\n/);
    assert.match(result.yamlFields, /publish_date: "2011"\n/);
    assert.match(result.yamlFields, /publisher: "Farrar, Straus and Giroux"\n/);
    assert.match(result.yamlFields, /isbn: "9780374275631"\n/);
    assert.match(result.yamlFields, /general_subject: "Psychology"\n/);
    assert.match(result.yamlFields, /specific_subject: "Cognitive biases"\n/);
    assert.match(result.body, /^> \[!meta\]- Metadata/); // no "# Title" heading for Book (matches existing behavior)
});

test("Book: an ISBN Open Library doesn't know -> manual fallback", async () => {
    installMockNotice();
    // Not an error response: unknown bibkeys come back 200 with an empty object,
    // so "did we get a payload" is not the same question as "did we get a book".
    installMockFetch(async () => jsonResponse({}));
    const tp = createMockTp({
        prompts: ["9999999999999", "Some Book", "Some Author", "2020", "A Publisher", "Subject", "Specific"],
    });

    const result = await sourceCaptureBook(tp, helpers);

    assert.equal(result.noteTitle, "Some Book");
    assert.match(result.yamlFields, /authors: "Some Author"\n/);
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
