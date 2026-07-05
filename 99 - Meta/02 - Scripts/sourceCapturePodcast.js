/*
 * Podcast capture: fully manual.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCapturePodcast(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField } = helpers;
    const data = {};

    data.title = await requiredPrompt(tp, "Episode Title");
    if (!data.title) return null;
    data.host = await optionalPrompt(tp, "Host");
    data.guest = await optionalPrompt(tp, "Guest(s)");
    data.url = await optionalPrompt(tp, "Episode URL");
    data.publish_date = await datePrompt(tp, "Date Published");
    data.general_subject = await optionalPrompt(tp, "Subject / Topic");
    const noteTitle = data.title;

    let yamlFields = "";
    yamlFields += yamlField("host", data.host);
    yamlFields += yamlField("guest", data.guest);
    yamlFields += yamlField("url", data.url);
    yamlFields += yamlField("publish_date", data.publish_date);
    yamlFields += yamlField("general_subject", data.general_subject);

    let body = "> [!meta]- Metadata\n";
    body += "> host:: " + (data.host || "") + "\n";
    body += "> guest:: " + (data.guest || "") + "\n";
    body += "> url:: " + (data.url || "") + "\n";
    body += "> published:: " + (data.publish_date || "") + "\n\n";
    body += "---\n\n## Notes\n\n";
    body += "%% [mm:ss](" + (data.url || "url") + "?t=0) - Timestamp note %%\n\n- \n";

    return { noteTitle, yamlFields, body };
};
