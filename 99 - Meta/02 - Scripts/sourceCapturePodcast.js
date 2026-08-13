// SPDX-License-Identifier: AGPL-3.0-only
/*
 * Podcast capture: a keyless iTunes Search lookup (show -> episode) with the
 * original six manual prompts as the floor. Returns
 * { noteTitle, yamlFields, body }, or null if cancelled.
 *
 * iTunes Search is ADR 0014 tier 0 — no key, no account, no registration — and
 * it supplies 4 of this type's 5 fields outright (`title`, `url`,
 * `publish_date`, `general_subject`), prefills a 5th (`host`), and cannot
 * supply `guest` at all. See issue #73 for the field-by-field probe.
 *
 * TERMS: Apple's legal notice for this API governs "Promo Content" — defined
 * as "previews of songs and music videos, album art, and App icons" — and
 * nothing else. Every field read below is plain text metadata plus a link into
 * Apple Podcasts, so none of the six obligations attach. That is exactly why
 * `artworkUrl600` is NOT read despite being right there in the response:
 * album art IS Promo Content, and taking it would drag in obligation (ii), a
 * mandatory "Download on iTunes" badge next to the image, propagating to every
 * adopter of a redistributable framework. That is the same shape as the
 * attribution burden ADR 0014 vetoed TMDb over. Do not add a `thumbnail` field
 * here from iTunes; Series gets one from TVmaze because TVmaze is CC BY-SA and
 * asks only for a link. `previewUrl`/`episodeUrl` are likewise left alone.
 */

const ITUNES = "https://itunes.apple.com";

// A descriptive, honest User-Agent, the same pattern as sourceCaptureBook.js
// and sourceCaptureSeries.js.
const ITUNES_UA = "ShadowVault/2.17 (+https://github.com/tenebrishv/shadowvault-setup)";

// Apple documents the Search API at ~20 calls/minute. A capture spends two —
// show search, then episode lookup — or three if the title-search rung is used,
// so the limit is not close to binding.
const SHOW_LIMIT = 15;
// `lookup ... entity=podcastEpisode` returns only the most recent episodes
// whatever limit is asked for, which is the whole reason SEARCH_BY_TITLE below
// exists: a back-catalogue episode simply will not be in this list.
const EPISODE_LIMIT = 200;
const TITLE_SEARCH_LIMIT = 25;

const SEARCH_BY_TITLE = "🔍 Search by episode title…";
const ENTER_BY_HAND = "✏️ Enter episode details by hand";

// A show's `genres` is an array of STRINGS; an episode's `genres` is an array
// of {name, id} OBJECTS. Same key, two shapes, in the same response — read
// both rather than assuming either.
//
// "Podcasts" is dropped because iTunes attaches it to every show in the store,
// so as a `general_subject` it says nothing.
function genreNames(genres) {
    if (!Array.isArray(genres)) return "";
    return genres
        .map(g => (typeof g === "string" ? g : (g && g.name) || ""))
        .filter(name => name && name !== "Podcasts")
        .join(", ");
}

// iTunes returns a full ISO 8601 timestamp ("2026-08-10T04:41:43Z"), but
// `publish_date` is a plain date across every other capture type — and
// datePrompt's own validator accepts only YYYY[-MM[-DD]].
const isoDate = (value) => String(value || "").slice(0, 10);

const episodeLabel = (ep) => {
    const date = isoDate(ep.releaseDate);
    return date ? `${ep.trackName}  (${date})` : String(ep.trackName || "");
};

// `artistName` is SHOW-level and is whatever the feed put in <itunes:author>:
// the host for "99% Invisible" (Roman Mars) and "Acquired" (Ben Gilbert and
// David Rosenthal), the publisher for "The Daily" (The New York Times) and
// "Conversations with Tyler" (Mercatus Center). Roughly half right, sampled
// across 5 shows in issue #73 — and episode objects carry `artistName: null`,
// so there is nothing better to read. It is therefore offered as a prefill the
// reader confirms or overwrites, never written silently.
const hostLabel = (prefill) => (prefill ? "Host  (iTunes' guess — check it)" : "Host");

// Picks an episode of `show`, in two rungs because the lookup above is capped
// at recent episodes: choose from that list, or search the catalogue by title.
// Either rung can be declined, which drops to hand entry rather than aborting.
//
// Returns { episode } | { manual: true } | { cancelled: true }.
async function pickEpisode(tp, helpers, get, show) {
    let episodes = [];
    try {
        const res = await get(`${ITUNES}/lookup?id=${show.collectionId}`
            + `&entity=podcastEpisode&limit=${EPISODE_LIMIT}`);
        // results[0] is the SHOW itself (wrapperType "track"), not an episode —
        // iTunes echoes the looked-up collection back ahead of its children, so
        // an unfiltered list offers the podcast as though it were episode one,
        // carrying the show's name and the show's URL. Filter on wrapperType.
        episodes = ((res && res.results) || [])
            .filter(r => r && r.wrapperType === "podcastEpisode");
    } catch (e) {
        // No episode list is not a failed capture: the title search and hand
        // entry below both still work, and the show data is already in hand.
    }

    const choices = [...episodes.map(episodeLabel), SEARCH_BY_TITLE, ENTER_BY_HAND];
    const values = [...episodes, SEARCH_BY_TITLE, ENTER_BY_HAND];
    const picked = await tp.system.suggester(
        choices, values, false, `Which episode of ${show.collectionName}?`);

    if (!picked) return { cancelled: true };
    if (picked === ENTER_BY_HAND) return { manual: true };
    if (picked !== SEARCH_BY_TITLE) return { episode: picked };

    const title = await helpers.optionalPrompt(tp, "Episode title to search for");
    if (!title) return { manual: true };

    let found = [];
    try {
        const res = await get(`${ITUNES}/search`
            + `?term=${encodeURIComponent(show.collectionName + " " + title)}`
            + `&entity=podcastEpisode&limit=${TITLE_SEARCH_LIMIT}`);
        // Episode search is store-wide, so results must be pinned back to the
        // show the reader already chose or a same-titled episode of some other
        // podcast can win.
        found = ((res && res.results) || []).filter(
            r => r && r.wrapperType === "podcastEpisode"
                && r.collectionId === show.collectionId);
    } catch (e) {
        // Handled by the empty check below — one Notice, not two.
    }
    if (!found.length) {
        new Notice("No episode matched that title. Enter its details manually.", 3000);
        return { manual: true };
    }

    const hit = found.length === 1 ? found[0] : await tp.system.suggester(
        found.map(episodeLabel), found, false, "Which episode?");
    if (!hit) return { cancelled: true };
    return { episode: hit };
}

