const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCaptureThought = require("../02 - Scripts/sourceCaptureThought.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice } = require("./_testUtils.js");

test("Thought: fully manual capture", async () => {
    installMockNotice();
    const tp = createMockTp({
        prompts: ["Does free will exist?", "Reading about determinism", "A podcast episode"],
    });

    const result = await sourceCaptureThought(tp, helpers);

    assert.equal(result.noteTitle, "Does free will exist?");
    assert.match(result.yamlFields, /context: "Reading about determinism"\n/);
    assert.match(result.yamlFields, /led_here: "A podcast episode"\n/);
    assert.match(result.body, /## Relevant Context\n\nReading about determinism/);
    assert.match(result.body, /## What Led Me Here\n\nA podcast episode/);
});

test("Thought: cancelling the required title prompt aborts capture", async () => {
    installMockNotice();
    const tp = createMockTp({ prompts: [null] });
    const result = await sourceCaptureThought(tp, helpers);
    assert.equal(result, null);
});
