/*
 * Movie capture: keyless Wikidata auto-fetch with a disambiguation picker and
 * manual fallback. Returns { noteTitle, yamlFields, body }, or null if cancelled.
 *
 * A Movie is a STANDALONE cinematic work — the discriminator is the structure
 * of the work, not the platform and not the runtime. A film watched on Stremio,
 * in a cinema, or released free on YouTube is a Movie; a feature-length video
 * essay is a Video; anything episodic is a Series. See CONTEXT.md,
 * "Movie / Series / Video".
 *
 * Wikidata rather than TMDb because this repo is public and ships as a
 * distributable framework, so no API key can be committed — and TMDb has no
 * keyless read path at all (not v3, not v4, not guest sessions). The full
 * primary-source survey behind that choice, with every alternative probed live,
 * is research/movie-metadata-apis.md.
 *
 * No `media` / `mx-uid`. Media Extended cannot play what these notes point at,
 * so a minted uid would be an orphan — the live bug in issue #48.
 * sourceCaptureVideo.js, the closest sibling, has no MX integration either.
 */

// Wikidata's User-Agent policy asks callers to identify themselves and warns
// that non-complying clients "may be blocked completely". The query was
// replayed with an Obsidian-shaped UA and answered 200, so the Open Library
// /obsidian/i -> 429 trap (sourceCaptureBook.js:7-10) does NOT apply here —
// this UA is good citizenship and policy compliance, not a workaround.
const WIKIDATA_UA = "ShadowVault/2.14 (+https://github.com/tenebrishv/shadowvault-setup)";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const WIKIPEDIA_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/";

// One GET returns six of the seven wanted fields. Three verified traps shaped
// every line of it, and all three look like an outage rather than a bug:
//
//   1. A FILTER(LCASE(STR(?l)) = "dune") over rdfs:label does not return at
//      all — it is an unindexed scan of every label in Wikidata and blows the
//      60 s deadline (curl reports HTTP 000). Exact "Dune"@en matching is fast
//      but CASE-SENSITIVE ("dune" -> 0 rows), which is unusable for a string a
//      human types. So the fuzzy search runs inside the query, through
//      Wikidata's federated MediaWiki-API service, and it is still one round trip.
//   2. Without GROUP BY, multi-valued properties form a cartesian product:
//      un-grouped, "true grit" returned 15 rows for the one Coen film and
//      "inception" 20 rows for one film.
//   3. MIN(?y) collapses country-specific release dates, which is what turns a
//      stray "True Grit 2011" row into the correct 2010.
//
// Encoded length is ~895 characters, comfortably inside any GET limit, so
// helpers.httpGetJson (which is GET-only) can issue it unchanged.
const FILM_QUERY = `SELECT ?f ?fLabel (MIN(?y) AS ?year)
       (GROUP_CONCAT(DISTINCT ?dirL; separator=", ") AS ?directors)
       (SAMPLE(?dur) AS ?runtime)
       (GROUP_CONCAT(DISTINCT ?stuL; separator=", ") AS ?studios)
       (SAMPLE(?imdb) AS ?imdbId) (SAMPLE(?article) AS ?wiki)
WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch"; wikibase:endpoint "www.wikidata.org";
                    mwapi:search "%SEARCH%"; mwapi:language "en"; mwapi:limit "50" .
    ?f wikibase:apiOutputItem mwapi:item
  }
  ?f wdt:P31 wd:Q11424 .
  OPTIONAL { ?f wdt:P577 ?dt }
  OPTIONAL { ?f wdt:P57/rdfs:label  ?dirL FILTER(LANG(?dirL)="en") }
  OPTIONAL { ?f wdt:P2047 ?dur }
  OPTIONAL { ?f wdt:P272/rdfs:label ?stuL FILTER(LANG(?stuL)="en") }
  OPTIONAL { ?f wdt:P345 ?imdb }
  OPTIONAL { ?article schema:about ?f ; schema:isPartOf <https://en.wikipedia.org/> }
  BIND(YEAR(?dt) AS ?y)
  ?f rdfs:label ?fLabel FILTER(LANG(?fLabel)="en")
}
GROUP BY ?f ?fLabel ORDER BY ?year LIMIT 25`;

