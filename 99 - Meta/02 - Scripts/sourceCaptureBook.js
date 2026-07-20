/*
 * Book capture: ISBN auto-fetch (Open Library) with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */

// Open Library's API returns 429 to any User-Agent matching /obsidian/i,
// regardless of request rate — so requestUrl's default UA (which contains
// "obsidian") is refused every time. This descriptive UA identifies the app
// per Open Library's stated policy while staying clear of that filter.
const OPEN_LIBRARY_UA = "ShadowVault/2.9 (+https://github.com/tenebrishv/shadowvault-setup)";

// Open Library's publish_date is free text — "Sep 08, 2015", bare "2018",
// "October 16 2017" all occur. Floor it to the first 4-digit year so the field
// matches the YYYY the manual datePrompt enforces and stays sortable in Dataview
// (issue #25). CrossRef (Paper) already returns a clean year, so only Book needs
// this.
const yearFloor = (s) => (String(s ?? "").match(/\d{4}/) || [""])[0];

module.exports = async function sourceCaptureBook(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField, fetchWithFallback } = helpers;
    const isbn = await optionalPrompt(tp, "ISBN (if you have it)");

    const data = await fetchWithFallback(tp, {
        label: "book data from ISBN",
        skip: !isbn,
        fetch: async () => {
            // Use /api/books, not /isbn/<isbn>.json: the latter answers 302 to
            // the edition record, and its author entries are bare {key} refs
            // with no name, needing a second request per author to resolve.
            // This endpoint answers 200 and inlines author names.
            const payload = await helpers.httpGetJson(
                `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`,
                { headers: { "User-Agent": OPEN_LIBRARY_UA } },
            );
            // Keyed by the bibkey echoed back; an unknown ISBN yields {}.
            const info = payload[`ISBN:${isbn}`];
            if (!info || !info.title) throw new Error("No title in response");
            return {
                title: info.title,
                authors: info.authors ? info.authors.map(a => a.name).join(", ") : "",
                // Open Library's jscmd=data response carries the canonical work/
                // edition page URL — a free link back on the auto-fetch path (#23).
                url: info.url || "",
                publisher: info.publishers ? info.publishers[0].name : "",
                publish_date: yearFloor(info.publish_date),
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
                url: await optionalPrompt(tp, "URL  e.g. Open Library / publisher page"),
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
    yamlFields += yamlField("url", data.url);
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
