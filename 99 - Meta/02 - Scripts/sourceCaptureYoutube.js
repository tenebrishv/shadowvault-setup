/*
 * YouTube capture: oEmbed auto-fetch with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCaptureYoutube(tp, helpers) {
    const { requiredPrompt, optionalPrompt, yamlField, sanitizeTitle, fetchWithFallback } = helpers;
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
            const idMatch = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(url);
            return {
                yt_title: yt.title,
                yt_channel: yt.author_name,
                yt_chanurl: yt.author_url,
                yt_thumb: yt.thumbnail_url,
                yt_id: idMatch ? idMatch[1] : "",
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
                yt_id: "",
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
    if (data.yt_thumb) body += "> ![](" + data.yt_thumb + ")\n";
    body += "\n---\n\n";
    if (data.yt_id) {
        body += "<iframe src=\"https://www.youtube-nocookie.com/embed/" + data.yt_id + "?vq=hd1080&modestbranding=1&rel=0&iv_load_policy=3\" width=\"569\" height=\"317\" frameborder=\"0\" style=\"margin: 0 auto; display: block;\"></iframe>\n\n";
    }
    body += "---\n\n## Notes\n\n";
    body += "%% [mm:ss](" + data.url + "?t=0) - Timestamp note %%\n\n- \n";

    return { noteTitle, yamlFields, body };
};
