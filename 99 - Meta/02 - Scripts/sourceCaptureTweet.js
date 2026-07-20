/*
 * Tweet capture: oEmbed auto-fetch with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCaptureTweet(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField, sanitizeTitle, fetchWithFallback } = helpers;
    const url = await requiredPrompt(tp, "Tweet URL");
    if (!url) return null;

    const data = await fetchWithFallback(tp, {
        label: "tweet metadata",
        fetch: async () => {
            const tw = await helpers.httpGetJson(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`);
            return {
                account: tw.author_name.replace(/^@/, ""),
                tweet_text: tw.title, // plain-text tweet content
            };
        },
        manual: async () => {
            const account = await requiredPrompt(tp, "Account (@handle)");
            if (!account) return null;
            return {
                account,
                tweet_text: await optionalPrompt(tp, "Tweet text (for reference)"),
            };
        },
    });
    if (!data) return null;

    data.url = url;
    data.keywords = await optionalPrompt(tp, "Keywords / Topics");
    data.publish_date = await datePrompt(tp, "Tweet Date");

    const noteTitle = sanitizeTitle(data.account + " — " + tp.date.now("YYYY-MM-DD"));

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
