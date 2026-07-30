/*
 * MOVE SOURCE NOTE — files the active note out of "00 - Inbox" into its type
 * folder under "01 - Sources".
 *
 * Exposed to the template as tp.user.moveSourceNote; "(TEMPLATE) Move Source
 * Note.md" is a one-line adapter that awaits this inside a <%* %> block and
 * emits nothing, so running it never writes text into the note.
 *
 * Capture deliberately leaves every note in "00 - Inbox" (the Inbox is the
 * review staging area). This is the separate, opt-in action that files one —
 * bound to a hotkey via Templater's Template Hotkeys, run when the reader
 * decides the note is ready, not automatically on capture.
 *
 * Why it matters beyond tidiness (issue #37): the v2.14.0 hub queries are
 * folder-scoped, so a note still sitting in the Inbox is invisible to its own
 * hub — which reads as a broken query rather than a misfiled note.
 *
 * The type -> folder mapping is NOT restated here. It is the `folder` field on
 * TYPE_REGISTRY in sourceCaptureOrchestrator.js, read through that module's
 * typeRegistry() accessor, so capture and filing can never disagree about
 * where a type belongs.
 */

// Frontmatter tags, normalised to a bare string array.
//
// Capture writes `tags: source/book` — a scalar, not a list — but a reader may
// well have edited it into a YAML list, or added a `#`. Accept every shape
// rather than only the one capture happens to emit.
function frontmatterTags(frontmatter) {
    if (!frontmatter) return [];
    const raw = frontmatter.tags ?? frontmatter.tag;
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : String(raw).split(",");
    return list
        .map(t => String(t).trim().replace(/^#/, ""))
        .filter(Boolean);
}

// Resolves which registry row a file belongs to, or null if none does.
//
// Frontmatter tags first, filename prefix as the fallback. Note that the `type`
// frontmatter field is NOT usable here despite naming the concept: buildBaseYaml
// writes only "source" or "thought" into it, never the specific type, so the tag
// is the only field that distinguishes a Book from a Podcast.
//
// The prefix fallback is ambiguous for "+", which Video and YouTube share — but
// those two file to the same folder, so every ambiguous case resolves to the
// same destination and the ambiguity is unobservable.
function resolveType(registry, file, frontmatter) {
    const tags = frontmatterTags(frontmatter);
    const byTag = registry.find(row => tags.includes(row.tag));
    if (byTag) return byTag;

    const firstChar = (file.basename || "").charAt(0);
    if (!firstChar) return null;
    return registry.find(row => row.prefix === firstChar) || null;
}

module.exports = async function moveSourceNote(tp) {
    const file = app.workspace.getActiveFile();
    if (!file) {
        new Notice("No active note to file.", 3000);
        return;
    }

    const registry = tp.user.sourceCaptureOrchestrator.typeRegistry();
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    const type = resolveType(registry, file, frontmatter);

    if (!type) {
        new Notice(`"${file.basename}" isn't a recognised source note — nothing moved.`, 4000);
        return;
    }

    // Thought is the one registry row that isn't a source: it has no folder
    // under "01 - Sources" to be filed into, so the command is a deliberate
    // no-op rather than an error.
    if (!type.folder) {
        new Notice(`${type.name} notes aren't sources — nothing to file.`, 4000);
        return;
    }

    if (file.parent && file.parent.path === type.folder) {
        new Notice(`Already filed in ${type.folder}.`, 3000);
        return;
    }

    // Create the destination rather than erroring on it: Podcasts/ and Tweets/
    // don't ship in the vault, so they come into existence the first time one
    // is filed, and the command works in a fresh vault.
    if (!app.vault.getAbstractFileByPath(type.folder)) {
        try {
            await app.vault.createFolder(type.folder);
        } catch (e) {
            // Someone else created it between the check and the call — that's
            // the outcome we wanted anyway. Anything else is a real failure.
            if (!app.vault.getAbstractFileByPath(type.folder)) {
                new Notice(`Could not create ${type.folder}: ${e.message}`, 5000);
                return;
            }
        }
    }

    const destination = `${type.folder}/${file.name}`;
    if (app.vault.getAbstractFileByPath(destination)) {
        new Notice(`"${file.name}" already exists in ${type.folder} — rename one of them first.`, 5000);
        return;
    }

    // fileManager.renameFile, never vault.rename: only the file manager rewrites
    // the wikilinks pointing at this note. A raw vault rename would move the
    // file and silently break every inbound link.
    try {
        await app.fileManager.renameFile(file, destination);
    } catch (e) {
        new Notice(`Could not move "${file.name}": ${e.message}`, 5000);
        return;
    }

    new Notice(`Filed ${type.name} note into ${type.folder}`, 3000);
};

// Exposed for the unit suite, which drives type resolution directly across all
// nine types instead of only through the app-mocked move path. A function, per
// Templater's non-function-export rule (see sourceCaptureOrchestrator.js).
module.exports.resolveType = resolveType;
