/*
 * Paper capture: DOI auto-fetch (CrossRef) with manual fallback.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCapturePaper(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField } = helpers;
    const data = {};
    let noteTitle = "";

    data.doi = await optionalPrompt(tp, "DOI (e.g. 10.1000/xyz123)");
    if (data.doi) {
        try {
            const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(data.doi)}`);
            const json = await res.json();
            const msg = json.message;
            data.title = msg.title ? msg.title[0] : "";
            data.authors = msg.author ? msg.author.map(a => a.given + " " + a.family).join(", ") : "";
            data.publish_date = msg.created ? msg.created["date-parts"][0][0].toString() : "";
            data.publisher = msg.publisher || "";
            data.keywords = msg.subject ? msg.subject.join(", ") : "";
            data.abstract = msg.abstract || "";
            noteTitle = data.title;
            new Notice("Fetched paper metadata from DOI", 2000);
        } catch (e) {
            new Notice("DOI lookup failed. Enter details manually.", 3000);
        }
    }

    // If no title, fallback to manual
    if (!data.title) {
        data.title = await requiredPrompt(tp, "Paper Title");
        if (!data.title) return null;
        data.authors = await requiredPrompt(tp, "Author(s)");
        if (!data.authors) return null;
        data.doi = data.doi || await optionalPrompt(tp, "DOI");
        data.publish_date = await datePrompt(tp, "Year Published");
        data.keywords = await optionalPrompt(tp, "Keywords");
        data.abstract = await optionalPrompt(tp, "Abstract");
        noteTitle = data.title;
    } else {
        // fill optional fields if not from DOI
        data.keywords = data.keywords || await optionalPrompt(tp, "Keywords (comma-separated)");
        data.abstract = data.abstract || await optionalPrompt(tp, "Abstract (brief)");
    }

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
