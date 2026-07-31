/*
 * Tests for sourceCaptureMovie.js — the keyless Wikidata fetch, the
 * disambiguation picker, the optional Wikimedia poster lookup, and the one
 * frontmatter field in this vault that is deliberately emitted UNQUOTED.
 *
 * Line-break patterns are \r?\n throughout. Git checks this repo out with CRLF
 * on Windows, and an \n-only regex silently matches NOTHING — the assertion
 * passes vacuously rather than failing, which is the worst of both worlds.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCaptureMovie = require("../02 - Scripts/sourceCaptureMovie.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockFetch, jsonResponse, failingFetch } = require("./_testUtils.js");

// One SPARQL result row, in the shape query.wikidata.org actually returns:
// every column a { type, value } object, and OPTIONAL columns simply absent.
function sparqlRow({ qid, title, year, directors, runtime, studios, article }) {
    const row = {
        f: { value: `http://www.wikidata.org/entity/${qid}` },
        fLabel: { value: title },
    };
    if (year !== undefined) row.year = { value: String(year) };
    if (directors !== undefined) row.directors = { value: directors };
    if (runtime !== undefined) row.runtime = { value: String(runtime) };
    if (studios !== undefined) row.studios = { value: studios };
    if (article !== undefined) row.wiki = { value: article };
    return row;
}

const DUNE_2021 = sparqlRow({
    qid: "Q55712478", title: "Dune", year: 2021, directors: "Denis Villeneuve",
    runtime: 155, studios: "Legendary Pictures",
    article: "https://en.wikipedia.org/wiki/Dune_(2021_film)",
});
const DUNE_1984 = sparqlRow({
    qid: "Q114819", title: "Dune", year: 1984, directors: "David Lynch",
    runtime: 137, studios: "Dino De Laurentiis Company",
    article: "https://en.wikipedia.org/wiki/Dune_(1984_film)",
});

// Answers the SPARQL GET with `rows`, and the Wikimedia summary GET with
// `poster` (or a throw when poster is null). Records every request.
function installWikidata({ rows = [], poster = "https://upload.wikimedia.org/poster.jpg" } = {}) {
    const requests = [];
    installMockFetch(async (url, options) => {
        requests.push({ url, headers: (options && options.headers) || {} });
        if (url.startsWith("https://query.wikidata.org/sparql")) {
            return jsonResponse({ results: { bindings: rows } });
        }
        if (url.startsWith("https://en.wikipedia.org/api/rest_v1/page/summary/")) {
            if (poster === null) throw new Error("no article (mocked)");
            return jsonResponse({ thumbnail: { source: poster } });
        }
        throw new Error(`unexpected URL: ${url}`);
    });
    return requests;
}

// --- the query itself -------------------------------------------------------

test("Movie: the SPARQL query carries the three fixes the research proved necessary", async () => {
    installMockNotice();
    const requests = installWikidata({ rows: [DUNE_2021] });
    const tp = createMockTp({ prompts: ["dune", "", "Science fiction", "Stremio"] });

    await sourceCaptureMovie(tp, helpers);

    const query = decodeURIComponent(requests[0].url.split("query=")[1]);

    // 1. Fuzzy search runs INSIDE the query via the federated MediaWiki API, so
    //    it stays one round trip — and it is what makes a lowercase title work
    //    at all (exact `"Dune"@en` matching is case-sensitive: "dune" -> 0 rows).
    assert.match(query, /SERVICE wikibase:mwapi/);
    assert.match(query, /wikibase:api "EntitySearch"/);
    assert.match(query, /mwapi:search "dune"/);
    // 2. GROUP BY, or multi-valued properties cartesian-multiply — un-grouped,
    //    "true grit" returned 15 rows for one film.
    assert.match(query, /GROUP BY \?f \?fLabel/);
    assert.match(query, /MIN\(\?y\) AS \?year/);
    // 3. A FILTER(LCASE(…)) over rdfs:label is an unindexed scan of every label
    //    in Wikidata and blows the 60 s deadline. It must never come back.
    assert.doesNotMatch(query, /LCASE/);
    // Films only.
    assert.match(query, /wdt:P31 wd:Q11424/);
});

test("Movie: sends a descriptive User-Agent, per Wikidata's stated policy", async () => {
    installMockNotice();
    const requests = installWikidata({ rows: [DUNE_2021] });
    const tp = createMockTp({ prompts: ["dune", "", "Science fiction", "Stremio"] });

    await sourceCaptureMovie(tp, helpers);

    for (const req of requests) {
        assert.match(req.headers["User-Agent"] || "", /ShadowVault/,
            `${req.url} went out without an identifying UA`);
    }
});

test("Movie: a title containing a quote cannot break out of the SPARQL literal", async () => {
    installMockNotice();
    const requests = installWikidata({ rows: [DUNE_2021] });
    const tp = createMockTp({ prompts: ['The "Burbs', "", "Comedy", "Blu-ray"] });

    await sourceCaptureMovie(tp, helpers);

    const query = decodeURIComponent(requests[0].url.split("query=")[1]);
    assert.match(query, /mwapi:search "The \\"Burbs"/);
});

// --- the happy path ---------------------------------------------------------

test("Movie: a single result skips the picker and emits every fetched field", async () => {
    installMockNotice();
    installWikidata({ rows: [DUNE_2021] });
    // Title, Year(skip), Genre (never in the query), Watched-on.
    const tp = createMockTp({ prompts: ["dune", "", "Science fiction", "Stremio"] });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.equal(result.noteTitle, "Dune");
    assert.deepEqual(tp._calls.suggestions, [], "one row needs no picker");
    assert.match(result.yamlFields, /director: "Denis Villeneuve"\r?\n/);
    assert.match(result.yamlFields, /publisher: "Legendary Pictures"\r?\n/);
    assert.match(result.yamlFields, /general_subject: "Science fiction"\r?\n/);
    assert.match(result.yamlFields, /released: "2021"\r?\n/);
    assert.match(result.yamlFields, /platform: "Stremio"\r?\n/);
    assert.match(result.yamlFields, /url: "https:\/\/www\.wikidata\.org\/entity\/Q55712478"\r?\n/);
    assert.match(result.yamlFields, /thumbnail: "https:\/\/upload\.wikimedia\.org\/poster\.jpg"\r?\n/);
    assert.match(result.yamlFields, /watched: "YYYY-MM-DD"\r?\n/);
});

test("Movie: runtime is emitted UNQUOTED, so Dataview compares it numerically", async () => {
    // The whole reason this one field bypasses helpers.yamlField. A quoted
    // runtime makes `WHERE runtime < 100` compare lexically and silently return
    // nonsense, because "90" < "100" is false.
    installMockNotice();
    installWikidata({ rows: [DUNE_2021] });
    const tp = createMockTp({ prompts: ["dune", "", "Science fiction", "Stremio"] });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.match(result.yamlFields, /^runtime: 155$/m);
    assert.doesNotMatch(result.yamlFields, /runtime: "/);
});

test("Movie: a non-numeric runtime is refused rather than emitted as invalid YAML", async () => {
    // The digits-only guard is what lets the field be unquoted safely.
    installMockNotice();
    failingFetch();
    const tp = createMockTp({
        // Title, Year, then manual: Director, Year Released, Runtime, Studio,
        // Genre, URL, and finally Watched-on.
        prompts: ["Some Film", "", "A Director", "2001", "about two hours",
                  "A Studio", "Drama", "", "cinema"],
    });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.match(result.yamlFields, /^runtime:$/m, "left empty, never emitted raw");
    assert.doesNotMatch(result.yamlFields, /about two hours/);
});

test("Movie: the poster comes from the film's Wikipedia article, addressed directly", async () => {
    // Wikidata's own P3383 covers 1.2% of films — posters are non-free — but a
    // film article's LEAD image is the poster, and the SPARQL row already
    // carries the exact article URL, so there is no search step.
    installMockNotice();
    const requests = installWikidata({ rows: [DUNE_2021] });
    const tp = createMockTp({ prompts: ["dune", "", "Science fiction", "Stremio"] });

    await sourceCaptureMovie(tp, helpers);

    assert.equal(requests.length, 2, "one SPARQL GET plus one poster GET");
    assert.equal(
        requests[1].url,
        "https://en.wikipedia.org/api/rest_v1/page/summary/Dune_(2021_film)",
    );
});

test("Movie: a film with no Wikipedia article is captured without a poster", async () => {
    // Verified real case: the 1989 Uzbekfilm "Dune" has no English article.
    installMockNotice();
    const requests = installWikidata({
        rows: [sparqlRow({ qid: "Q1", title: "Dune", year: 1989, runtime: 81, studios: "Uzbekfilm" })],
    });
    const tp = createMockTp({ prompts: ["dune", "", "", "Drama", "cinema"] });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.equal(requests.length, 1, "the poster GET must be skipped, not attempted");
    assert.match(result.yamlFields, /^thumbnail:$/m);
});

test("Movie: a failing poster lookup costs the capture nothing", async () => {
    installMockNotice();
    installWikidata({ rows: [DUNE_2021], poster: null });
    const tp = createMockTp({ prompts: ["dune", "", "Science fiction", "Stremio"] });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.match(result.yamlFields, /^thumbnail:$/m);
    assert.match(result.yamlFields, /director: "Denis Villeneuve"\r?\n/, "the rest survives");
});

// --- disambiguation ---------------------------------------------------------

test("Movie: several same-titled films raise a picker labelled title, year and director", async () => {
    // Verified: "the thing" -> 7 films, "parasite" -> 4, "true grit" -> both
    // 1969 and 2010. Same-titled films are the normal case, not the exception.
    installMockNotice();
    installWikidata({ rows: [DUNE_1984, DUNE_2021] });
    const tp = createMockTp({ prompts: ["dune", "", "Science fiction", "Stremio"] });
    // Picks the SECOND offering by index, out of the module's own value list —
    // so this asserts the display strings and the display→value alignment, not
    // just that some row came back.
    let offered = null;
    tp.system.suggester = async (display, values) => {
        offered = display;
        return values[1];
    };

    const result = await sourceCaptureMovie(tp, helpers);

    assert.deepEqual(offered, ["Dune (1984) — David Lynch", "Dune (2021) — Denis Villeneuve"]);
    assert.match(result.yamlFields, /director: "Denis Villeneuve"\r?\n/);
    assert.match(result.yamlFields, /released: "2021"\r?\n/);
});

test("Movie: a known year narrows the rows and skips the picker", async () => {
    installMockNotice();
    installWikidata({ rows: [DUNE_1984, DUNE_2021] });
    const tp = createMockTp({ prompts: ["dune", "1984", "Science fiction", "Stremio"] });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.deepEqual(tp._calls.suggestions, [], "one surviving row needs no picker");
    assert.match(result.yamlFields, /director: "David Lynch"\r?\n/);
});

test("Movie: a year matching nothing falls back to the full list rather than to no film", async () => {
    installMockNotice();
    installWikidata({ rows: [DUNE_1984, DUNE_2021] });
    const tp = createMockTp({ prompts: ["dune", "1999", "Science fiction", "Stremio"] });
    let offeredCount = 0;
    tp.system.suggester = async (display, values) => {
        offeredCount = display.length;
        return values[0];
    };

    const result = await sourceCaptureMovie(tp, helpers);

    assert.equal(offeredCount, 2, "a mistyped year must not strand the capture");
    assert.match(result.yamlFields, /director: "David Lynch"\r?\n/);
});

test("Movie: dismissing the picker aborts, rather than dropping into manual entry", async () => {
    // The picker runs inside fillGaps, which fetchWithFallback runs OUTSIDE its
    // try — so a dismissal can never be mistaken for a failed fetch and re-ask
    // every question the reader just answered.
    installMockNotice();
    installWikidata({ rows: [DUNE_1984, DUNE_2021] });
    const tp = createMockTp({ prompts: ["dune", ""], suggestions: [null] });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.equal(result, null);
});

// --- the fallbacks ----------------------------------------------------------

test("Movie: an empty bindings array is a miss, not a success", async () => {
    // Wikidata answers a miss with HTTP 200 and "bindings": [], so httpGetJson
    // returns happily — only an explicit throw reaches the manual path.
    installMockNotice();
    installWikidata({ rows: [] });
    const tp = createMockTp({
        prompts: ["nonexistent film", "", "A Director", "2001", "99",
                  "A Studio", "Drama", "https://example.com/film", "cinema"],
    });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.equal(result.noteTitle, "nonexistent film", "the manual path reuses the title already given");
    assert.match(result.yamlFields, /director: "A Director"\r?\n/);
    assert.match(result.yamlFields, /^runtime: 99$/m);
});

test("Movie: the manual path does not ask for the title a second time", async () => {
    installMockNotice();
    failingFetch();
    const tp = createMockTp({
        prompts: ["Solaris", "", "Andrei Tarkovsky", "1972", "167", "Mosfilm", "Science fiction", "", "cinema"],
    });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.equal(result.noteTitle, "Solaris");
    assert.equal(tp._calls.prompts.filter(p => /Movie Title/.test(p)).length, 1);
});

test("Movie: cancelling the title prompt aborts before anything is fetched", async () => {
    installMockNotice();
    installWikidata({ rows: [DUNE_2021] });
    const tp = createMockTp({ prompts: [null] });

    assert.equal(await sourceCaptureMovie(tp, helpers), null);
});

// --- what Movie deliberately does NOT emit ----------------------------------

test("Movie: director is a plain string, never a wikilink", async () => {
    // A validated picker over 09 - Entities/Agents was costed and declined:
    // directors are long-tail, so auto-created Person stubs become a note
    // graveyard. If a picker ever appears, this is where it announces itself.
    installMockNotice();
    installWikidata({ rows: [DUNE_2021] });
    const tp = createMockTp({ prompts: ["dune", "", "Science fiction", "Stremio"] });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.doesNotMatch(result.yamlFields, /director: "\[\[/);
    assert.doesNotMatch(result.body, /\[\[/, "no note is linked, so none is created");
    assert.deepEqual(tp._calls.createNew, [], "Movie births no stubs");
});

test("Movie: emits neither media nor mx-uid", async () => {
    // Media Extended cannot play what this note points at, so a minted uid
    // would be an orphan — the live bug in #48. sourceCaptureVideo.js, the
    // closest sibling, has no MX integration either.
    installMockNotice();
    installWikidata({ rows: [DUNE_2021] });
    const tp = createMockTp({ prompts: ["dune", "", "Science fiction", "Stremio"] });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.doesNotMatch(result.yamlFields, /^media:/m);
    assert.doesNotMatch(result.yamlFields, /^mx-uid:/m);
});

// --- the body ---------------------------------------------------------------

test("Movie: the body scaffolds a hand-timestamped quotes table and a film recap", async () => {
    installMockNotice();
    installWikidata({ rows: [DUNE_2021] });
    const tp = createMockTp({ prompts: ["dune", "", "Science fiction", "Stremio"] });

    const result = await sourceCaptureMovie(tp, helpers);

    assert.match(result.body, /^> \*\*Director:\*\* Denis Villeneuve$/m);
    assert.match(result.body, /^> \*\*Runtime:\*\* 155 min$/m);
    assert.match(result.body, /^> \*\*Watched:\*\* YYYY-MM-DD \(Stremio\)$/m);
    assert.match(result.body, /^## Quotes & Moments$/m);
    // Exactly the shared helper's output, for the film noun — not a local copy.
    assert.ok(result.body.includes(helpers.recapBlock("film")),
        'body must embed helpers.recapBlock("film") verbatim');
    assert.ok(result.body.indexOf("## Source Recap") > result.body.indexOf("## Quotes & Moments"),
        "the recap is written after the film, so it sits below the capture table");
    // No `::` may enter the body (ADR 0005) — every value here is already in
    // frontmatter, and Dataview would merge an inline copy into it.
    assert.doesNotMatch(result.body, /\w+::/);
});
