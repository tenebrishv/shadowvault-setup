const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCaptureVideo = require("../02 - Scripts/sourceCaptureVideo.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice } = require("./_testUtils.js");

test("Video: fully manual capture", async () => {
    installMockNotice();
    const tp = createMockTp({
        prompts: ["A Great Talk", "Vimeo", "Some Creator", "https://vimeo.com/123", "2023-05-01"],
    });

    const result = await sourceCaptureVideo(tp, helpers);

    assert.equal(result.noteTitle, "A Great Talk");
    assert.match(result.yamlFields, /source: "Vimeo"\n/);
    assert.match(result.yamlFields, /channel: "Some Creator"\n/);
    assert.match(result.yamlFields, /url: "https:\/\/vimeo\.com\/123"\n/);
    assert.match(result.yamlFields, /released: "2023-05-01"\n/);
    assert.match(result.body, /\*\*Platform:\*\* Vimeo/);
});

test("Video: cancelling the required title prompt aborts capture", async () => {
    installMockNotice();
    const tp = createMockTp({ prompts: [null] });
    const result = await sourceCaptureVideo(tp, helpers);
    assert.equal(result, null);
});
