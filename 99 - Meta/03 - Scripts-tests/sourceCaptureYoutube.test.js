const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCaptureYoutube = require("../02 - Scripts/sourceCaptureYoutube.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockFetch, jsonResponse } = require("./_testUtils.js");

test("YouTube: oEmbed fetch succeeds -> emits a bare Media Extended embed", async () => {
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

    // The player is a bare `![](watch-url)` MX embed, NOT the old fixed-size
    // <iframe> (issue #29). Bare = no WxH, so MX sizes it responsively.
    assert.match(result.body, /^!\[\]\(https:\/\/youtu\.be\/dQw4w9WgXcQ\)$/m);
    assert.doesNotMatch(result.body, /<iframe/);

    // `media:` mirrors `url:`, and `mx-uid:` is what MX actually identifies the
    // media-note by — without it MX ignores `media:` entirely and spawns a
    // duplicate under `media-lib/` (issue #30, verified in Obsidian 2026-07-23).
    assert.match(result.yamlFields, /url: "https:\/\/youtu\.be\/dQw4w9WgXcQ"\n/);
    assert.match(result.yamlFields, /media: "https:\/\/youtu\.be\/dQw4w9WgXcQ"\n/);
    assert.match(result.yamlFields, /mx-uid: "[a-z][a-z0-9]{23}"\n/);

    // The fetched channel URL and thumbnail are frontmatter fields (queryable),
    // and the body renders them as plain markdown — no `::`, which would declare
    // a duplicate of the frontmatter copy. See docs/adr/0005.
    assert.match(result.yamlFields, /channel_url: "https:\/\/youtube\.com\/@somechannel"\n/);
    assert.match(result.yamlFields, /thumbnail: "https:\/\/img\.youtube\.com\/thumb\.jpg"\n/);
    assert.match(result.body, /\*\*Channel:\*\* \[Some Channel\]\(https:\/\/youtube\.com\/@somechannel\)/);
    // `thumbnail:` stays queryable in frontmatter, but the body no longer
    // renders it — the player above shows the poster frame itself (#29).
    assert.doesNotMatch(result.body, /^> !\[\]\(https:\/\/img\.youtube\.com\/thumb\.jpg\)$/m);
});

test("YouTube: the capture prompt names the side-pane view, never the inline embed", async () => {
    // Capture is view-gated (issue #33): the timestamp/screenshot commands
    // require an active media VIEW, so the inline embed can never capture. The
    // #29 prototype's prompt said "right-click the player", written before #33
    // proved otherwise — this test exists so that wording cannot come back.
    installMockNotice();
    installMockFetch(async () => jsonResponse({
        title: "A Great Talk",
        author_name: "Some Channel",
        author_url: "https://youtube.com/@somechannel",
        thumbnail_url: "https://img.youtube.com/thumb.jpg",
    }));
    const tp = createMockTp({ prompts: ["https://youtu.be/dQw4w9WgXcQ"] });

    const result = await sourceCaptureYoutube(tp, helpers);

    assert.match(result.body, /side-pane player/i);
    assert.match(result.body, /cannot capture/i);
    // The switcher command MUST be named exactly as Media Extended registers
    // it. Issue #51: the prompt said "Open media switcher", which matches
    // nothing in the palette, so the reader hit the same dead end the prompt
    // was written to prevent. MX's real title is "Open media quick switcher"
    // (`open-media-switcher`, verified in the vendored v4.2.7 main.js).
    assert.match(result.body, /\bOpen media quick switcher\b/);
    assert.doesNotMatch(result.body, /Open media switcher/);
    // The old hand-rolled seek-link stub used `?t=`; MX emits `#t=` itself.
    assert.doesNotMatch(result.body, /\?t=/);
    assert.doesNotMatch(result.body, /%%/);
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

// ---------------------------------------------------------------------------
// Source recap (issue #44; ADR 0010).
//
// YouTube is the FIRST type to carry a recap, not the only one — issue #41
// rolls it out to Book, Article, Paper, Video and Podcast. These assertions
// pin the wiring (that the module calls the shared helper with the right noun
// and places it correctly), not the block's shape, which sourceCaptureHelpers
// .test.js owns. Duplicating the shape here would make #41 a two-file edit.

test("YouTube: body carries the Source recap, below the capture bucket", async () => {
    installMockNotice();
    installMockFetch(async () => jsonResponse({
        title: "A Great Talk",
        author_name: "Some Channel",
        author_url: "https://youtube.com/@somechannel",
        thumbnail_url: "https://img.youtube.com/thumb.jpg",
    }));
    const tp = createMockTp({ prompts: ["https://youtu.be/dQw4w9WgXcQ"] });

    const result = await sourceCaptureYoutube(tp, helpers);

    // Exactly the shared helper's output, for the video noun — not a local copy.
    assert.ok(result.body.includes(helpers.recapBlock("video")),
        "body must embed helpers.recapBlock(\"video\") verbatim");
    // The recap is written after watching, so it must follow the `## Notes`
    // bucket AND the empty `- ` bullet the reader jots into while watching.
    assert.ok(result.body.indexOf("## Source Recap") > result.body.indexOf("## Notes"),
        "recap must sit below the capture bucket");
});

// The recap replaces the holistic scaffold that ADR 0010 moved OFF the
// Literature template. If these headings ever reappear on a literature note,
// the reflection has two homes again — the drift ADR 0010 exists to stop.
test("YouTube: the recap carries the holistic scaffold, not atomic prompts", async () => {
    installMockNotice();
    installMockFetch(async () => jsonResponse({ title: "A Great Talk", author_name: "Some Channel" }));
    const tp = createMockTp({ prompts: ["https://youtu.be/dQw4w9WgXcQ"] });

    const result = await sourceCaptureYoutube(tp, helpers);

    assert.match(result.body, /^### In My Own Words$/m);
    assert.match(result.body, /^### What This Makes Me Think$/m);
    assert.match(result.body, /^### Connections$/m);
    // No `::` may enter the body via the recap (ADR 0005).
    assert.doesNotMatch(result.body, /\w+::/);
});
