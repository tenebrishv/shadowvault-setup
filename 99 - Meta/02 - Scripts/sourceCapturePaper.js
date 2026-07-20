/*
 * Paper capture: DOI auto-fetch (CrossRef) with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCapturePaper(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField, fetchWithFallback } = helpers;
    const doi = await optionalPrompt(tp, "DOI (e.g. 10.1000/xyz123)");

    const data = await fetchWithFallback(tp, {
        label: "paper metadata from DOI",
        skip: !doi,
        fetch: async () => {
            const json = await helpers.httpGetJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
            const msg = json.message;
            if (!msg.title || !msg.title[0]) throw new Error("No title in response");
            return {
                doi,
                title: msg.title[0],
                authors: msg.author ? msg.author.map(a => a.given + " " + a.family).join(", ") : "",
                publish_date: msg.created ? msg.created["date-parts"][0][0].toString() : "",
                publisher: msg.publisher || "",
                keywords: msg.subject ? msg.subject.join(", ") : "",
                abstract: msg.abstract || "",
            };
        },
        fillGaps: async (d) => ({
            ...d,
            keywords: d.keywords || await optionalPrompt(tp, "Keywords (comma-separated)"),
            abstract: d.abstract || await optionalPrompt(tp, "Abstract (brief)"),
        }),
        manual: async () => {
            const title = await requiredPrompt(tp, "Paper Title");
            if (!title) return null;
            const authors = await requiredPrompt(tp, "Author(s)");
            if (!authors) return null;
            return {
                title,
                authors,
                doi: doi || await optionalPrompt(tp, "DOI"),
                publish_date: await datePrompt(tp, "Year Published"),
                keywords: await optionalPrompt(tp, "Keywords"),
                abstract: await optionalPrompt(tp, "Abstract"),
            };
        },
    });
    if (!data) return null;

    const noteTitle = data.title;

    let yamlFields = "";
    yamlFields += yamlField("authors", data.authors);
    yamlFields += yamlField("doi", data.doi);
    yamlFields += yamlField("citekey", data.citekey);
    yamlFields += yamlField("url", data.url);
    yamlFields += yamlField("publish_date", data.publish_date);
    yamlFields += yamlField("keywords", data.keywords);
    yamlFields += yamlField("general_subject", data.general_subject);

    let body = "> [!abstract]\n> " + (data.abstract || "") + "\n\n";
    body += "> [!hypothesis]\n> hypothesis::\n\n";
    body += "> [!methodology]\n> methodology::\n\n";
    body += "> [!result] Result(s)\n> results::\n\n";
    body += "> [!summary] Summary of Key Points\n> summary::\n\n";
    body += "## Notes\n\n";
    body += "| Highlight | Meaning |\n";
    body += "| --- | --- |\n";
    body += "| Orange | Important point by author |\n";
    body += "| Green  | Important to me |\n";
    body += "| Red    | Disagree with author |\n";
    body += "| Purple | Follow-up needed |\n";
    body += "| Blue   | Notes added later |\n\n";
    body += "- \n\n";
    body += "> [!context]\n> context::\n\n";
    body += "> [!significance]\n> significance::\n";

    return { noteTitle, yamlFields, body };
};
