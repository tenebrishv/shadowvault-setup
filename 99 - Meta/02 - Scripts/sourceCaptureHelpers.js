/*
 * Shared helpers for the Source Capture template family.
 * Exposed to templates as tp.user.sourceCaptureHelpers.<fn>
 */

async function requiredPrompt(tp, label) {
    let val = "";
    while (!val) {
        val = await tp.system.prompt("REQUIRED: " + label);
        if (val === null) { new Notice("Cancelled."); return null; }
        val = val.trim();
        if (!val) new Notice("This field is required.", 2000);
    }
    return val;
}

async function optionalPrompt(tp, label) {
    const hint = label + "  (Enter to skip)";
    const val = await tp.system.prompt(hint);
    if (val === null) return null;
    return val.trim();
}

async function datePrompt(tp, label) {
    const val = await optionalPrompt(tp, label + "  e.g. 2024  or  2024-06  or  2024-06-15");
    if (!val) return "";
    const ok = /^\d{4}(-\d{2}(-\d{2})?)?$/.test(val);
    if (!ok) new Notice("Date should be YYYY, YYYY-MM, or YYYY-MM-DD", 3000);
    return val;
}

// Renders a single optional YAML scalar field ("key: \"value\"\n" or "key:\n" when empty).
function yamlField(key, val) {
    if (val) return key + ": \"" + val + "\"\n";
    return key + ":\n";
}

// Builds the frontmatter fields common to every Source Capture note
// (opening "---" through "growth:"). Callers append their own type-specific
// fields, then the closing "---\n\n".
function buildBaseYaml(tp, { tag, typeName, noteTitle }) {
    const today = tp.date.now("YYYY-MM-DDTHH:mm");
    const id = tp.date.now("YYYYMMDDHHmm");
    const reviewDate = tp.date.now("YYYY-MM-DD", 14);
    const typeField = typeName === "Thought" ? "thought" : "source";

    let yaml = "---\n";
    yaml += "tags: " + tag + "\n";
    yaml += "publish: true\n";
    yaml += "aliases:\n  - \"" + (noteTitle || "") + "\"\n";
    yaml += "created: " + today + "\n";
    yaml += "id: " + id + "\n";
    yaml += "type: " + typeField + "\n";
    yaml += "review: " + reviewDate + "\n";
    yaml += "status: inbox\n";
    yaml += "growth: seedling\n";
    return yaml;
}

module.exports = {
    requiredPrompt,
    optionalPrompt,
    datePrompt,
    yamlField,
    buildBaseYaml,
};
