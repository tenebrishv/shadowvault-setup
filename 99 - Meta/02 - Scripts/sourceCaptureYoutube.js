/*
 * YouTube capture: oEmbed auto-fetch with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCaptureYoutube(tp, helpers) {
    const { requiredPrompt, optionalPrompt, yamlField } = helpers;
    const data = {};
    let noteTitle = "";

    data.url = await requiredPrompt(tp, "YouTube URL");
    if (!data.url) return null;

    try {
        const res = await fetch("https://youtube.com/oembed?url=" + data.url + "&format=json");
        const yt = await res.json();
        data.yt_title = yt.title;
        data.yt_channel = yt.author_name;
        data.yt_chanurl = yt.author_url;
        data.yt_thumb = yt.thumbnail_url;
        const idMatch = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(data.url);
        data.yt_id = idMatch ? idMatch[1] : "";
        noteTitle = yt.title.replace(/[:"#^|[\]\\\/]/g, "").trim();
        new Notice("Fetched: " + yt.title, 2000);
    } catch (e) {
        new Notice("Could not auto-fetch YouTube data. Fill manually.", 3000);
        data.yt_title = await requiredPrompt(tp, "Video Title (auto-fetch failed)");
        if (!data.yt_title) return null;
        data.yt_channel = await optionalPrompt(tp, "Channel Name");
        data.yt_chanurl = "";
        data.yt_thumb = "";
        data.yt_id = "";
        noteTitle = data.yt_title.replace(/[:"#^|[\]\\\/]/g, "").trim();
    }

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
