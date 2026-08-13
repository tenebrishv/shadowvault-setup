// SPDX-License-Identifier: AGPL-3.0-only
const test = require("node:test");
const assert = require("node:assert/strict");
const sourceCapturePodcast = require("../02 - Scripts/sourceCapturePodcast.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const {
    createMockTp, installMockNotice, installMockFetch, jsonResponse, failingFetch,
} = require("./_testUtils.js");

// Trimmed to the fields the module reads, but shaped exactly as iTunes returns
// them — including the two asymmetries that motivated the code: the show is
// echoed back as results[0] of the episode lookup with wrapperType "track",
// and show genres are strings while episode genres are objects.
const SHOW = {
    collectionId: 1050462261,
    collectionName: "Acquired",
    artistName: "Ben Gilbert and David Rosenthal",
    genres: ["Technology", "Podcasts", "Business"],
    artworkUrl600: "https://is1-ssl.mzstatic.com/image/thumb/600x600bb.jpg",
};

const SHOW_ECHO = {
    wrapperType: "track",
    kind: "podcast",
    collectionId: 1050462261,
    collectionName: "Acquired",
    trackName: "Acquired",
    trackViewUrl: "https://podcasts.apple.com/us/podcast/acquired/id1050462261",
    releaseDate: "2026-08-10T04:41:00Z",
};

const EPISODE = {
    wrapperType: "podcastEpisode",
    kind: "podcast-episode",
    collectionId: 1050462261,
    collectionName: "Acquired",
    artistName: null,
    trackName: "Disney: The Renaissance and the Empire",
    trackViewUrl: "https://podcasts.apple.com/us/podcast/disney/id1050462261?i=1000781367915",
    releaseDate: "2026-08-10T04:41:43Z",
    genres: [{ name: "Technology", id: "1318" }],
    artworkUrl600: "https://is1-ssl.mzstatic.com/image/thumb/ep600x600bb.jpg",
    episodeUrl: "https://pscrb.fm/rss/p/media.transistor.fm/4bcdc326/22e5d62f.mp3",
    previewUrl: "https://pscrb.fm/rss/p/media.transistor.fm/4bcdc326/22e5d62f.mp3",
};

const OLD_EPISODE = {
    wrapperType: "podcastEpisode",
    collectionId: 1050462261,
    collectionName: "Acquired",
    trackName: "The Sony Story",
    trackViewUrl: "https://podcasts.apple.com/us/podcast/sony/id1050462261?i=100055",
    releaseDate: "2019-03-04T09:00:00Z",
    genres: [{ name: "Technology", id: "1318" }],
};

// Routes by the query iTunes was asked, the way the real API distinguishes the
// three calls this module can make. `entity=podcastEpisode` is checked before
// the bare podcast search because it is a superstring of it.
function installItunes({ shows = [SHOW], episodes = [SHOW_ECHO, EPISODE], titleHits = [] } = {}) {
    const urls = [];
    installMockFetch(async (url) => {
        urls.push(url);
        if (url.includes("/lookup?")) return jsonResponse({ resultCount: episodes.length, results: episodes });
        if (url.includes("entity=podcastEpisode")) return jsonResponse({ resultCount: titleHits.length, results: titleHits });
        return jsonResponse({ resultCount: shows.length, results: shows });
    });
    return urls;
}

test("Podcast: iTunes lookup fills title, url, date and subject from the chosen episode", async () => {
    installMockNotice();
    installItunes();
    const tp = createMockTp({
        // show query, then host (prefill accepted), then guest
        prompts: ["Acquired", "Ben Gilbert and David Rosenthal", "Bob Iger"],
        suggestions: [EPISODE],
    });

    const result = await sourceCapturePodcast(tp, helpers);

    assert.equal(result.noteTitle, "Disney: The Renaissance and the Empire");
    assert.match(result.yamlFields, /url: "https:\/\/podcasts\.apple\.com\/us\/podcast\/disney\/id1050462261\?i=1000781367915"\n/);
    // Truncated from the full ISO 8601 timestamp iTunes actually returns.
    assert.match(result.yamlFields, /publish_date: "2026-08-10"\n/);
    // Episode genres are objects, and the store-wide "Podcasts" genre is noise.
    assert.match(result.yamlFields, /general_subject: "Technology"\n/);
    assert.match(result.yamlFields, /guest: "Bob Iger"\n/);
    assert.match(result.body, /Timestamp note/);
});

