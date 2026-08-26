// SPDX-License-Identifier: AGPL-3.0-only
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
// Movie takes "~" rather than the more obvious "?", which is illegal on Windows
// and stripped by ILLEGAL_TITLE_CHARS; sharing "+" with Video would break
// moveSourceNote's prefix fallback, since their folders differ. Series takes
// "»" — "@" is reserved for people notes.
//
// Series' tag is `source/episode`, not `source/series`: the captured note IS an
// episode. The series and season are MOCs in "04 - MOCS/Series" and
// "04 - MOCS/Seasons", not sources, and the episode points at both with flat
// wikilinks (ADR 0013).
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
    { name: "Movie",   icon: "🎞️ Movie",   tag: "source/movie",   prefix: "~", folder: "01 - Sources/Movies",   capturer: "sourceCaptureMovie" },
    { name: "Series",  icon: "📺 Series",  tag: "source/episode", prefix: "»", folder: "01 - Sources/Series",   capturer: "sourceCaptureSeries" },
];

// How long the deferred rename waits for Templater to put the note on disk,
// and how often it looks. Five seconds is far past any observed write; the
// timeout exists so a note that never lands still gets its filename rather
// than leaving the poll spinning forever.
const WRITE_POLL_MS = 50;
const WRITE_TIMEOUT_MS = 5000;

// Set by each run so the test suite can await the rename this module
// deliberately does not await. See the pendingRename() accessor at the bottom.
let renameTask = null;

// Renames the captured note ONLY ONCE its body is on disk.
//
// Templater writes the note AFTER this module returns, and it writes it in two
// pieces: `append_template_to_active_file` splits tR into frontmatter and body,
// pushes the body through `editor.replaceSelection`, hands the frontmatter to
// `metadataEditor.insertProperties`, then waits 100ms and calls `view.save()`.
// Renaming the open note from inside the template lands a file-rename event in
// the middle of that window; Obsidian reloads the view from disk, the reload
// wins over the not-yet-saved editor buffer, and the note is left with the
// properties (which went to the file, not the buffer) and NO body — with no
// error, because nothing threw. Lecture capture is where this shows up
// reliably: its three stub creations and two processFrontMatter writes back up
// the file-event queue enough to push the rename's reload into that 100ms gap.
//
// So the rename is handed to a background task instead of awaited, and that
// task waits for the body to appear on disk before touching the filename.
// `marker` is the note's first body line — its presence is what "Templater has
// finished writing" looks like from outside.
//
// Polling is skipped when app.vault.read is unavailable: that is the unit test
// environment, whose fake vault holds no file contents. Same runtime-detection
// fallback, for the same reason, as sourceCaptureHelpers.httpGetJson's
// requestUrl/fetch branch.
async function renameAfterWrite(file, newPath, marker) {
    const canPoll = Boolean(marker) && typeof app.vault.read === "function";
    const deadline = Date.now() + WRITE_TIMEOUT_MS;
    for (;;) {
        // Wait FIRST, unconditionally — an await placed after the check would
        // let the degraded no-poll path rename synchronously, right back inside
        // the template run this whole function exists to get out of.
        await new Promise(resolve => setTimeout(resolve, WRITE_POLL_MS));
        if (!canPoll) break;
        let onDisk = "";
        // A read mid-write is a reason to look again, not to give up.
        try { onDisk = await app.vault.read(file); } catch (e) { onDisk = ""; }
        if (onDisk.includes(marker) || Date.now() >= deadline) break;
    }
    // This runs outside Templater's error wrapper now, so a failed rename must
    // report itself — otherwise it is an unhandled rejection in the console and
    // a note that silently kept its "Untitled" name.
    try {
        await app.fileManager.renameFile(file, newPath);
    } catch (e) {
        new Notice(`Captured the note, but could not rename it: ${e.message}`, 5000);
    }
}

// Returns the assembled note as a string for the template to assign to tR,
// or "" when the user cancelled (at the type picker or inside a module).
module.exports = async function sourceCaptureOrchestrator(tp) {
    renameTask = null;
    const helpers = tp.user.sourceCaptureHelpers;

    // Captured before dispatch, and held for the whole run: Lecture and Series
    // capture create stub notes along the way, and the rename below is deferred
    // past the end of the template, so "the note we started in" has to be a
    // reference taken now rather than another getActiveFile() call later.
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

    // --- STEP 4: RENAME FILE (deferred — deliberately not awaited) ---

    if (noteTitle) {
        const clean = helpers.sanitizeTitle(noteTitle);
        const newPath = `${originalFile.parent.path}/${type.prefix} ${clean}.md`;
        const marker = String(body || "").trim().split("\n")[0];
        renameTask = renameAfterWrite(originalFile, newPath, marker);
    }

    return note;
};

// The in-flight deferred rename, or null when the last run had nothing to
// rename. Exists for the test suite, which needs a handle on the one piece of
// work this module intentionally leaves running after it returns. A function,
// like typeRegistry() below, because Templater's user-script loader rejects
// modules with non-function exports.
module.exports.pendingRename = function pendingRename() {
    return renameTask;
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
