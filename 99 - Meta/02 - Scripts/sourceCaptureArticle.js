/*
 * Article capture: Microlink metadata auto-fetch with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCaptureArticle(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField } = helpers;
    const data = {};
    let noteTitle = "";

    data.url = await requiredPrompt(tp, "Article URL");
    if (!data.url) return null;

    try {
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(data.url)}`);
        const meta = await res.json();
        if (meta.status === "success") {
            data.title = meta.data.title || "";
            data.authors = meta.data.author || "";
            data.publication = meta.data.publisher || "";
            // note: date may not be reliable; still ask if needed
            noteTitle = data.title;
            new Notice("Fetched article metadata", 2000);
        } else throw new Error("No data");
    } catch (e) {
        // fallback to manual
        data.title = await requiredPrompt(tp, "Article Title (auto-fetch failed)");
        if (!data.title) return null;
        data.authors = await optionalPrompt(tp, "Author(s)");
        data.publication = await optionalPrompt(tp, "Publication / Site name");
        noteTitle = data.title;
    }
    // date is tricky to auto-parse, so keep the manual date prompt after the block
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
