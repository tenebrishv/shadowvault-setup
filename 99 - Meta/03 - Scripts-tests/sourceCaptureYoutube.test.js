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
    // The fetched channel URL and thumbnail are frontmatter fields (queryable),
    // and the body renders them as plain markdown — no `::`, which would declare
    // a duplicate of the frontmatter copy. See docs/adr/0005.
    assert.match(result.yamlFields, /channel_url: "https:\/\/youtube\.com\/@somechannel"\n/);
    assert.match(result.yamlFields, /thumbnail: "https:\/\/img\.youtube\.com\/thumb\.jpg"\n/);
    assert.match(result.body, /\*\*Channel:\*\* \[Some Channel\]\(https:\/\/youtube\.com\/@somechannel\)/);
    assert.match(result.body, /^> !\[\]\(https:\/\/img\.youtube\.com\/thumb\.jpg\)$/m);
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
