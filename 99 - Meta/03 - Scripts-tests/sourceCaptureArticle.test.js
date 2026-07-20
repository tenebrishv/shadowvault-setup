const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCaptureArticle = require("../02 - Scripts/sourceCaptureArticle.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockFetch, jsonResponse } = require("./_testUtils.js");

test("Article: Microlink metadata fetch succeeds", async () => {
    installMockNotice();
    installMockFetch(async () => jsonResponse({
        status: "success",
        data: { title: "How To Take Smart Notes", author: "Sönke Ahrens", publisher: "CreateSpace" },
    }));
    const tp = createMockTp({ prompts: ["https://example.com/smart-notes", "2017-01-01"] });

    const result = await sourceCaptureArticle(tp, helpers);

    assert.equal(result.noteTitle, "How To Take Smart Notes");
    assert.match(result.yamlFields, /authors: "Sönke Ahrens"\n/);
    assert.match(result.yamlFields, /url: "https:\/\/example\.com\/smart-notes"\n/);
    assert.match(result.yamlFields, /publication: "CreateSpace"\n/);
    assert.match(result.yamlFields, /publish_date: "2017-01-01"\n/);
    assert.match(result.body, /\*\*Source:\*\* \[How To Take Smart Notes\]\(https:\/\/example\.com\/smart-notes\)/);
});

test("Article: fetch fails -> manual fallback", async () => {
    installMockNotice();
    installMockFetch(async () => { throw new Error("network error (mocked)"); });
    const tp = createMockTp({
        prompts: ["https://example.com/broken", "Fallback Title", "Some Author", "Some Site", "2020"],
    });

    const result = await sourceCaptureArticle(tp, helpers);

    assert.equal(result.noteTitle, "Fallback Title");
    assert.match(result.yamlFields, /authors: "Some Author"\n/);
    assert.match(result.yamlFields, /publication: "Some Site"\n/);
    assert.match(result.yamlFields, /publish_date: "2020"\n/);
});

test("Article: cancelling the URL prompt aborts capture", async () => {
    installMockNotice();
    const tp = createMockTp({ prompts: [null] });
    const result = await sourceCaptureArticle(tp, helpers);
    assert.equal(result, null);
});
