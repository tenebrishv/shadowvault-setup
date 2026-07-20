/*
 * Book capture: ISBN auto-fetch (Open Library) with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCaptureBook(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField, fetchWithFallback } = helpers;
    const isbn = await optionalPrompt(tp, "ISBN (if you have it)");

    const data = await fetchWithFallback(tp, {
        label: "book data from ISBN",
        skip: !isbn,
        fetch: async () => {
            const res = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
            if (!res.ok) throw new Error("Not found");
            const info = await res.json();
            if (!info.title) throw new Error("No title in response");
            return {
                title: info.title,
                authors: info.authors ? info.authors.map(a => a.name).join(", ") : "",
                publisher: info.publishers ? info.publishers[0] : "",
                publish_date: info.publish_date || "",
                // Open Library doesn't give a general subject, so keep it empty for now
                general_subject: "",
            };
        },
        fillGaps: async (d) => ({
            ...d,
            general_subject: d.general_subject || await optionalPrompt(tp, "General Subject"),
            publish_date: d.publish_date || await datePrompt(tp, "Year Published (if missing)"),
        }),
        manual: async () => {
            const title = await requiredPrompt(tp, "Book Title");
            if (!title) return null;
            const authors = await requiredPrompt(tp, "Author(s)");
            if (!authors) return null;
            return {
                title,
                authors,
                publish_date: await datePrompt(tp, "Year Published"),
                publisher: await optionalPrompt(tp, "Publisher"),
                general_subject: await optionalPrompt(tp, "General Subject"),
            };
        },
    });
    if (!data) return null;

    data.isbn = isbn;
    const noteTitle = data.title;
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