test("Podcast: host is offered as a prefill, never written silently", async () => {
    installMockNotice();
    installItunes();
    const tp = createMockTp({
        prompts: ["Acquired", "Ben Gilbert and David Rosenthal", ""],
        suggestions: [EPISODE],
    });

    const result = await sourceCapturePodcast(tp, helpers);

    // The show-level artistName reached the prompt as a default...
    assert.ok(tp._calls.promptDefaults.includes("Ben Gilbert and David Rosenthal"),
        "expected show artistName to be offered as a prompt default");
    // ...and the prompt that carried it said so, rather than "Enter to skip".
    const hostPrompt = tp._calls.prompts.find(p => p.startsWith("Host"));
    assert.match(hostPrompt, /iTunes' guess/);
    assert.match(hostPrompt, /Enter to accept/);
    assert.match(result.yamlFields, /host: "Ben Gilbert and David Rosenthal"\n/);
});

test("Podcast: an overwritten host prefill wins over the iTunes guess", async () => {
    installMockNotice();
    installItunes({ shows: [{ ...SHOW, artistName: "The New York Times" }] });
    const tp = createMockTp({
        // The Daily case: artistName is the publisher, so the reader corrects it.
        prompts: ["The Daily", "Michael Barbaro", ""],
        suggestions: [EPISODE],
    });

    const result = await sourceCapturePodcast(tp, helpers);

    assert.match(result.yamlFields, /host: "Michael Barbaro"\n/);
    assert.doesNotMatch(result.yamlFields, /New York Times/);
});

test("Podcast: the show echoed back as results[0] is not offered as an episode", async () => {
    installMockNotice();
    installItunes();
    let offered = null;
    const tp = createMockTp({
        prompts: ["Acquired", "", ""],
        suggestions: [EPISODE],
    });
    const realSuggester = tp.system.suggester;
    tp.system.suggester = async (display, values, throwOnCancel, placeholder) => {
        if (placeholder.startsWith("Which episode")) offered = values;
        return realSuggester.call(tp.system, display, values, throwOnCancel, placeholder);
    };

    await sourceCapturePodcast(tp, helpers);

    // SHOW_ECHO carries wrapperType "track" and the show's own name/URL; if it
    // survived the filter it would sit at the top of the picker looking like
    // episode one.
    assert.ok(!offered.includes(SHOW_ECHO), "the show echo leaked into the episode picker");
    assert.ok(offered.includes(EPISODE));
});

test("Podcast: no artwork or audio-preview field is ever emitted (Apple Promo Content terms)", async () => {
    installMockNotice();
    installItunes();
    const tp = createMockTp({
        prompts: ["Acquired", "", ""],
        suggestions: [EPISODE],
    });

    const result = await sourceCapturePodcast(tp, helpers);

    // Album art and song/video previews are "Promo Content" under Apple's
    // legal notice, which attaches a mandatory "Download on iTunes" badge and
    // an attribution line. Reading them would push that obligation onto every
    // adopter of this framework — the same shape ADR 0014 vetoed TMDb over.
    const note = result.yamlFields + result.body;
    assert.doesNotMatch(note, /mzstatic|artwork/i);
    assert.doesNotMatch(note, /pscrb\.fm|\.mp3/i);
});

test("Podcast: skipping the show name goes straight to manual, with no failure Notice", async () => {
    installMockNotice();
    const notices = installMockNotice();
    failingFetch();
    const tp = createMockTp({
        // empty show query, then the original six manual prompts
        prompts: ["", "Episode 42", "Host Name", "Guest Name", "https://podcast.example/42", "2022-11-11", "Philosophy"],
    });

    const result = await sourceCapturePodcast(tp, helpers);

    assert.equal(result.noteTitle, "Episode 42");
    assert.match(result.yamlFields, /host: "Host Name"\n/);
    assert.match(result.yamlFields, /guest: "Guest Name"\n/);
    assert.match(result.yamlFields, /publish_date: "2022-11-11"\n/);
    assert.match(result.yamlFields, /general_subject: "Philosophy"\n/);
    assert.ok(!notices.some(m => /Could not fetch/.test(m)),
        "a skipped lookup must not report a fetch failure");
});

test("Podcast: a network failure falls back to the manual prompts", async () => {
    const notices = installMockNotice();
    failingFetch();
    const tp = createMockTp({
        prompts: ["Acquired", "Episode 42", "Host Name", "", "", "", ""],
    });

    const result = await sourceCapturePodcast(tp, helpers);

    assert.equal(result.noteTitle, "Episode 42");
    assert.match(result.yamlFields, /host: "Host Name"\n/);
    assert.ok(notices.some(m => /Could not fetch podcast data from iTunes/.test(m)));
});

test("Podcast: a search matching no show falls back to the manual prompts", async () => {
    const notices = installMockNotice();
    installItunes({ shows: [] });
    const tp = createMockTp({
        prompts: ["Nonexistent Show", "Episode 42", "", "", "", "", ""],
    });

    const result = await sourceCapturePodcast(tp, helpers);

    // resultCount 0 arrives as HTTP 200, so this only works because the module
    // throws on the empty array itself.
    assert.equal(result.noteTitle, "Episode 42");
    assert.ok(notices.some(m => /Could not fetch podcast data from iTunes/.test(m)));
});

test("Podcast: cancelling the show picker aborts the capture", async () => {
    installMockNotice();
    installItunes({ shows: [SHOW, { ...SHOW, collectionId: 2, collectionName: "Acquired FM" }] });
    const tp = createMockTp({ prompts: ["Acquired"], suggestions: [null] });

    assert.equal(await sourceCapturePodcast(tp, helpers), null);
});

test("Podcast: cancelling the episode picker aborts the capture", async () => {
    installMockNotice();
    installItunes();
    const tp = createMockTp({ prompts: ["Acquired"], suggestions: [null] });

    assert.equal(await sourceCapturePodcast(tp, helpers), null);
});

test("Podcast: choosing hand entry keeps the show's host prefill and genres", async () => {
    installMockNotice();
    installItunes();
    const tp = createMockTp({
        prompts: ["Acquired", "Episode 42", "Ben Gilbert and David Rosenthal", "A Guest", "https://x.example", "2024-01-02", "Technology, Business"],
        suggestions: ["✏️ Enter episode details by hand"],
    });

    const result = await sourceCapturePodcast(tp, helpers);

    assert.equal(result.noteTitle, "Episode 42");
    assert.match(result.yamlFields, /host: "Ben Gilbert and David Rosenthal"\n/);
    assert.ok(tp._calls.promptDefaults.includes("Ben Gilbert and David Rosenthal"));
    // Show genres are plain strings, and "Podcasts" is still stripped.
    assert.ok(tp._calls.promptDefaults.includes("Technology, Business"));
});

test("Podcast: the title search reaches a back-catalogue episode the lookup omits", async () => {
    installMockNotice();
    // The lookup returns only recent episodes — OLD_EPISODE is not among them.
    installItunes({ episodes: [SHOW_ECHO, EPISODE], titleHits: [OLD_EPISODE] });
    const tp = createMockTp({
        prompts: ["Acquired", "The Sony Story", "", ""],
        suggestions: ["🔍 Search by episode title…"],
    });

    const result = await sourceCapturePodcast(tp, helpers);

    // A single hit skips the second picker entirely.
    assert.equal(result.noteTitle, "The Sony Story");
    assert.match(result.yamlFields, /publish_date: "2019-03-04"\n/);
});

test("Podcast: the title search ignores same-titled episodes of other shows", async () => {
    const notices = installMockNotice();
    installItunes({
        titleHits: [{ ...OLD_EPISODE, collectionId: 999, collectionName: "Some Other Podcast" }],
    });
    const tp = createMockTp({
        // show, title search, then the six hand-entry prompts
        prompts: ["Acquired", "The Sony Story", "Episode 42", "", "", "", "", ""],
        suggestions: ["🔍 Search by episode title…"],
    });

    const result = await sourceCapturePodcast(tp, helpers);

    // Episode search is store-wide; an unpinned result would have been accepted
    // here and written another podcast's URL into this note.
    assert.equal(result.noteTitle, "Episode 42");
    assert.ok(notices.some(m => /No episode matched that title/.test(m)));
});

test("Podcast: cancelling the required title prompt aborts capture", async () => {
    installMockNotice();
    const tp = createMockTp({ prompts: ["", null] });
    const result = await sourceCapturePodcast(tp, helpers);
    assert.equal(result, null);
});
