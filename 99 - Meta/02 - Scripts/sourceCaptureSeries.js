// SPDX-License-Identifier: AGPL-3.0-only
/*
 * Series (TV) capture: a Series -> Season -> Episode hierarchy that mirrors the
 * existing Course -> Unit -> Lecture flow, with a keyless TVmaze fetch that
 * cascades to all three levels. Returns { noteTitle, yamlFields, body }, or
 * null if cancelled.
 *
 * A Series is anything with EPISODES — a docuseries is a Series. The
 * discriminator is the structure of the work, not the platform and not the
 * runtime. See CONTEXT.md, "Movie / Series / Video".
 *
 * Stubs are born from the real template files via Templater, so the templates
 * stay the single source of note shape; this module only knows template names
 * plus the frontmatter the picker and the fetch have already learned.
 *
 * No `media` / `mx-uid`, for the same reason sourceCaptureMovie.js has none:
 * MX cannot play what these notes point at, so a minted uid would be an orphan
 * (issue #48).
 */

const SERIES_FOLDER = "04 - MOCS/Series";
const SEASON_FOLDER = "04 - MOCS/Seasons";

const TEMPLATES = {
    series: "(TEMPLATE) Series MOC",
    season: "(TEMPLATE) Season MOC",
};

// TVmaze is keyless and CC BY-SA — attribution is satisfied by storing the
// canonical TVmaze URL in `url` — rate limited to 20 calls / 10 s, and asks for
// a descriptive User-Agent, the same pattern as sourceCaptureBook.js:10. Three
// GETs at most, and only on first capture of a new series.
const TVMAZE_UA = "ShadowVault/2.14 (+https://github.com/tenebrishv/shadowvault-setup)";
const TVMAZE = "https://api.tvmaze.com";

async function getNotesInFolder(folderPath) {
    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (!folder || !folder.children) return [];
    return folder.children.filter(file => file.extension === "md");
}

// Births a stub from its template file. `fills` are frontmatter values the
// picker and the fetch already know. Returns true if a note was actually
// created, false if it already existed. Mirrors sourceCaptureLecture.js:43-56.
async function createStub(tp, templateName, folder, name, fills) {
    const path = `${folder}/${name}.md`;
    if (app.vault.getAbstractFileByPath(path)) return false;

    const template = tp.file.find_tfile(templateName);
    if (!template) throw new Error(`Missing template: ${templateName}`);
    const file = (await tp.file.create_new(template, name, false, folder))
        ?? app.vault.getAbstractFileByPath(path);

    if (fills && file) {
        const present = Object.fromEntries(
            Object.entries(fills).filter(([, v]) => v !== "" && v !== null && v !== undefined),
        );
        if (Object.keys(present).length) {
            await app.fileManager.processFrontMatter(file, fm => Object.assign(fm, present));
        }
    }
    return true;
}

async function pickOrCreate(tp, helpers, label, existingItems) {
    const choices = [...existingItems.sort(), "➕ Create New"];
    const picked = await tp.system.suggester(choices, choices, false, label);
    if (!picked) return null;
    if (picked !== "➕ Create New") return { name: picked, created: false };
    const fresh = await helpers.requiredPrompt(tp, `New ${label}`);
    return fresh ? { name: fresh, created: true } : null;
}

// Season notes are SERIES-QUALIFIED — "Severance S02", never "S02". This is not
// cosmetic: createStub returns early when the path already exists, and the
// Seasons folder is flat, so a bare "S02" would silently reuse another series'
// season note with the wrong `series:` field. That collision is real and
// pre-existing for Lecture's Units (sourceCaptureLecture.js:102 + :45, tracked
// as #58); course units have distinctive names so nobody has hit it, but every
// series has an S02. Qualifying the name sidesteps it here rather than fixing
// it there.
const pad2 = (n) => String(n).padStart(2, "0");
const seasonNoteName = (series, season) => `${series} S${pad2(season)}`;

// Digits-only, and empty when it isn't. `season` and `episode` are numbers the
// Season MOC sorts on, so a stray non-numeric answer must not reach the YAML.
const digits = (value) => (String(value ?? "").match(/^\s*(\d+)/) || ["", ""])[1];

// Streaming services populate `webChannel` and broadcasters populate `network`;
// Severance returns network: null with webChannel: {name: "Apple TV"}. Read
// BOTH, preferring whichever is non-null, or most modern shows get an empty
// `publisher`.
const channelName = (show) =>
    (show && ((show.network && show.network.name) || (show.webChannel && show.webChannel.name))) || "";

const imageUrl = (image) => (image && (image.original || image.medium)) || "";

