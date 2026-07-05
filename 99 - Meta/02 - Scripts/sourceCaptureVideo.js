/*
 * Video capture (non-YouTube, e.g. Vimeo/Nebula): fully manual.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCaptureVideo(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField } = helpers;
    const data = {};

    data.title = await requiredPrompt(tp, "Video Title");
    if (!data.title) return null;
    data.source = await optionalPrompt(tp, "Platform / Source  e.g. Vimeo, Nebula");
    data.channel = await optionalPrompt(tp, "Channel / Creator");
    data.url = await optionalPrompt(tp, "URL");
    data.released = await datePrompt(tp, "Release Date");
    const noteTitle = data.title;

    let yamlFields = "";
    yamlFields += yamlField("source", data.source);
    yamlFields += yamlField("channel", data.channel);
    yamlFields += yamlField("url", data.url);
    yamlFields += yamlField("released", data.released);
    yamlFields += "watched: \"" + tp.date.now("YYYY-MM-DD") + "\"\n";

    let body = "> [!meta]- Metadata\n";
    body += "> source:: " + (data.url || "") + "\n";
    body += "> channel:: " + (data.channel || "") + "\n";
    body += "> platform:: " + (data.source || "") + "\n";
    body += "> released:: " + (data.released || "") + "\n";
    body += "> watched:: " + tp.date.now("YYYY-MM-DD") + "\n\n";
    body += "---\n\n- \n";

    return { noteTitle, yamlFields, body };
};