// A SPARQL string literal ends at the first unescaped double quote, so a title
// containing one would close it early and turn the rest of the query into
// syntax errors. Backslash first, or it would double-escape what we add.
function sparqlLiteral(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const binding = (row, name) => (row[name] && row[name].value) || "";

// P2047 (duration) comes back as a decimal string, and the manual prompt is
// free text. Both funnel through here: anything that isn't a whole number of
// minutes becomes "", which the caller renders as an empty `runtime:` rather
// than as invalid YAML.
const minutesOnly = (value) => (String(value ?? "").match(/^\s*(\d+)/) || ["", ""])[1];

// Wikidata hands back the entity IRI on http://; the vault stores https.
const entityUrl = (iri) => String(iri || "").replace(/^http:/, "https:");

module.exports = async function sourceCaptureMovie(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField, sanitizeTitle,
            fetchWithFallback, recapBlock } = helpers;

    const title = await requiredPrompt(tp, "Movie Title");
    if (!title) return null;
    // An optional pre-filter applied to the rows AFTER they come back, not a
    // query constraint: the reader is usually looking a film up precisely
    // because they do not know its year.
    const year = await optionalPrompt(tp, "Year (if you know it)");

    // Runtime is prompted through a digits-only guard, never plain
    // optionalPrompt — see the emission comment at the bottom of this module.
    const runtimePrompt = async (label) => {
        const val = await optionalPrompt(tp, label + "  (whole minutes, digits only)");
        if (!val) return "";
        const mins = minutesOnly(val);
        if (!mins) new Notice("Runtime must be a whole number of minutes — left blank.", 3000);
        return mins;
    };

    const data = await fetchWithFallback(tp, {
        label: "film data from Wikidata",
        fetch: async () => {
            const url = `${SPARQL_ENDPOINT}?format=json&query=`
                + encodeURIComponent(FILM_QUERY.replace("%SEARCH%", sparqlLiteral(title)));
            const payload = await helpers.httpGetJson(url, { headers: { "User-Agent": WIKIDATA_UA } });
            const rows = (payload && payload.results && payload.results.bindings) || [];
            // A miss is HTTP 200 with an empty bindings array, not a 4xx, so
            // httpGetJson returns happily and only this throw reaches
            // fetchWithFallback's manual path — the same empty-success trap
            // sourceCaptureBook.js guards against.
            if (!rows.length) throw new Error("No films found for that title");
            return rows.map(row => ({
                title: binding(row, "fLabel"),
                director: binding(row, "directors"),
                released: binding(row, "year"),
                runtime: minutesOnly(binding(row, "runtime")),
                publisher: binding(row, "studios"),
                url: entityUrl(binding(row, "f")),
                article: binding(row, "wiki"),
            }));
        },
        // Runs OUTSIDE fetchWithFallback's try, so a cancelled picker or a
        // failing poster lookup can never be mistaken for a failed fetch.
        fillGaps: async (rows) => {
            // Same-titled films are the normal case, not the exception —
            // verified: "the thing" -> 7 films, "parasite" -> 4, "true grit" ->
            // both 1969 and 2010. The picker is auto-skipped on a single row
            // ("seven samurai" -> 1).
            const narrowed = year ? rows.filter(r => r.released === year) : rows;
            const choices = narrowed.length ? narrowed : rows;

            let picked = choices[0];
            if (choices.length > 1) {
                picked = await tp.system.suggester(
                    choices.map(r => `${r.title} (${r.released || "?"})${r.director ? " — " + r.director : ""}`),
                    choices,
                    false,
                    "Which film?",
                );
                if (!picked) { new Notice("Cancelled."); return null; }
            }

            const d = { ...picked };
            // The poster: Wikidata itself effectively has none (P3383 covers
            // 1.2% of 347,749 films — film posters are non-free, so Commons
            // mostly cannot host them), but an English Wikipedia film article's
            // LEAD IMAGE is the poster, and the query above already returned
            // the exact article URL, so this is a deterministic lookup with no
            // search step. Optional by construction: a film with no article
            // (verified: the 1989 Uzbekfilm "Dune") simply gets no thumbnail.
            d.thumbnail = "";
            if (d.article) {
                try {
                    const summary = await helpers.httpGetJson(
                        WIKIPEDIA_SUMMARY + d.article.split("/").pop(),
                        { headers: { "User-Agent": WIKIDATA_UA } },
                    );
                    d.thumbnail = (summary && summary.thumbnail && summary.thumbnail.source) || "";
                } catch (e) {
                    // A missing poster is not a failed capture.
                }
            }

            // Prompt only for what came back empty. Studio is present for 14.6%
            // of films and runtime for 45.8%, so these two fall through often;
            // genre is not in the query at all, so it is always asked.
            d.released = d.released || await datePrompt(tp, "Year Released (if missing)");
            d.runtime = d.runtime || await runtimePrompt("Runtime (if missing)");
            d.publisher = d.publisher || await optionalPrompt(tp, "Studio (if missing)");
            d.general_subject = await optionalPrompt(tp, "Genre");
            return d;
        },
        manual: async () => ({
            // The title prompt above is required and already answered, so the
            // manual path reuses it rather than asking the same question twice.
            title,
            director: await optionalPrompt(tp, "Director"),
            released: await datePrompt(tp, "Year Released"),
            runtime: await runtimePrompt("Runtime"),
            publisher: await optionalPrompt(tp, "Studio"),
            general_subject: await optionalPrompt(tp, "Genre"),
            url: await optionalPrompt(tp, "URL  e.g. Wikidata / Wikipedia page"),
            thumbnail: "",
        }),
    });
    if (!data) return null;

    // Always asked, on both paths: where it was watched is about this viewing,
    // not about the film, so no API can supply it.
    data.platform = await optionalPrompt(tp, "Watched on  e.g. Stremio, cinema, Blu-ray");
    data.watched = tp.date.now("YYYY-MM-DD");

    const noteTitle = sanitizeTitle(data.title);

    let yamlFields = "";
    // `director` is a PLAIN STRING, never a wikilink, and deliberately so. A
    // validated picker over 09 - Entities/Agents like pickLecturer pays off
    // when the cast is small, closed and recurring (6 courses, 30 lectures);
    // directors are long-tail — ~90 across 100 films — so auto-created Person
    // stubs would become a note graveyard. Converting the field to wikilinks
    // later is a find-and-replace over one folder. Do not add a picker.
    yamlFields += yamlField("director", data.director);
    // THE ONE FIELD BUILT BY HAND. helpers.yamlField always quotes, and a
    // quoted runtime makes Dataview compare LEXICALLY — `WHERE runtime < 100`
    // is then silently wrong, because "90" < "100" is false. So this is emitted
    // unquoted, as a YAML number, and `minutesOnly` above is what guarantees
    // the unquoted value is always valid YAML. Do NOT "fix" this back to
    // yamlField. (The vault's existing `lecture_num: "3"` is a quoted number
    // that has never bitten only because nothing queries it numerically — it is
    // not a precedent to copy.)
    yamlFields += data.runtime ? `runtime: ${data.runtime}\n` : "runtime:\n";
    yamlFields += yamlField("publisher", data.publisher);
    yamlFields += yamlField("general_subject", data.general_subject);
    yamlFields += yamlField("released", data.released);
    yamlFields += yamlField("platform", data.platform);
    yamlFields += yamlField("url", data.url);
    yamlFields += yamlField("thumbnail", data.thumbnail);
    yamlFields += yamlField("watched", data.watched);

    // Plain markdown, never `key::` inline fields: every value here is already
    // in the frontmatter above, and `::` would declare a second copy that
    // Dataview merges into the first. See docs/adr/0005.
    let body = "> [!meta]- Metadata\n";
    if (data.director) body += "> **Director:** " + data.director + "\n";
    if (data.released) body += "> **Released:** " + data.released + "\n";
    if (data.runtime) body += "> **Runtime:** " + data.runtime + " min\n";
    if (data.publisher) body += "> **Studio:** " + data.publisher + "\n";
    body += "> **Watched:** " + data.watched + (data.platform ? " (" + data.platform + ")" : "") + "\n";
    body += "\n";

    // Timestamps are typed by hand — there is no Media Extended player to seek
    // from, because MX cannot play what this note points at. Scaffold richness
    // is free here: ADR 0001's verbosity trade-off explicitly exempts a
    // script-filled body, which costs the reader no typing.
    body += "## Quotes & Moments\n\n";
    body += "| Time | Quote / What happens |\n";
    body += "|------|----------------------|\n";
    body += "|      |                      |\n\n";

    // The holistic response to the film, written once it is over. Atomic claims
    // go to their own literature notes instead (ADR 0010).
    body += recapBlock("film");

    return { noteTitle, yamlFields, body };
};
