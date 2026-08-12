// SPDX-License-Identifier: AGPL-3.0-only
/*
 * Tests for sourceCaptureSeries.js — the Series -> Season -> Episode hierarchy
 * (the Course -> Unit -> Lecture pattern applied to TV), the cascading keyless
 * TVmaze fetch that fills all three levels, and the two number fields emitted
 * UNQUOTED so Dataview sorts and compares them numerically.
 *
 * Line-break patterns are \r?\n throughout: Git checks this repo out with CRLF
 * on Windows, where an \n-only regex matches NOTHING and passes vacuously.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sourceCaptureSeries = require("../02 - Scripts/sourceCaptureSeries.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockFetch, jsonResponse, failingFetch } = require("./_testUtils.js");

const ALL_TEMPLATES = Object.values(sourceCaptureSeries.stubTemplates());

// Severance as TVmaze actually returns it — note `network: null` with a
// populated `webChannel`, which is the shape most modern streaming shows take.
const SEVERANCE = {
    id: 44933,
    name: "Severance",
    url: "https://www.tvmaze.com/shows/44933/severance",
    genres: ["Drama", "Mystery", "Science-Fiction"],
    premiered: "2022-02-18",
    averageRuntime: 49,
    network: null,
    webChannel: { name: "Apple TV" },
    image: { medium: "https://static.tvmaze.com/medium.jpg", original: "https://static.tvmaze.com/original.jpg" },
};

const SEASONS = [
    { number: 1, premiereDate: "2022-02-18", endDate: "2022-04-08", episodeOrder: 9 },
    { number: 2, premiereDate: "2025-01-17", endDate: "2025-03-21", episodeOrder: 10 },
];

const EPISODE = {
    name: "Who Is Alive?",
    season: 2,
    number: 3,
    airdate: "2025-01-31",
    runtime: 53,
    url: "https://www.tvmaze.com/episodes/2939703/severance-2x03-who-is-alive",
};

// Answers the three TVmaze GETs. Any of the three can be made to throw, which
// is how the module's per-call degradation is exercised.
function installTvmaze({ shows = [SEVERANCE], seasons = SEASONS, episode = EPISODE } = {}) {
    const requests = [];
    installMockFetch(async (url, options) => {
        requests.push({ url, headers: (options && options.headers) || {} });
        if (url.includes("/search/shows")) {
            if (shows === null) throw new Error("search failed (mocked)");
            return jsonResponse(shows.map(show => ({ score: 1, show })));
        }
        if (url.includes("/seasons")) {
            if (seasons === null) throw new Error("seasons failed (mocked)");
            return jsonResponse(seasons);
        }
        if (url.includes("/episodebynumber")) {
            if (episode === null) throw new Error("episode failed (mocked)");
            return jsonResponse(episode);
        }
        throw new Error(`unexpected URL: ${url}`);
    });
    return requests;
}

// A vault that already holds the Severance series and its S02 note, so no stub
// is born — the common case once a series is under way.
const ESTABLISHED = {
    folders: { "04 - MOCS/Series": ["Severance"] },
    files: {
        "04 - MOCS/Series/Severance.md": { frontmatter: {} },
        "04 - MOCS/Seasons/Severance S02.md": { frontmatter: {} },
    },
};

const { installMockApp } = require("./_testUtils.js");

function setup({ suggestions, prompts, vault = { folders: {}, files: {} } }) {
    installMockNotice();
    const appHandles = installMockApp(vault);
    const tp = createMockTp({
        suggestions,
        prompts,
        templates: ALL_TEMPLATES,
        vaultState: appHandles.state,
    });
    return { tp, ...appHandles };
}

// --- the episode note -------------------------------------------------------

test("Series: an established series captures an episode with flat pointers to both levels", async () => {
    installTvmaze();
    const { tp, frontmatterEdits } = setup({
        suggestions: ["Severance"],
        prompts: ["2", "3"],
        vault: ESTABLISHED,
    });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.equal(result.noteTitle, "Severance S02E03 – Who Is Alive");
    // BOTH levels, never a chain. Chaining (`season:` alone) was rejected in
    // ADR 0011 as "option A" because it breaks one-hop metadata traversal —
    // this mirrors sourceCaptureLecture.js, where a lecture carries `course:`
    // AND `unit:`.
    assert.match(result.yamlFields, /series: "\[\[Severance\]\]"\r?\n/);
    assert.match(result.yamlFields, /season: "\[\[Severance S02\]\]"\r?\n/);
    assert.match(result.yamlFields, /released: "2025-01-31"\r?\n/);
    assert.match(result.yamlFields, /url: "https:\/\/www\.tvmaze\.com\/episodes\/2939703\/severance-2x03-who-is-alive"\r?\n/);
    assert.match(result.yamlFields, /watched: "YYYY-MM-DD"\r?\n/);
    assert.equal(tp._calls.createNew.length, 0, "nothing to birth when both notes exist");
    assert.deepEqual(frontmatterEdits, [], "an existing Series/Season note is never rewritten");
});

test("Series: episode and runtime are emitted UNQUOTED, so Dataview sorts them numerically", async () => {
    // The Season MOC lists its episodes with `SORT episode ASC`. Quoted, that
    // sorts lexically and puts episode 10 before episode 9 — and `WHERE runtime
    // < 60` is wrong the same way. helpers.yamlField always quotes, so these
    // two fields are built by hand behind a digits-only guard.
    installTvmaze();
    const { tp } = setup({ suggestions: ["Severance"], prompts: ["2", "3"], vault: ESTABLISHED });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.match(result.yamlFields, /^episode: 3$/m);
    assert.match(result.yamlFields, /^runtime: 53$/m);
    assert.doesNotMatch(result.yamlFields, /episode: "/);
    assert.doesNotMatch(result.yamlFields, /runtime: "/);
});

test("Series: the note name keeps the episode's own title, minus filename-illegal characters", async () => {
    // The title stays in the name because that is how a reader recognises an
    // episode in a file list — the fallback, if spoilers become annoying, is a
    // code-only name with the title in `aliases`.
    //
    // The fetched title is "Who Is Alive?" and the "?" is gone: it is illegal
    // in a Windows filename and stripped by the vault's single title cleaner,
    // helpers.sanitizeTitle. This is the shared rule, not a Series quirk.
    installTvmaze();
    const { tp } = setup({ suggestions: ["Severance"], prompts: ["2", "3"], vault: ESTABLISHED });

    const result = await sourceCaptureSeries(tp, helpers);

    // The "» " prefix is the orchestrator's; noteTitle is the rest.
    assert.equal(result.noteTitle, "Severance S02E03 – Who Is Alive");
    assert.equal(result.noteTitle, helpers.sanitizeTitle("Severance S02E03 – Who Is Alive?"));
});

test("Series: an episode with no known title falls back to the bare code", async () => {
    installTvmaze({ episode: { season: 2, number: 7, airdate: "2025-02-28", runtime: 40, url: "" } });
    const { tp } = setup({
        suggestions: ["Severance"],
        // Season, Episode, then the two gap prompts for the missing title.
        prompts: ["2", "7", "", ""],
        vault: ESTABLISHED,
    });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.equal(result.noteTitle, "Severance S02E07");
});

test("Series: single-digit seasons and episodes are zero-padded in names", async () => {
    installTvmaze({
        seasons: [{ number: 1, premiereDate: "2022-02-18", episodeOrder: 9 }],
        episode: { name: "Good News About Hell", season: 1, number: 1, airdate: "2022-02-18", runtime: 57, url: "x" },
    });
    const { tp } = setup({ suggestions: ["Severance"], prompts: ["1", "1"], vault: ESTABLISHED });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.equal(result.noteTitle, "Severance S01E01 – Good News About Hell");
    assert.match(result.yamlFields, /season: "\[\[Severance S01\]\]"\r?\n/);
});

// --- the cascade ------------------------------------------------------------

test("Series: a brand-new series births both MOCs from their templates, filled from the fetch", async () => {
    installTvmaze();
    const { tp, created, frontmatterEdits } = setup({
        suggestions: ["➕ Create New"],
        prompts: ["severance", "2", "3"],
    });

    const result = await sourceCaptureSeries(tp, helpers);

    // Stubs are born from the template files, never hand-written strings.
    assert.deepEqual(created, [], "no stub content should be written by hand");
    assert.deepEqual(tp._calls.createNew, [
        { template: "(TEMPLATE) Series MOC", filename: "Severance", folder: "04 - MOCS/Series" },
        { template: "(TEMPLATE) Season MOC", filename: "Severance S02", folder: "04 - MOCS/Seasons" },
    ]);

    // Filled from the same fetch that supplied the episode, rather than left
    // as bare stubs where free metadata was available.
    assert.deepEqual(frontmatterEdits, [
        {
            path: "04 - MOCS/Series/Severance.md",
            frontmatter: {
                publisher: "Apple TV",
                general_subject: "Drama, Mystery, Science-Fiction",
                released: "2022-02-18",
                thumbnail: "https://static.tvmaze.com/original.jpg",
                url: "https://www.tvmaze.com/shows/44933/severance",
            },
        },
        {
            path: "04 - MOCS/Seasons/Severance S02.md",
            frontmatter: {
                series: "[[Severance]]",
                released: "2025-01-17",
                episode_count: 10,
            },
        },
    ]);
    assert.match(result.yamlFields, /series: "\[\[Severance\]\]"\r?\n/);
});

test("Series: episode_count is stored as a NUMBER, from the season's episodeOrder", async () => {
    // TVmaze returns episodeOrder on the /seasons call, so it is free at
    // capture time — and a Dataview count could only ever see the episodes
    // already captured, which is the opposite of the question it answers.
    installTvmaze();
    const { tp, frontmatterEdits } = setup({
        suggestions: ["➕ Create New"],
        prompts: ["severance", "2", "3"],
    });

    await sourceCaptureSeries(tp, helpers);

    const season = frontmatterEdits.find(e => e.path.includes("Seasons"));
    assert.equal(season.frontmatter.episode_count, 10);
    assert.equal(typeof season.frontmatter.episode_count, "number");
});

test("Series: a new series takes TVmaze's canonical name, not what was typed", async () => {
    installTvmaze();
    const { tp } = setup({
        suggestions: ["➕ Create New"],
        prompts: ["severance", "2", "3"],
    });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.match(result.yamlFields, /series: "\[\[Severance\]\]"\r?\n/);
    assert.doesNotMatch(result.yamlFields, /\[\[severance\]\]/);
});

test("Series: an EXISTING series keeps its note name, or the wikilink would dangle", async () => {
    // The vault's note is "Severance"; a fetch that renamed it to anything else
    // would emit a link pointing at nothing.
    installTvmaze({ shows: [{ ...SEVERANCE, name: "Severance (2022)" }] });
    const { tp } = setup({ suggestions: ["Severance"], prompts: ["2", "3"], vault: ESTABLISHED });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.match(result.yamlFields, /series: "\[\[Severance\]\]"\r?\n/);
    assert.match(result.yamlFields, /season: "\[\[Severance S02\]\]"\r?\n/);
});

test("Series: season notes are series-qualified, which is what sidesteps the flat-folder collision", async () => {
    // 04 - MOCS/Seasons is flat and createStub returns early when the path
    // exists, so a bare "S02" would silently reuse another series' season note
    // with the wrong `series:` field. Every series has an S02. (The same latent
    // bug in Lecture's Units is real, pre-existing, and tracked as #58 — this
    // sidesteps it here rather than fixing it there.)
    installTvmaze({ shows: [{ ...SEVERANCE, name: "Andor", id: 41567 }] });
    const { tp } = setup({ suggestions: ["➕ Create New"], prompts: ["andor", "2", "3"] });

    await sourceCaptureSeries(tp, helpers);

    assert.deepEqual(
        tp._calls.createNew.map(c => c.filename),
        ["Andor", "Andor S02"],
        "a bare 'S02' would collide with every other series' second season",
    );
});

// --- TVmaze's two channel fields --------------------------------------------

test("Series: publisher reads webChannel when network is null", async () => {
    // Severance really does return network: null with webChannel {name: "Apple
    // TV"}. Reading only `network` empties `publisher` for most modern shows.
    installTvmaze();
    const { tp, frontmatterEdits } = setup({
        suggestions: ["➕ Create New"],
        prompts: ["severance", "2", "3"],
    });

    await sourceCaptureSeries(tp, helpers);

    const series = frontmatterEdits.find(e => e.path.includes("04 - MOCS/Series"));
    assert.equal(series.frontmatter.publisher, "Apple TV");
});

test("Series: publisher reads network for a broadcast show", async () => {
    installTvmaze({
        shows: [{ ...SEVERANCE, network: { name: "AMC" }, webChannel: null }],
    });
    const { tp, frontmatterEdits } = setup({
        suggestions: ["➕ Create New"],
        prompts: ["severance", "2", "3"],
    });

    await sourceCaptureSeries(tp, helpers);

    const series = frontmatterEdits.find(e => e.path.includes("04 - MOCS/Series"));
    assert.equal(series.frontmatter.publisher, "AMC");
});

// --- disambiguation and degradation -----------------------------------------

test("Series: several matching shows raise a picker labelled name, year and channel", async () => {
    const other = { ...SEVERANCE, id: 1, name: "Severance Pay", premiered: "2019-05-01",
                    network: { name: "BBC" }, webChannel: null };
    installTvmaze({ shows: [SEVERANCE, other] });
    const { tp } = setup({ suggestions: ["Severance"], prompts: ["2", "3"], vault: ESTABLISHED });
    let offered = null;
    tp.system.suggester = async (display, values) => {
        if (Array.isArray(display) && display.some(d => /\(20\d\d\)/.test(d))) {
            offered = display;
            return values[0];
        }
        return "Severance";
    };

    const result = await sourceCaptureSeries(tp, helpers);

    assert.deepEqual(offered, ["Severance (2022) — Apple TV", "Severance Pay (2019) — BBC"]);
    assert.match(result.yamlFields, /released: "2025-01-31"\r?\n/);
});

test("Series: an empty search result is a miss, not a success", async () => {
    // TVmaze answers a miss with HTTP 200 and [], so httpGetJson returns
    // happily — only an explicit throw reaches the manual path.
    installTvmaze({ shows: [] });
    const { tp } = setup({
        suggestions: ["Severance"],
        // Season, Episode, then the manual branch: network, title, airdate,
        // runtime, url.
        prompts: ["2", "3", "Apple TV", "Who Is Alive?", "2025-01-31", "53", "https://example.com/ep"],
        vault: ESTABLISHED,
    });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.equal(result.noteTitle, "Severance S02E03 – Who Is Alive");
    assert.match(result.yamlFields, /^runtime: 53$/m);
    assert.match(result.yamlFields, /url: "https:\/\/example\.com\/ep"\r?\n/);
});

test("Series: a network failure falls back to manual entry", async () => {
    installMockNotice();
    failingFetch();
    const { tp } = setup({
        suggestions: ["Severance"],
        prompts: ["2", "3", "Apple TV", "Who Is Alive?", "2025-01-31", "53", ""],
        vault: ESTABLISHED,
    });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.equal(result.noteTitle, "Severance S02E03 – Who Is Alive");
});

test("Series: a failing seasons call still captures the episode, with a thinner Season MOC", async () => {
    installTvmaze({ seasons: null });
    const { tp, frontmatterEdits } = setup({
        suggestions: ["➕ Create New"],
        prompts: ["severance", "2", "3"],
    });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.match(result.yamlFields, /released: "2025-01-31"\r?\n/, "the episode is unaffected");
    const season = frontmatterEdits.find(e => e.path.includes("Seasons"));
    assert.deepEqual(season.frontmatter, { series: "[[Severance]]" },
        "empty fills are dropped rather than written as blanks");
});

test("Series: a failing episode call prompts for just the episode's own fields", async () => {
    installTvmaze({ episode: null });
    const { tp } = setup({
        suggestions: ["Severance"],
        prompts: ["2", "3", "Who Is Alive?", "2025-01-31", "53"],
        vault: ESTABLISHED,
    });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.equal(result.noteTitle, "Severance S02E03 – Who Is Alive");
    assert.match(result.yamlFields, /^runtime: 53$/m);
});

test("Series: sends a descriptive User-Agent, as TVmaze asks", async () => {
    const requests = installTvmaze();
    const { tp } = setup({ suggestions: ["Severance"], prompts: ["2", "3"], vault: ESTABLISHED });

    await sourceCaptureSeries(tp, helpers);

    assert.ok(requests.length >= 3, "search, seasons, episode");
    for (const req of requests) {
        assert.match(req.headers["User-Agent"] || "", /ShadowVault/, `${req.url} had no identifying UA`);
    }
});

// --- cancellation and input hygiene -----------------------------------------

test("Series: cancelling the series picker aborts before any prompt or fetch", async () => {
    const requests = installTvmaze();
    const { tp } = setup({ suggestions: [null], prompts: [] });

    assert.equal(await sourceCaptureSeries(tp, helpers), null);
    assert.deepEqual(requests, []);
});

test("Series: a non-numeric season is re-asked rather than silently dropped", async () => {
    // Season and episode build the filename and both wikilinks, so a typo must
    // not quietly become an empty field.
    installTvmaze();
    const { tp } = setup({
        suggestions: ["Severance"],
        prompts: ["two", "2", "3"],
        vault: ESTABLISHED,
    });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.match(result.yamlFields, /season: "\[\[Severance S02\]\]"\r?\n/);
    assert.equal(tp._calls.prompts.filter(p => /Season Number/.test(p)).length, 2, "re-asked once");
});

// --- what Series deliberately does NOT emit ---------------------------------

test("Series: emits neither media nor mx-uid", async () => {
    installTvmaze();
    const { tp } = setup({ suggestions: ["Severance"], prompts: ["2", "3"], vault: ESTABLISHED });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.doesNotMatch(result.yamlFields, /^media:/m);
    assert.doesNotMatch(result.yamlFields, /^mx-uid:/m);
});

// --- the body ---------------------------------------------------------------

test("Series: the body links both levels and carries an episode recap", async () => {
    installTvmaze();
    const { tp } = setup({ suggestions: ["Severance"], prompts: ["2", "3"], vault: ESTABLISHED });

    const result = await sourceCaptureSeries(tp, helpers);

    assert.match(result.body, /^> \*\*Series:\*\* \[\[Severance\]\]$/m);
    assert.match(result.body, /^> \*\*Season:\*\* \[\[Severance S02\]\]$/m);
    assert.match(result.body, /^> \*\*Episode:\*\* 3$/m);
    assert.match(result.body, /^## Quotes & Moments$/m);
    // Exactly the shared helper's output, for the episode noun — not a copy.
    assert.ok(result.body.includes(helpers.recapBlock("episode")),
        'body must embed helpers.recapBlock("episode") verbatim');
    // No `::` may enter the body (ADR 0005).
    assert.doesNotMatch(result.body, /\w+::/);
});

// --- the guard --------------------------------------------------------------

test("Series: the template files stubs are born from exist in the vault", () => {
    const templatesDir = path.join(__dirname, "..", "00 - Templates");
    for (const name of ALL_TEMPLATES) {
        assert.ok(
            fs.existsSync(path.join(templatesDir, `${name}.md`)),
            `${name}.md not found in 00 - Templates — renaming it breaks series stub creation`,
        );
    }
});
