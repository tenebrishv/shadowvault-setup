/*
 * Thought capture: fully manual, freeform reflection note.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */
module.exports = async function sourceCaptureThought(tp, helpers) {
    const { requiredPrompt, optionalPrompt, yamlField } = helpers;
    const data = {};

    data.title = await requiredPrompt(tp, "Thought title - one sentence claim or question");
    if (!data.title) return null;
    data.context = await optionalPrompt(tp, "Relevant context");
    data.led_here = await optionalPrompt(tp, "What led me here?");
    const noteTitle = data.title;

    let yamlFields = "";
    yamlFields += yamlField("context", data.context);
    yamlFields += yamlField("led_here", data.led_here);

    let body = "## The Thought\n\n- \n\n";
    body += "### TL;DR\n\n- \n\n";
    body += "### Chew On It\n\n- \n\n";
    body += "### Refined\n\n- \n\n";
    body += "## Relevant Context\n\n" + (data.context || "- ") + "\n\n";
    body += "## What Led Me Here\n\n" + (data.led_here || "- ") + "\n";

    return { noteTitle, yamlFields, body };
};
