// SPDX-License-Identifier: AGPL-3.0-only
/*
 * YouTube capture: oEmbed auto-fetch with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCaptureYoutube(tp, helpers) {
    const { requiredPrompt, optionalPrompt, yamlField, sanitizeTitle, fetchWithFallback, mxUid, recapBlock } = helpers;
    const url = await requiredPrompt(tp, "YouTube URL");
    if (!url) return null;

    const data = await fetchWithFallback(tp, {
        label: "YouTube data",
        fetch: async () => {
            // oEmbed answers 401 for videos whose uploader disabled embedding
            // (common for broadcaster/news clips) — httpGetJson turns that into
            // a throw, so capture falls back to manual entry as it should.
            const yt = await helpers.httpGetJson(
                `https://youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
            );
            // The video id used to be parsed out to build an <iframe> src.
            // The MX embed takes the watch URL as-is, so nothing needs it now.
            return {
                yt_title: yt.title,
                yt_channel: yt.author_name,
                yt_chanurl: yt.author_url,
                yt_thumb: yt.thumbnail_url,
            };
        },
        manual: async () => {
            const yt_title = await requiredPrompt(tp, "Video Title (auto-fetch failed)");
            if (!yt_title) return null;
            return {
                yt_title,
                yt_channel: await optionalPrompt(tp, "Channel Name"),
                yt_chanurl: "",
                yt_thumb: "",
            };
        },
    });
    if (!data) return null;

    data.url = url;
    const noteTitle = sanitizeTitle(data.yt_title);

    let yamlFields = "";
    yamlFields += yamlField("channel", data.yt_channel);
    yamlFields += yamlField("channel_url", data.yt_chanurl);
    yamlFields += yamlField("url", data.url);
    // `media` + `mx-uid` together make THIS note Media Extended's media-note
    // for the video, so MX stops spawning a duplicate under `media-lib/`.
    // BOTH are required and the uid does the identifying: MX's parser reads
    // `mx-uid` first and gives up before it ever looks at `media` (see
    // helpers.mxUid for the full reasoning and the falsified assumption).
    //
    // `media` holds the same value as `url:` on purpose — `url` is the vault's
    // canonical pointer that every source type carries and the dashboards read;
    // `media` is a plugin integration key with a different consumer.
    yamlFields += yamlField("media", data.url);
    yamlFields += yamlField("mx-uid", mxUid());
    yamlFields += yamlField("thumbnail", data.yt_thumb);
    yamlFields += "watched: \"" + tp.date.now("YYYY-MM-DD") + "\"\n";
    yamlFields += "released:\n";

    // Plain markdown, not `key::` inline fields: every value here is already in
    // the frontmatter above, and `::` would declare a second copy that Dataview
    // merges into the first. See docs/adr/0005.
    let body = "> [!meta]- Metadata\n";
    body += "> **Source:** [" + data.yt_title + "](" + data.url + ")\n";
    body += data.yt_chanurl
        ? "> **Channel:** [" + data.yt_channel + "](" + data.yt_chanurl + ")\n"
        : "> **Channel:** " + (data.yt_channel || "") + "\n";
    body += "> **Watched:** " + tp.date.now("YYYY-MM-DD") + "\n";
    // The in-body thumbnail is gone: the player below shows the poster frame
    // itself. `thumbnail:` stays in frontmatter so dashboards can render cards.
    body += "\n";
    // Bare, responsive Media Extended embed — no WxH, so MX applies its own
    // sizing. Replaces the old fixed 569x317 <iframe>, which rendered a plain
    // YouTube player that MX could neither seek nor capture from.
    body += "![](" + data.url + ")\n\n";
    body += "## Notes\n";
    // No `%%`-commented seek-link stub: MX writes its own correctly-formed
    // seek-links, so a hand-rolled `?t=` example was both redundant and wrong
    // (see issue #29). Their real shape carries BOTH a `&t=<seconds>` query
    // param and a clock-time `#t=mm:ss.dd` fragment, on a host-normalised
    // watch URL — see EXTERNAL-INTEGRATIONS.md, corrected by #50.
    //
    // Capture is VIEW-GATED (issue #33): the commands check for an active
    // media VIEW, so the inline embed above can never capture — it is a
    // markdown widget, not a view. The prompt has to say so, or the reader
    // right-clicks the embed and concludes the workflow is broken.
    // For TIMESTAMP/SCREENSHOT the prompt names the ACTION, not a command
    // title. Media Extended ships several variants (`-plain` among them) and
    // which one is bound is a per-vault choice, so quoting one title here would
    // make the note lie for anyone who bound a different one. The SWITCHER is
    // the opposite case — MX registers exactly one (`open-media-switcher`,
    // titled "Open media quick switcher", mirrored by a play ribbon icon under
    // the same tooltip), so naming it is safe and it is the reader's shortest
    // path to a capturing surface. Naming it wrong is not: issue #51 came from
    // a live run where "Open media switcher" returned nothing in the palette
    // and the reader concluded the workflow was missing.
    body += "*Watch in a **side-pane player**: right-click the embed above → open it in Media Extended";
    body += " (or run **Open media quick switcher** — the play icon in the left ribbon does the same).";
    body += " Keep the cursor in this note, then use your bound";
    body += " Media Extended **timestamp** / **screenshot** hotkeys.";
    body += " The inline embed plays and seeks but **cannot capture**.";
    body += " Quick jots go inline; save real synthesis for the Literature note.*\n\n- \n";
    // The holistic response to the video, below the bucket you jot into while
    // watching — you write it once the video is done. Atomic claims go to their
    // own literature notes instead (ADR 0010). YouTube is the first type to
    // carry this; issue #41 rolls the same helper out to the other five that
    // earn one.
    body += recapBlock("video");

    return { noteTitle, yamlFields, body };
};
