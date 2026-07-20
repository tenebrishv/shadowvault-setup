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

// GETs a URL and returns parsed JSON, throwing on any non-2xx status.
//
// Uses Obsidian's requestUrl rather than the browser fetch. Templater user
// scripts run in the renderer at origin app://obsidian.md, so fetch enforces
// CORS — and an API that sets Access-Control-Allow-Origin on its success
// responses may omit it on its *error* pages (Open Library's 429 does). The
// browser then blocks the response before our code can read the status, so a
// rate-limit is indistinguishable from being offline and the real cause never
// reaches the console. requestUrl issues the request from Obsidian's main
// process, where CORS does not apply, and hands back the status either way.
//
// Falls back to fetch when requestUrl is undefined — that is the unit test
// environment (plain node), which has no Obsidian API to call.
async function httpGetJson(url) {
    if (typeof requestUrl === "function") {
        // throw: false so a 4xx/5xx returns normally and we raise our own error
        // with the status in it, rather than Obsidian's opaque one.
        const res = await requestUrl({ url, throw: false });
        if (res.status < 200 || res.status >= 300) {
            throw new Error(`HTTP ${res.status}`);
        }
        return res.json;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

// The try-fetch -> manual-fallback skeleton shared by every auto-fetching
// capture module (Book, Article, Paper, YouTube, Tweet), so the Notice wording
// and timing are defined once and cannot drift apart per type.
//
//   label    — noun phrase naming what's being fetched, used in both Notices
//              ("book data from ISBN" -> "Fetched book data from ISBN").
//   skip     — truthy to bypass the fetch entirely and go straight to manual
//              (e.g. the user supplied no ISBN/DOI to look up). No Notice.
//   fetch    — async () => data. Throw to trigger the manual fallback; that
//              includes a response that parsed fine but lacks essentials.
//   fillGaps — optional async (data) => data, run only after a good fetch, to
//              prompt for fields the API didn't supply.
//   manual   — async () => data, the full hand-entry path.
//
// fillGaps and manual return null when the user cancels a required prompt;
// that null propagates out, and callers treat it as "abort the capture".
async function fetchWithFallback(tp, { label, skip = false, fetch: doFetch, fillGaps, manual }) {
    if (!skip) {
        // Only the fetch itself is guarded. fillGaps runs *outside* the try:
        // it prompts the user, and a throw from a prompt must not be mistaken
        // for a failed fetch — that would announce "could not fetch", then
        // rerun the whole manual path and re-ask questions already answered.
        let data;
        let fetched = false;
        try {
            data = await doFetch();
            fetched = true;
        } catch (e) {
            new Notice("Could not fetch " + label + ". Enter details manually.", 3000);
        }
        if (fetched) {
            new Notice("Fetched " + label, 2000);
            return fillGaps ? await fillGaps(data) : data;
        }
    }
    return await manual();
}

// Characters that are illegal in filenames (Windows) or hostile to Obsidian
// link parsing (#, ^, [, ]). The single source of truth for title cleaning —
// this regex previously existed in five places in two incompatible variants.
const ILLEGAL_TITLE_CHARS = /[\\/:*?"<>|#^\[\]]/g;

// Cleans a fetched or prompted title into something safe to use as a filename.
// Strips illegal characters, folds any newlines into single spaces, and trims.
function sanitizeTitle(title) {
    if (!title) return "";
    return String(title)
        .replace(ILLEGAL_TITLE_CHARS, "")
        .replace(/\s*\n\s*/g, " ")
        .trim();
}

// Escapes a value for use inside a double-quoted YAML scalar.
//
// Every quoted field in a captured note is built by string concatenation, so a
// value containing a `"` used to close the scalar early and leave the rest as
// stray YAML — `- ""SHOUTED" rest"` — which makes Obsidian fail to parse the
// entire frontmatter block, not just that one field. Fetched titles are the
// common source: quoted headlines are ordinary in news and sports video titles.
//
// Backslash must be escaped first, or it would double-escape the backslashes
// this function itself introduces. Newlines are folded to spaces rather than
// escaped, matching sanitizeTitle's treatment of the same input.
function yamlQuote(val) {
    return String(val)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\s*\n\s*/g, " ");
}

// Renders a single optional YAML scalar field ("key: \"value\"\n" or "key:\n" when empty).
function yamlField(key, val) {
    if (val) return key + ": \"" + yamlQuote(val) + "\"\n";
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
    yaml += "aliases:\n  - \"" + yamlQuote(noteTitle || "") + "\"\n";
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
    httpGetJson,
    fetchWithFallback,
    sanitizeTitle,
    yamlQuote,
    yamlField,
    buildBaseYaml,
};
