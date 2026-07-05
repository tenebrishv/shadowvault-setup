const test = require("node:test");
const assert = require("node:assert/strict");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice } = require("./_testUtils.js");

test("yamlField renders a quoted value when present", () => {
    assert.equal(helpers.yamlField("authors", "James Clear"), 'authors: "James Clear"\n');
});

test("yamlField renders an empty key when falsy", () => {
    assert.equal(helpers.yamlField("authors", ""), "authors:\n");
    assert.equal(helpers.yamlField("authors", undefined), "authors:\n");
});

test("buildBaseYaml sets type: thought only for Thought, source otherwise", () => {
    const tp = createMockTp();
    const thoughtYaml = helpers.buildBaseYaml(tp, { tag: "note/thought", typeName: "Thought", noteTitle: "A claim" });
    const bookYaml = helpers.buildBaseYaml(tp, { tag: "source/book", typeName: "Book", noteTitle: "A book" });

    assert.match(thoughtYaml, /type: thought\n/);
    assert.match(bookYaml, /type: source\n/);
});

test("buildBaseYaml includes tag, alias, and a 14-day review offset", () => {
    const tp = createMockTp();
    const yaml = helpers.buildBaseYaml(tp, { tag: "source/book", typeName: "Book", noteTitle: "Atomic Habits" });

    assert.match(yaml, /^---\n/);
    assert.match(yaml, /tags: source\/book\n/);
    assert.match(yaml, /aliases:\n {2}- "Atomic Habits"\n/);
    assert.match(yaml, /review: YYYY-MM-DD:14\n/); // mock tp.date.now encodes its own args
    assert.match(yaml, /status: inbox\n/);
    assert.match(yaml, /growth: seedling\n/);
});

test("requiredPrompt re-prompts until a non-empty value is given", async () => {
    installMockNotice();
    const tp = createMockTp({ prompts: ["  ", "Real Title"] });
    const val = await helpers.requiredPrompt(tp, "Title");
    assert.equal(val, "Real Title");
});

test("requiredPrompt returns null when the user cancels", async () => {
    installMockNotice();
    const tp = createMockTp({ prompts: [null] });
    const val = await helpers.requiredPrompt(tp, "Title");
    assert.equal(val, null);
});

test("optionalPrompt trims whitespace and passes through null on cancel", async () => {
    const tp = createMockTp({ prompts: ["  Hello  ", null] });
    assert.equal(await helpers.optionalPrompt(tp, "A"), "Hello");
    assert.equal(await helpers.optionalPrompt(tp, "B"), null);
});
