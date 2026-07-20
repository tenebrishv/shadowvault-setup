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

// Regression: a fetched title carrying a double quote used to be interpolated
// raw into a double-quoted YAML scalar, producing `- ""SHOUTED" rest"` —
// invalid YAML, so Obsidian failed to parse the whole frontmatter block.
// Found capturing a real YouTube video with a quoted headline for a title.
test("yamlField escapes quotes and backslashes in the value", () => {
    assert.equal(
        helpers.yamlField("channel", '"HASTA DICIEMBRE" 🗣️ SCALONI'),
        'channel: "\\"HASTA DICIEMBRE\\" 🗣️ SCALONI"\n',
    );
    assert.equal(
        helpers.yamlField("title", "C:\\path\\to"),
        'title: "C:\\\\path\\\\to"\n',
    );
});

test("yamlField folds newlines so a value cannot break out of its scalar", () => {
    assert.equal(helpers.yamlField("title", "line one\nline two"), 'title: "line one line two"\n');
});

test("buildBaseYaml escapes quotes in the alias", () => {
    const tp = createMockTp();
    const yaml = helpers.buildBaseYaml(tp, {
        tag: "source/youtube",
        typeName: "YouTube",
        noteTitle: '"HASTA DICIEMBRE VOY A ESTAR" 🗣️ SCALONI',
    });

    assert.match(yaml, /aliases:\n {2}- "\\"HASTA DICIEMBRE VOY A ESTAR\\" 🗣️ SCALONI"\n/);
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

// --- sanitizeTitle ---
// Canonical filename cleaner. Before this consolidated, the regex existed in
// five places in two variants: the majority form (orchestrator/Lecture/Tweet)
// and a narrower YouTube form that kept * ? < >. The table below covers the
// characters the two variants disagreed on, so a future drift fails here.

test("sanitizeTitle strips every filename-illegal character", () => {
    const cases = [
        // [input, expected, what it covers]
        ["Plain Title", "Plain Title", "leaves clean titles alone"],
        ["A/B\C", "ABC", "slashes (both variants stripped these)"],
        ['He said: "hi"', "He said hi", "colon and quotes"],
        ["Tag #1 ^ref [x] |y|", "Tag 1 ref x y", "obsidian-hostile chars"],
        // The four the old YouTube variant let through:
        ["What?! Really*", "What! Really", "question mark and asterisk"],
        ["<script>", "script", "angle brackets"],
        ["  padded  ", "padded", "trims surrounding whitespace"],
    ];
    for (const [input, expected, what] of cases) {
        assert.equal(helpers.sanitizeTitle(input), expected, what);
    }
});

test("sanitizeTitle collapses newlines to spaces", () => {
    // Tweet titles could carry newlines from oEmbed text.
    assert.equal(helpers.sanitizeTitle("line one\nline two"), "line one line two");
});

test("sanitizeTitle tolerates empty and missing input", () => {
    assert.equal(helpers.sanitizeTitle(""), "");
    assert.equal(helpers.sanitizeTitle(undefined), "");
    assert.equal(helpers.sanitizeTitle(null), "");
});

// --- fetchWithFallback ---
// The try-fetch -> success Notice / catch -> failure Notice -> manual-prompts
// skeleton that Book, Article, Paper, YouTube and Tweet each hand-rolled.

test("fetchWithFallback returns fetched data and announces success", async () => {
    const notices = installMockNotice();
    const tp = createMockTp();

    const data = await helpers.fetchWithFallback(tp, {
        label: "book data from ISBN",
        fetch: async () => ({ title: "Atomic Habits" }),
        manual: async () => { throw new Error("manual path must not run"); },
    });

    assert.deepEqual(data, { title: "Atomic Habits" });
    assert.ok(notices.some(m => m === "Fetched book data from ISBN"));
});

test("fetchWithFallback falls back to manual prompts when the fetch throws", async () => {
    const notices = installMockNotice();
    const tp = createMockTp();

    const data = await helpers.fetchWithFallback(tp, {
        label: "article metadata",
        fetch: async () => { throw new Error("network error (mocked)"); },
        manual: async () => ({ title: "Typed By Hand" }),
    });

    assert.deepEqual(data, { title: "Typed By Hand" });
    assert.ok(
        notices.some(m => /could not fetch article metadata/i.test(m)),
        "failure Notice names the same label as the success one",
    );
});

test("fetchWithFallback skips the fetch entirely when skip is set", async () => {
    const notices = installMockNotice();
    const tp = createMockTp();
    let fetched = false;

    const data = await helpers.fetchWithFallback(tp, {
        label: "paper metadata from DOI",
        skip: true, // e.g. the user gave no DOI
        fetch: async () => { fetched = true; return {}; },
        manual: async () => ({ title: "Manual Paper" }),
    });

    assert.equal(fetched, false, "no network call without an identifier");
    assert.deepEqual(data, { title: "Manual Paper" });
    assert.deepEqual(notices, [], "no success or failure Notice — nothing was attempted");
});

test("fetchWithFallback runs fillGaps after a successful fetch", async () => {
    installMockNotice();
    const tp = createMockTp();

    const data = await helpers.fetchWithFallback(tp, {
        label: "book data from ISBN",
        fetch: async () => ({ title: "Atomic Habits", general_subject: "" }),
        fillGaps: async (d) => ({ ...d, general_subject: "Habits" }),
        manual: async () => { throw new Error("manual path must not run"); },
    });

    assert.deepEqual(data, { title: "Atomic Habits", general_subject: "Habits" });
});

test("fetchWithFallback does not run fillGaps on the manual path", async () => {
    installMockNotice();
    const tp = createMockTp();

    const data = await helpers.fetchWithFallback(tp, {
        label: "book data from ISBN",
        fetch: async () => { throw new Error("nope"); },
        fillGaps: async () => { throw new Error("fillGaps must not run after a failed fetch"); },
        manual: async () => ({ title: "Manual Book" }),
    });

    assert.deepEqual(data, { title: "Manual Book" });
});

test("fetchWithFallback propagates a cancelled manual path as null", async () => {
    installMockNotice();
    const tp = createMockTp();

    const data = await helpers.fetchWithFallback(tp, {
        label: "tweet metadata",
        fetch: async () => { throw new Error("nope"); },
        manual: async () => null, // user hit Escape on a required prompt
    });

    assert.equal(data, null);
});

test("fetchWithFallback propagates a cancelled fillGaps as null", async () => {
    installMockNotice();
    const tp = createMockTp();

    const data = await helpers.fetchWithFallback(tp, {
        label: "book data from ISBN",
        fetch: async () => ({ title: "Atomic Habits" }),
        fillGaps: async () => null,
        manual: async () => { throw new Error("manual path must not run"); },
    });

    assert.equal(data, null);
});

test("fetchWithFallback does not treat a throw inside fillGaps as a failed fetch", async () => {
    // fillGaps prompts the user. If its throw were caught as a fetch failure,
    // the user would see "could not fetch" and be re-asked everything they
    // had already answered.
    const notices = installMockNotice();
    const tp = createMockTp();

    await assert.rejects(
        helpers.fetchWithFallback(tp, {
            label: "book data from ISBN",
            fetch: async () => ({ title: "Atomic Habits" }),
            fillGaps: async () => { throw new Error("prompt blew up"); },
            manual: async () => { throw new Error("manual path must not run"); },
        }),
        /prompt blew up/,
    );
    assert.ok(!notices.some(m => /could not fetch/i.test(m)), "no spurious failure Notice");
});
