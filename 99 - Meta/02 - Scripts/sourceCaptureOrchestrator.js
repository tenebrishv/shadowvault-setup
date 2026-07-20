/*
 * SOURCE CAPTURE — orchestrator.
 *
 * Exposed to the template as tp.user.sourceCaptureOrchestrator; the
 * "(TEMPLATE) Source Capture.md" body is a one-line adapter that awaits this
 * and assigns the result to tR. Living here rather than inside the template
 * means the dispatch/assembly/rename logic is reachable by the mocked-tp test
 * suite in "99 - Meta/03 - Scripts-tests/".
 *
 * Requires Templater's "User Scripts Folder" to point at "99 - Meta/02 - Scripts".
 * That folder sits outside the Templates folder deliberately — Templater's
 * "Insert Template" picker lists everything under templates_folder, so .js
 * files nested there would show up as selectable templates.
 *
 * Per-type capture logic (prompts / auto-fetch / YAML / body) lives in
 * sourceCapture<Type>.js. Each module is
 *   async (tp, helpers) => { noteTitle, yamlFields, body } | null
 * where null means the user cancelled. Shared prompt/YAML/title helpers live
 * in sourceCaptureHelpers.js.
 */

// The single type registry: one row per source type, replacing the five
// parallel TYPE_LABELS/TYPE_ICONS/TYPE_TAGS/TYPE_PREFIX/TYPE_CAPTURERS tables
// this module was extracted from. Adding a source type is one row here plus
// one sourceCapture<Type>.js module — nothing else.
//
// `capturer` is the user-script name, resolved through tp.user at call time
// rather than captured here, so the registry stays plain data.
//
// Prefixes are not unique: Video and YouTube deliberately share "+", since
// both are videos on disk (see CLAUDE.md's filename-prefix table).
const TYPE_REGISTRY = [
    { name: "Book",    icon: "📚 Book",    tag: "source/book",    prefix: "{", capturer: "sourceCaptureBook" },
    { name: "Article", icon: "📰 Article", tag: "source/article", prefix: "(", capturer: "sourceCaptureArticle" },
    { name: "Paper",   icon: "📜 Paper",   tag: "source/paper",   prefix: "&", capturer: "sourceCapturePaper" },
    { name: "YouTube", icon: "🎥 YouTube", tag: "source/youtube", prefix: "+", capturer: "sourceCaptureYoutube" },
    { name: "Video",   icon: "🎬 Video",   tag: "source/video",   prefix: "+", capturer: "sourceCaptureVideo" },
    { name: "Podcast", icon: "🎧 Podcast", tag: "source/podcast", prefix: "%", capturer: "sourceCapturePodcast" },
    { name: "Tweet",   icon: "🐦 Tweet",   tag: "source/tweet",   prefix: "!", capturer: "sourceCaptureTweet" },
    { name: "Thought", icon: "💭 Thought", tag: "note/thought",   prefix: "=", capturer: "sourceCaptureThought" },
    { name: "Lecture", icon: "🎓 Lecture", tag: "source/lecture", prefix: "§", capturer: "sourceCaptureLecture" },
];

// Returns the assembled note as a string for the template to assign to tR,
// or "" when the user cancelled (at the type picker or inside a module).
module.exports = async function sourceCaptureOrchestrator(tp) {
    const helpers = tp.user.sourceCaptureHelpers;

    // Captured before dispatch: Lecture capture creates and opens Course/Unit/
    // Person stubs along the way, so by the time we rename, the active file is
    // no longer the note we started in.
    const originalFile = app.workspace.getActiveFile();

    // --- STEP 1: SELECT TYPE ---

    const typeName = await tp.system.suggester(
        TYPE_REGISTRY.map(row => row.icon),
        TYPE_REGISTRY.map(row => row.name),
        true,
        "What type of source is this?",
    );
    if (!typeName) { new Notice("Cancelled."); return ""; }

    const type = TYPE_REGISTRY.find(row => row.name === typeName);
    if (!type) { new Notice(`Unknown source type: ${typeName}`, 3000); return ""; }

    // --- STEP 2: COLLECT FIELDS (delegated to the per-type module) ---

    const capture = tp.user[type.capturer];
    if (typeof capture !== "function") {
        new Notice(`Capture module "${type.capturer}" is not loaded. Run Templater's "Reload templates".`, 5000);
        return "";
    }

    const result = await capture(tp, helpers);
    if (!result) return "";
    const { noteTitle, yamlFields, body } = result;

    // --- STEP 3: BUILD NOTE ---

    const baseYaml = helpers.buildBaseYaml(tp, { tag: type.tag, typeName: type.name, noteTitle });
    const note = baseYaml + yamlFields + "---\n\n" + body;

    // --- STEP 4: RENAME FILE ---

    if (noteTitle) {
        const clean = helpers.sanitizeTitle(noteTitle);
        const newPath = `${originalFile.parent.path}/${type.prefix} ${clean}.md`;
        await app.fileManager.renameFile(originalFile, newPath);
    }

    return note;
};

// Exposed so the test suite can check registry completeness without restating
// the rows. A function (not a plain object) because Templater's User Scripts
// loader rejects modules with non-function exports (see CHANGELOG 2.2.0,
// periodicNoteHelpers). Hands out copies so callers can't mutate the registry.
module.exports.typeRegistry = function typeRegistry() {
    return TYPE_REGISTRY.map(row => ({ ...row }));
};
