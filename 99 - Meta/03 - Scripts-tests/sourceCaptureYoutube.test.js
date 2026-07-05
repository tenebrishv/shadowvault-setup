const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCaptureYoutube = require("../02 - Scripts/sourceCaptureYoutube.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockFetch, jsonResponse } = require("./_testUtils.js");

test("YouTube: oEmbed fetch succeeds -> embeds iframe using the extracted video id", async () => {
    installMockNotice();
    installMockFetch(async () => jsonResponse({
        title: "A Great Talk",
        author_name: "Some Channel",
        author_url: "https://youtube.com/@somechannel",
        thumbnail_url: "https://img.youtube.com/thumb.jpg",
    }));
    const tp = createMockTp({ prompts: ["https://youtu.be/dQw4w9WgXcQ"] });

    const result = await sourceCaptureYoutube(tp, helpers);

    assert.equal(result.noteTitle, "A Great Talk");
    assert.match(result.yamlFields, /channel: "Some Channel"\n/);
    assert.match(result.body, /embed\/dQw4w9WgXcQ/);
    assert.match(result.body, /thumbnail:: !\[\]\(https:\/\/img\.youtube\.com\/thumb\.jpg\)/);
});

test("YouTube: oEmbed fetch fails -> manual fallback, no iframe embedded", async () => {
    installMockNotice();
    installMockFetch(async () => { throw new Error("network error (mocked)"); });
    const tp = createMockTp({ prompts: ["https://youtu.be/broken", "Manual Title", "Manual Channel"] });

    const result = await sourceCaptureYoutube(tp, helpers);

    assert.equal(result.noteTitle, "Manual Title");
    assert.match(result.yamlFields, /channel: "Manual Channel"\n/);
    assert.doesNotMatch(result.body, /<iframe/);
});

test("YouTube: cancelling the URL prompt aborts capture", async () => {
    installMockNotice();
    const tp = createMockTp({ prompts: [null] });
    const result = await sourceCaptureYoutube(tp, helpers);
    assert.equal(result, null);
});
