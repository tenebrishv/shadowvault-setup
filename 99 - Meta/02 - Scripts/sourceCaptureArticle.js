/*
 * Article capture: Microlink metadata auto-fetch with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCaptureArticle(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField, fetchWithFallback } = helpers;
    const url = await requiredPrompt(tp, "Article URL");
    if (!url) return null;

    const data = await fetchWithFallback(tp, {
        label: "article metadata",
        fetch: async () => {
            const meta = await helpers.httpGetJson(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
            if (meta.status !== "success") throw new Error("No data");
            return {
                title: meta.data.title || "",
                authors: meta.data.author || "",
                publication: meta.data.publisher || "",
            };
        },
        manual: async () => {
            const title = await requiredPrompt(tp, "Article Title (auto-fetch failed)");
            if (!title) return null;
            return {
                title,
                authors: await optionalPrompt(tp, "Author(s)"),
                publication: await optionalPrompt(tp, "Publication / Site name"),
            };
        },
    });
    if (!data) return null;

    data.url = url;
    const noteTitle = data.title;
    // Date is tricky to auto-parse, so it's always a manual prompt, on both paths.
    data.publish_date = await datePrompt(tp, "Date Published");

    let yamlFields = "";
    yamlFields += yamlField("authors", data.authors);
    yamlFields += yamlField("url", data.url);
    yamlFields += yamlField("publication", data.publication);
    yamlFields += yamlField("publish_date", data.publish_date);

    // Plain markdown, not `key::` inline fields — see docs/adr/0005.
    let body = "> [!meta]- Metadata\n";
    body += "> **Source:** [" + data.title + "](" + data.url + ")\n";
    if (data.authors) body += "> **Authors:** " + data.authors + "\n";
    if (data.publication) body += "> **Publication:** " + data.publication + "\n";
    if (data.publish_date) body += "> **Published:** " + data.publish_date + "\n";
    body += "\n---\n\n- \n";

    return { noteTitle, yamlFields, body };
};
