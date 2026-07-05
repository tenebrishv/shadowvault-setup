/*
 * Book capture: ISBN auto-fetch (Open Library) with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCaptureBook(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField } = helpers;
    const data = {};
    let noteTitle = "";

    data.isbn = await optionalPrompt(tp, "ISBN (if you have it)");
    if (data.isbn) {
        try {
            const res = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(data.isbn)}.json`);
            if (!res.ok) throw new Error("Not found");
            const info = await res.json();
            data.title = info.title || "";
            data.authors = info.authors ? info.authors.map(a => a.name).join(", ") : "";
            data.publisher = info.publishers ? info.publishers[0] : "";
            data.publish_date = info.publish_date || "";
            // Open Library doesn't give a general subject, so keep it empty for now
            data.general_subject = "";
            noteTitle = data.title;
            new Notice("Fetched book data from ISBN", 2000);
        } catch (e) {
            new Notice("ISBN lookup failed. Enter details manually.", 3000);
        }
    }

    // Manual fallback if no title was fetched
    if (!data.title) {
        data.title = await requiredPrompt(tp, "Book Title");
        if (!data.title) return null;
        data.authors = await requiredPrompt(tp, "Author(s)");
        if (!data.authors) return null;
        data.publish_date = await datePrompt(tp, "Year Published");
        data.publisher = await optionalPrompt(tp, "Publisher");
        data.general_subject = await optionalPrompt(tp, "General Subject");
        noteTitle = data.title;
    } else {
        // Fill in fields that Open Library didn't provide (if any)
        data.general_subject = data.general_subject || await optionalPrompt(tp, "General Subject");
        data.publish_date = data.publish_date || await datePrompt(tp, "Year Published (if missing)");
    }
    data.specific_subject = await optionalPrompt(tp, "Specific Subject"); // always ask

    let yamlFields = "";
    yamlFields += yamlField("authors", data.authors);
    yamlFields += yamlField("publish_date", data.publish_date);
    yamlFields += yamlField("publisher", data.publisher);
    yamlFields += yamlField("isbn", data.isbn);
    yamlFields += yamlField("general_subject", data.general_subject);
    yamlFields += yamlField("specific_subject", data.specific_subject);

    let body = "> [!meta]- Metadata\n> citation::\n\n";
    body += "## Notes\n\n- \n\n";
    body += "> [!summary] Summary of Key Points\n> - \n\n";
    body += "> [!context]\n> %%How this relates to other work%%\n> - \n\n";
    body += "> [!significance]\n> %%Why this matters to me%%\n> - \n\n";
    body += "> [!related] Cited References\n> - \n";

    return { noteTitle, yamlFields, body };
};