module.exports = async function sourceCaptureSeries(tp, helpers) {
    const { requiredPrompt, optionalPrompt, yamlField, sanitizeTitle,
            fetchWithFallback, recapBlock } = helpers;

    const seriesFiles = await getNotesInFolder(SERIES_FOLDER);
    const pickedSeries = await pickOrCreate(tp, helpers, "Series", seriesFiles.map(f => f.basename));
    if (!pickedSeries) return null;
    // A picked name is an existing basename and already safe; a typed one is
    // about to become a filename, so it goes through the vault's single title
    // cleaner first.
    if (pickedSeries.created) {
        pickedSeries.name = sanitizeTitle(pickedSeries.name);
        if (!pickedSeries.name) { new Notice("That series name has no usable characters."); return null; }
    }

    // Re-asks rather than aborting on a non-numeric answer: these two are the
    // note's identity (they build its filename and both wikilinks), so a typo
    // must not quietly become an empty field.
    const numberPrompt = async (label) => {
        for (;;) {
            const raw = await requiredPrompt(tp, label);
            if (!raw) return null;
            const n = digits(raw);
            if (n) return Number(n);
            new Notice("Enter a whole number.", 2000);
        }
    };

    const seasonNum = await numberPrompt("Season Number");
    if (seasonNum === null) return null;
    const episodeNum = await numberPrompt("Episode Number");
    if (episodeNum === null) return null;

    const data = await fetchWithFallback(tp, {
        label: "series data from TVmaze",
        fetch: async () => {
            const shows = await helpers.httpGetJson(
                `${TVMAZE}/search/shows?q=${encodeURIComponent(pickedSeries.name)}`,
                { headers: { "User-Agent": TVMAZE_UA } },
            );
            // A miss is HTTP 200 with an empty array, not a 4xx — the same
            // empty-success trap Wikidata has, and the same guard.
            if (!Array.isArray(shows) || !shows.length) throw new Error("No shows found for that name");
            return shows.map(hit => hit.show).filter(Boolean);
        },
        // Everything below runs OUTSIDE fetchWithFallback's try: a cancelled
        // picker must not be mistaken for a failed fetch and re-ask the manual
        // questions.
        fillGaps: async (shows) => {
            let show = shows[0];
            if (shows.length > 1) {
                show = await tp.system.suggester(
                    shows.map(s => `${s.name}${s.premiered ? " (" + s.premiered.slice(0, 4) + ")" : ""}`
                        + (channelName(s) ? " — " + channelName(s) : "")),
                    shows,
                    false,
                    "Which series?",
                );
                if (!show) { new Notice("Cancelled."); return null; }
            }

            const d = {
                // A brand-new series takes TVmaze's canonical name; an existing
                // one keeps the note name it already has, or the wikilink the
                // episode emits would point at nothing.
                seriesName: (pickedSeries.created && sanitizeTitle(show.name)) || pickedSeries.name,
                seriesGenres: Array.isArray(show.genres) ? show.genres.join(", ") : "",
                seriesPublisher: channelName(show),
                seriesReleased: show.premiered || "",
                seriesThumbnail: imageUrl(show.image),
                seriesUrl: show.url || "",
                seasonReleased: "",
                episodeCount: "",
                title: "",
                released: "",
                runtime: "",
                url: "",
            };

            // Seasons: free metadata for the Season MOC, and the only place
            // episodeOrder is available — a Dataview count can only ever see
            // the episodes already captured.
            try {
                const seasons = await helpers.httpGetJson(
                    `${TVMAZE}/shows/${show.id}/seasons`,
                    { headers: { "User-Agent": TVMAZE_UA } },
                );
                const match = (seasons || []).find(s => Number(s.number) === seasonNum);
                if (match) {
                    d.seasonReleased = match.premiereDate || "";
                    d.episodeCount = digits(match.episodeOrder);
                }
            } catch (e) {
                // A thin Season MOC is not a failed capture.
            }

            // The episode itself. Unlike the two above this one carries the
            // fields the Source note is actually about, so a failure here is
            // worth falling through to prompts for.
            try {
                const ep = await helpers.httpGetJson(
                    `${TVMAZE}/shows/${show.id}/episodebynumber`
                    + `?season=${seasonNum}&number=${episodeNum}`,
                    { headers: { "User-Agent": TVMAZE_UA } },
                );
                if (ep) {
                    d.title = ep.name || "";
                    d.released = ep.airdate || "";
                    d.runtime = digits(ep.runtime);
                    d.url = ep.url || "";
                }
            } catch (e) {
                new Notice("Could not fetch that episode. Enter its details manually.", 3000);
            }

            d.title = d.title || await optionalPrompt(tp, "Episode Title (if missing)");
            d.released = d.released || await optionalPrompt(tp, "Air Date (if missing)  e.g. 2025-01-31");
            d.runtime = d.runtime || digits(await optionalPrompt(tp, "Runtime (if missing)  (whole minutes)"));
            return d;
        },
        manual: async () => ({
            seriesName: pickedSeries.name,
            seriesGenres: "",
            seriesPublisher: await optionalPrompt(tp, "Network / Streaming service"),
            seriesReleased: "",
            seriesThumbnail: "",
            seriesUrl: "",
            seasonReleased: "",
            episodeCount: "",
            title: await optionalPrompt(tp, "Episode Title"),
            released: await optionalPrompt(tp, "Air Date  e.g. 2025-01-31"),
            runtime: digits(await optionalPrompt(tp, "Runtime  (whole minutes)")),
            url: await optionalPrompt(tp, "URL  e.g. the TVmaze episode page"),
        }),
    });
    if (!data) return null;

    const seriesName = data.seriesName;
    const seasonName = seasonNoteName(seriesName, seasonNum);

    // Cascade on first capture: when the picker births a Series or Season note
    // that does not yet exist, fill it from the fetch rather than leaving a
    // bare stub. Existing notes are never rewritten — createStub returns early.
    await createStub(tp, TEMPLATES.series, SERIES_FOLDER, seriesName, {
        publisher: data.seriesPublisher,
        general_subject: data.seriesGenres,
        released: data.seriesReleased,
        thumbnail: data.seriesThumbnail,
        url: data.seriesUrl,
    });
    await createStub(tp, TEMPLATES.season, SEASON_FOLDER, seasonName, {
        series: `[[${seriesName}]]`,
        released: data.seasonReleased,
        // A number, not a string: the Season MOC is where "how many are there
        // still to watch" gets answered, and that is arithmetic.
        episode_count: data.episodeCount ? Number(data.episodeCount) : "",
    });

    // "Severance S02E03 – Who Is Alive?" — the "» " prefix is added by the
    // orchestrator, so noteTitle covers only the code/title portion, which is
    // also reused as nothing else here (the body opens with the meta callout).
    // The title is kept in the filename rather than pushed to `aliases`: it is
    // how a reader recognises an episode in a file list. It can be spoilery for
    // an unwatched episode, which is the known cost.
    const code = `${seriesName} S${pad2(seasonNum)}E${pad2(episodeNum)}`;
    const noteTitle = sanitizeTitle(data.title ? `${code} – ${data.title}` : code);

    let yamlFields = "";
    // Built by hand rather than through yamlField because the values are
    // wikilinks, not plain scalars — but the quoting hazard is the same, so the
    // link targets go through yamlQuote just like every other quoted field.
    //
    // FLAT POINTERS TO BOTH LEVELS, never a chain. `season:` alone would force
    // every series-level query through two hops; chaining was considered and
    // rejected in ADR 0011 as "option A" because it breaks one-hop metadata
    // traversal. This matches sourceCaptureLecture.js:170-171, where a lecture
    // carries `course:` AND `unit:`.
    yamlFields += `series: "[[${helpers.yamlQuote(seriesName)}]]"\n`;
    yamlFields += `season: "[[${helpers.yamlQuote(seasonName)}]]"\n`;
    // `episode` and `runtime` are emitted UNQUOTED, by hand, and NOT through
    // helpers.yamlField — which always quotes. A quoted number makes Dataview
    // compare LEXICALLY, so the Season MOC's `SORT episode ASC` would put
    // episode 10 before episode 9, and `WHERE runtime < 60` would be silently
    // wrong ("90" < "100" is false). `digits` above is what guarantees the
    // unquoted value is always valid YAML. Do NOT "fix" these to yamlField.
    yamlFields += `episode: ${episodeNum}\n`;
    yamlFields += yamlField("released", data.released);
    yamlFields += data.runtime ? `runtime: ${data.runtime}\n` : "runtime:\n";
    yamlFields += yamlField("url", data.url);
    yamlFields += yamlField("watched", tp.date.now("YYYY-MM-DD"));

    // Plain markdown, never `key::` inline fields — every value here is already
    // in the frontmatter above. See docs/adr/0005.
    let body = "> [!meta]- Metadata\n";
    body += `> **Series:** [[${seriesName}]]\n`;
    body += `> **Season:** [[${seasonName}]]\n`;
    body += `> **Episode:** ${episodeNum}\n`;
    if (data.released) body += "> **Aired:** " + data.released + "\n";
    if (data.runtime) body += "> **Runtime:** " + data.runtime + " min\n";
    body += "> **Watched:** " + tp.date.now("YYYY-MM-DD") + "\n";
    body += "\n";

    body += "## Quotes & Moments\n\n";
    body += "| Time | Quote / What happens |\n";
    body += "|------|----------------------|\n";
    body += "|      |                      |\n\n";

    body += recapBlock("episode");

    return { noteTitle, yamlFields, body };
};

// Exposed so the test suite's guard test can verify these template files
// actually exist in the vault without restating the names. A function (not a
// plain object) because Templater's User Scripts loader rejects modules with
// non-function exports (see CHANGELOG 2.2.0, periodicNoteHelpers).
module.exports.stubTemplates = function stubTemplates() {
    return { ...TEMPLATES };
};