module.exports = async function sourceCapturePodcast(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField,
            fetchWithFallback, httpGetJson } = helpers;

    const get = (url) => httpGetJson(url, { headers: { "User-Agent": ITUNES_UA } });

    // Skipped or cancelled goes straight to the six prompts this module used to
    // be, via fetchWithFallback's `skip` — so no "could not fetch" Notice fires
    // for a lookup the reader declined to ask for.
    // No "(Enter to skip lookup)" in the label — optionalPrompt appends its own
    // "(Enter to skip)", and the two together read as a stutter.
    const showQuery = await optionalPrompt(tp, "Podcast show name");

    const data = await fetchWithFallback(tp, {
        label: "podcast data from iTunes",
        skip: !showQuery,
        fetch: async () => {
            const res = await get(`${ITUNES}/search`
                + `?term=${encodeURIComponent(showQuery)}`
                + `&entity=podcast&limit=${SHOW_LIMIT}`);
            const shows = ((res && res.results) || []).filter(s => s && s.collectionId);
            // A miss is HTTP 200 with resultCount 0, never a 4xx — the same
            // empty-success trap Wikidata and TVmaze have, and the same guard.
            if (!shows.length) throw new Error("No podcasts matched that name");
            return shows;
        },
        // Everything below runs OUTSIDE fetchWithFallback's try: these are
        // pickers and prompts, and a cancelled picker must not be reported as a
        // failed fetch, which would re-ask questions already answered.
        fillGaps: async (shows) => {
            const show = shows.length === 1 ? shows[0] : await tp.system.suggester(
                shows.map(s => s.collectionName + (s.artistName ? "  —  " + s.artistName : "")),
                shows, false, "Which podcast?");
            if (!show) { new Notice("Cancelled."); return null; }

            const prefillHost = show.artistName || "";
            const chosen = await pickEpisode(tp, helpers, get, show);
            if (chosen.cancelled) { new Notice("Cancelled."); return null; }

            // No episode matched, but the show did — so the host prefill and
            // the show's genres are still worth having, and this stays better
            // than the cold manual path.
            if (chosen.manual) {
                const title = await requiredPrompt(tp, "Episode Title");
                if (!title) return null;
                return {
                    title,
                    host: await optionalPrompt(tp, hostLabel(prefillHost), prefillHost),
                    guest: await optionalPrompt(tp, "Guest(s)"),
                    url: await optionalPrompt(tp, "Episode URL"),
                    publish_date: await datePrompt(tp, "Date Published"),
                    general_subject: await optionalPrompt(
                        tp, "Subject / Topic", genreNames(show.genres)),
                };
            }

            const ep = chosen.episode;
            return {
                title: ep.trackName || "",
                host: await optionalPrompt(tp, hostLabel(prefillHost), prefillHost),
                // iTunes has no guest field at either level — not empty, absent.
                // Only ever inferable from the title/description prose, which is
                // not a guess worth prefilling. Stays a plain manual prompt.
                guest: await optionalPrompt(tp, "Guest(s)"),
                // The Apple Podcasts episode page, not `episodeUrl` (the raw
                // audio enclosure) — a page a reader can actually open later.
                url: ep.trackViewUrl || "",
                publish_date: isoDate(ep.releaseDate),
                general_subject: genreNames(ep.genres) || genreNames(show.genres),
            };
        },
        manual: async () => {
            const title = await requiredPrompt(tp, "Episode Title");
            if (!title) return null;
            return {
                title,
                host: await optionalPrompt(tp, "Host"),
                guest: await optionalPrompt(tp, "Guest(s)"),
                url: await optionalPrompt(tp, "Episode URL"),
                publish_date: await datePrompt(tp, "Date Published"),
                general_subject: await optionalPrompt(tp, "Subject / Topic"),
            };
        },
    });
    if (!data) return null;

    const noteTitle = data.title;

    let yamlFields = "";
    yamlFields += yamlField("host", data.host);
    yamlFields += yamlField("guest", data.guest);
    yamlFields += yamlField("url", data.url);
    yamlFields += yamlField("publish_date", data.publish_date);
    yamlFields += yamlField("general_subject", data.general_subject);

    // Plain markdown, not `key::` inline fields — see docs/adr/0005.
    let body = "> [!meta]- Metadata\n";
    body += "> **Host:** " + (data.host || "") + "\n";
    body += "> **Guest:** " + (data.guest || "") + "\n";
    body += "> **URL:** " + (data.url || "") + "\n";
    body += "> **Published:** " + (data.publish_date || "") + "\n\n";
    body += "---\n\n## Notes\n\n";
    body += "%% [mm:ss](" + (data.url || "url") + "?t=0) - Timestamp note %%\n\n- \n";

    return { noteTitle, yamlFields, body };
};
