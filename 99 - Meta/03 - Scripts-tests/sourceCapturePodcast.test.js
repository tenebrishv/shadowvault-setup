const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCapturePodcast = require("../02 - Scripts/sourceCapturePodcast.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice } = require("./_testUtils.js");

test("Podcast: fully manual capture", async () => {
    installMockNotice();
    const tp = createMockTp({
        prompts: ["Episode 42", "Host Name", "Guest Name", "https://podcast.example/42", "2022-11-11", "Philosophy"],
    });

    const result = await sourceCapturePodcast(tp, helpers);

    assert.equal(result.noteTitle, "Episode 42");
    assert.match(result.yamlFields, /host: "Host Name"\n/);
    assert.match(result.yamlFields, /guest: "Guest Name"\n/);
    assert.match(result.yamlFields, /publish_date: "2022-11-11"\n/);
    assert.match(result.yamlFields, /general_subject: "Philosophy"\n/);
    assert.match(result.body, /Timestamp note/);
});

test("Podcast: cancelling the required title prompt aborts capture", async () => {
    installMockNotice();
    const tp = createMockTp({ prompts: [null] });
    const result = await sourceCapturePodcast(tp, helpers);
    assert.equal(result, null);
});
