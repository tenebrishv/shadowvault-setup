/*
 * Tweet capture: oEmbed auto-fetch with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCaptureTweet(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField } = helpers;
    const data = {};

    data.url = await requiredPrompt(tp, "Tweet URL");
    if (!data.url) return null;

    let autoFetched = false;
    try {
        const res = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(data.url)}`);
        const tw = await res.json();
        data.account = tw.author_name.replace(/^@/, "");
        data.tweet_text = tw.title; // plain-text tweet content
        autoFetched = true;
        new Notice("Fetched tweet metadata", 2000);
    } catch (e) {
        new Notice("Could not auto-fetch tweet data. Enter manually.", 3000);
    }

    if (!autoFetched) {
        data.account = await requiredPrompt(tp, "Account (@handle)");
        if (!data.account) return null;
        data.tweet_text = await optionalPrompt(tp, "Tweet text (for reference)");
    }

    data.keywords = await optionalPrompt(tp, "Keywords / Topics");
    data.publish_date = await datePrompt(tp, "Tweet Date");

    // Clean the note-title (remove any forbidden chars and newlines)
    const noteTitle = (data.account + " — " + tp.date.now("YYYY-MM-DD"))
        .replace(/[\\/:*?"<>|#^\[\]]/g, "")
        .replace(/\n/g, " ")
        .trim();

    let yamlFields = "";
    yamlFields += yamlField("account", data.account);
    yamlFields += yamlField("url", data.url);
    yamlFields += yamlField("keywords", data.keywords);
    yamlFields += yamlField("publish_date", data.publish_date);
    if (data.tweet_text) {
        // Escape double quotes inside the tweet text
        const safeText = data.tweet_text.replace(/"/g, '\\"');
        yamlFields += `tweet_text: "${safeText}"\n`;
    }

    let body = `# ${noteTitle}\n\n`;
    // Tweet text as a blockquote (always works, searchable, offline)
    if (data.tweet_text) {
        body += `> [!quote] Tweet\n> ${data.tweet_text}\n\n`;
    } else {
        body += `> [!quote] Tweet\n> *(text not available)*\n\n`;
    }
    // Link to the original tweet (opens in browser)
    body += `🔗 [Open original tweet](${data.url})\n\n`;
    body += "---\n\n## Notes\n\n- \n";

    return { noteTitle, yamlFields, body };
};
