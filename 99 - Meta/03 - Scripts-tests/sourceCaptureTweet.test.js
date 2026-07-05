const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCaptureTweet = require("../02 - Scripts/sourceCaptureTweet.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockFetch, jsonResponse } = require("./_testUtils.js");

test("Tweet: oEmbed fetch succeeds -> only asks keywords + date afterward", async () => {
    installMockNotice();
    installMockFetch(async () => jsonResponse({ author_name: "@someuser", title: 'A tweet with "quotes" in it.' }));
    const tp = createMockTp({ prompts: ["https://twitter.com/someuser/status/1", "obsidian, pkm", "2023-01-01"] });

    const result = await sourceCaptureTweet(tp, helpers);

    assert.equal(result.noteTitle, "someuser — YYYY-MM-DD");
    assert.match(result.yamlFields, /account: "someuser"\n/);
    assert.match(result.yamlFields, /tweet_text: "A tweet with \\"quotes\\" in it\."\n/);
    assert.match(result.body, /^# someuser — YYYY-MM-DD/); // Tweet keeps the title heading (unlike most other types)
});

test("Tweet: oEmbed fetch fails -> manual account + text fallback", async () => {
    installMockNotice();
    installMockFetch(async () => { throw new Error("network error (mocked)"); });
    const tp = createMockTp({
        prompts: ["https://twitter.com/someuser/status/2", "someuser", "Manual tweet text", "", ""],
    });

    const result = await sourceCaptureTweet(tp, helpers);

    assert.match(result.yamlFields, /account: "someuser"\n/);
    assert.match(result.body, /Manual tweet text/);
});

test("Tweet: cancelling the URL prompt aborts capture", async () => {
    installMockNotice();
    const tp = createMockTp({ prompts: [null] });
    const result = await sourceCaptureTweet(tp, helpers);
    assert.equal(result, null);
});
