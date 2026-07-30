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
// both are videos on disk (see CLAUDE.md's filename-prefix table). `folder` is
// likewise shared by those two — one destination, "01 - Sources/Videos".
//
// `folder` is the note's filing destination, read by moveSourceNote.js rather
// than by capture: capture always lands notes in "00 - Inbox" on purpose, and
// filing is a separate, deliberate action (issue #37). Thought carries null —
// it is the one row that is not a source, so it has nowhere to be filed to and
// the move command exempts it. Podcasts/ and Tweets/ do not exist in a fresh
// vault; moveSourceNote creates a missing destination on first use.
const TYPE_REGISTRY = [
    { name: "Book",    icon: "📚 Book",    tag: "source/book",    prefix: "{", folder: "01 - Sources/Books",    capturer: "sourceCaptureBook" },
    { name: "Article", icon: "📰 Article", tag: "source/article", prefix: "(", folder: "01 - Sources/Articles", capturer: "sourceCaptureArticle" },
    { name: "Paper",   icon: "📜 Paper",   tag: "source/paper",   prefix: "&", folder: "01 - Sources/Papers",   capturer: "sourceCapturePaper" },
    { name: "YouTube", icon: "🎥 YouTube", tag: "source/youtube", prefix: "+", folder: "01 - Sources/Videos",   capturer: "sourceCaptureYoutube" },
    { name: "Video",   icon: "🎬 Video",   tag: "source/video",   prefix: "+", folder: "01 - Sources/Videos",   capturer: "sourceCaptureVideo" },
    { name: "Podcast", icon: "🎧 Podcast", tag: "source/podcast", prefix: "%", folder: "01 - Sources/Podcasts", capturer: "sourceCapturePodcast" },
    { name: "Tweet",   icon: "🐦 Tweet",   tag: "source/tweet",   prefix: "!", folder: "01 - Sources/Tweets",   capturer: "sourceCaptureTweet" },
    { name: "Thought", icon: "💭 Thought", tag: "note/thought",   prefix: "=", folder: null,                    capturer: "sourceCaptureThought" },
    { name: "Lecture", icon: "🎓 Lecture", tag: "source/lecture", prefix: "§", folder: "01 - Sources/Lectures", capturer: "sourceCaptureLecture" },
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

// The registry's public accessor. Two callers:
//   - the test suite, to check registry completeness without restating the rows;
//   - moveSourceNote.js at runtime, as tp.user.sourceCaptureOrchestrator
//     .typeRegistry(), which is how the type->folder mapping stays defined in
//     exactly one place.
//
// That runtime path works because Templater's user-script loader stores a
// function export *raw* — `if (typeof l === "function") map.set(basename, l)`,
// then Object.fromEntries onto tp.user — so properties hanging off the exported
// function survive onto tp.user. Verified by reading the shipped Templater
// bundle, not assumed.
//
// A function (not a plain object) because that same loader rejects an exported
// object with any non-function property (see CHANGELOG 2.2.0, periodicNoteHelpers).
// Hands out copies so callers can't mutate the registry.
module.exports.typeRegistry = function typeRegistry() {
    return TYPE_REGISTRY.map(row => ({ ...row }));
};
