const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCapturePaper = require("../02 - Scripts/sourceCapturePaper.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockFetch, jsonResponse } = require("./_testUtils.js");

test("Paper: DOI lookup succeeds -> only asks for keywords/abstract fallback", async () => {
    installMockNotice();
    installMockFetch(async () => jsonResponse({
        message: {
            title: ["Attention Is All You Need"],
            author: [{ given: "Ashish", family: "Vaswani" }],
            created: { "date-parts": [[2017]] },
            publisher: "arXiv",
            subject: ["Machine Learning"],
            abstract: "We propose a new network architecture.",
        },
    }));
    const tp = createMockTp({ prompts: ["10.48550/arXiv.1706.03762"] });

    const result = await sourceCapturePaper(tp, helpers);

    assert.equal(result.noteTitle, "Attention Is All You Need");
    assert.match(result.yamlFields, /authors: "Ashish Vaswani"\n/);
    assert.match(result.yamlFields, /doi: "10\.48550\/arXiv\.1706\.03762"\n/);
    assert.match(result.yamlFields, /publish_date: "2017"\n/);
    assert.match(result.yamlFields, /keywords: "Machine Learning"\n/);
    assert.match(result.body, /We propose a new network architecture\./);
});

test("Paper: no DOI -> manual fallback for every field", async () => {
    installMockNotice();
    installMockFetch(async () => { throw new Error("fetch should not be called without a DOI"); });
    const tp = createMockTp({
        // DOI(skip), Title, Author(s), DOI-again(still skipped, since it's re-asked
        // when falsy), Year, Keywords, Abstract
        prompts: ["", "A Manual Paper", "A. Uthor", "", "2019", "keyword1, keyword2", "An abstract."],
    });

    const result = await sourceCapturePaper(tp, helpers);

    assert.equal(result.noteTitle, "A Manual Paper");
    assert.match(result.yamlFields, /authors: "A\. Uthor"\n/);
    assert.match(result.yamlFields, /doi:\n/);
    assert.match(result.yamlFields, /publish_date: "2019"\n/);
    assert.match(result.yamlFields, /keywords: "keyword1, keyword2"\n/);
    assert.match(result.body, /An abstract\./);
});
