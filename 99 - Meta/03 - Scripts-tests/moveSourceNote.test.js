/*
 * Tests for moveSourceNote.js — the command that files the active note out of
 * "00 - Inbox" into its type folder under "01 - Sources" (issue #37).
 *
 * Two surfaces are driven separately:
 *   - resolveType, directly, as a table over all nine registry types plus the
 *     shapes frontmatter `tags` can legitimately take;
 *   - the module itself, through mocked app/Notice, asserting the rename that
 *     came out (or that none did).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const moveSourceNote = require("../02 - Scripts/moveSourceNote.js");
const orchestrator = require("../02 - Scripts/sourceCaptureOrchestrator.js");
const { installMockNotice, installMockApp } = require("./_testUtils.js");

const REGISTRY = orchestrator.typeRegistry();

// Builds an active file the way capture leaves one: sitting in 00 - Inbox,
// named "<prefix> <title>.md".
function inboxNote(prefix, title, { folder = "00 - Inbox" } = {}) {
    const basename = prefix ? `${prefix} ${title}` : title;
    return {
        path: `${folder}/${basename}.md`,
        basename,
        name: `${basename}.md`,
        extension: "md",
        parent: { path: folder },
    };
}

// Installs the mocked globals and returns the handles a test asserts on.
// `frontmatter` is registered against the active file's path, which is where
// app.metadataCache.getFileCache reads it from.
function setup({ file, frontmatter, folders = {}, files = {} } = {}) {
    const notices = installMockNotice();
    const seeded = { ...files };
    if (file && frontmatter !== undefined) seeded[file.path] = { frontmatter };
    const app = installMockApp({ folders, files: seeded, activeFile: file });
    // tp is only ever used to reach the registry — the mapping lives in the
    // orchestrator, so this mirrors the real tp.user wiring rather than
    // restating the folders here.
    const tp = { user: { sourceCaptureOrchestrator: orchestrator } };
    return { tp, app, notices };
}

// --- the registry's folder column ---

test("every type except Thought carries its documented destination folder", () => {
    const EXPECTED_FOLDER = {
        Book: "01 - Sources/Books",
        Article: "01 - Sources/Articles",
        Paper: "01 - Sources/Papers",
        YouTube: "01 - Sources/Videos",
        Video: "01 - Sources/Videos",
        Podcast: "01 - Sources/Podcasts",
        Tweet: "01 - Sources/Tweets",
        Thought: null,
        Lecture: "01 - Sources/Lectures",
    };
    const actual = Object.fromEntries(REGISTRY.map(row => [row.name, row.folder]));
    assert.deepEqual(actual, EXPECTED_FOLDER);
});

test("Thought is the only type with no destination", () => {
    const without = REGISTRY.filter(row => !row.folder).map(row => row.name);
    assert.deepEqual(without, ["Thought"], "only the non-source type is exempt");
});

test("every destination sits under 01 - Sources", () => {
    for (const row of REGISTRY.filter(r => r.folder)) {
        assert.match(row.folder, /^01 - Sources\/[A-Za-z]+$/, `${row.name} folder`);
    }
});

// --- type resolution ---

test("resolves every type from its frontmatter tag", () => {
    for (const row of REGISTRY) {
        const file = inboxNote(row.prefix, "Some Title");
        const resolved = moveSourceNote.resolveType(REGISTRY, file, { tags: row.tag });
        assert.equal(resolved && resolved.name, row.name, `${row.name} by tag`);
    }
});

test("resolves from the filename prefix when there is no frontmatter", () => {
    const file = inboxNote("{", "Atomic Habits");
    const resolved = moveSourceNote.resolveType(REGISTRY, file, undefined);
    assert.equal(resolved.name, "Book");
});

test("the shared + prefix resolves to one destination, so its ambiguity is unobservable", () => {
    // Video and YouTube both use "+". The prefix fallback can only return one
    // of them — which is fine precisely because they file to the same folder.
    const file = inboxNote("+", "Some Talk");
    const resolved = moveSourceNote.resolveType(REGISTRY, file, undefined);
    assert.ok(["YouTube", "Video"].includes(resolved.name));
    assert.equal(resolved.folder, "01 - Sources/Videos");
});

test("frontmatter wins over the filename prefix when they disagree", () => {
    // A note renamed by hand shouldn't be filed by its stale prefix.
    const file = inboxNote("{", "Actually A Paper");
    const resolved = moveSourceNote.resolveType(REGISTRY, file, { tags: "source/paper" });
    assert.equal(resolved.name, "Paper");
});

test("accepts every shape frontmatter tags legitimately take", () => {
    const file = inboxNote("{", "Atomic Habits");
    const shapes = [
        { tags: "source/paper" },                    // scalar, as capture writes it
        { tags: ["source/paper"] },                  // YAML list
        { tags: ["note/other", "source/paper"] },     // list, not first
        { tags: "note/other, source/paper" },         // comma-separated scalar
        { tags: "#source/paper" },                    // hash-prefixed
        { tag: "source/paper" },                      // singular key
    ];
    for (const frontmatter of shapes) {
        const resolved = moveSourceNote.resolveType(REGISTRY, file, frontmatter);
        assert.equal(resolved && resolved.name, "Paper", JSON.stringify(frontmatter));
    }
});

test("an unrecognised note resolves to nothing", () => {
    const file = inboxNote("", "Meeting Notes");
    assert.equal(moveSourceNote.resolveType(REGISTRY, file, { tags: "note/fleeting" }), null);
});

test("a note whose type frontmatter says only \"source\" still resolves by tag", () => {
    // buildBaseYaml writes type: source for all eight source types, so `type`
    // can never identify one — the tag has to carry it.
    const file = inboxNote("%", "Some Episode");
    const resolved = moveSourceNote.resolveType(REGISTRY, file, { type: "source", tags: "source/podcast" });
    assert.equal(resolved.name, "Podcast");
});

// --- the move ---

test("moves a captured note into its type folder", async () => {
    const file = inboxNote("{", "Atomic Habits");
    const { tp, app } = setup({
        file,
        frontmatter: { tags: "source/book" },
        folders: { "01 - Sources/Books": [] },
    });

    await moveSourceNote(tp);

    assert.deepEqual(app.renames, [{
        from: "00 - Inbox/{ Atomic Habits.md",
        to: "01 - Sources/Books/{ Atomic Habits.md",
    }]);
});

test("moves via the file manager, so inbound wikilinks are rewritten", async () => {
    // Asserting the seam rather than the effect: a raw vault.rename would move
    // the file and silently break every [[link]] pointing at it.
    const file = inboxNote("&", "On Bullshit");
    const { tp, app } = setup({
        file,
        frontmatter: { tags: "source/paper" },
        folders: { "01 - Sources/Papers": [] },
    });

    await moveSourceNote(tp);

    assert.equal(app.renames.length, 1, "went through fileManager.renameFile");
    assert.deepEqual(app.created, [], "no raw vault write");
});

test("creates a missing destination folder rather than throwing", async () => {
    // Podcasts/ ships in no vault — it is born the first time one is filed.
    const file = inboxNote("%", "Some Episode");
    const { tp, app } = setup({ file, frontmatter: { tags: "source/podcast" } });

    await moveSourceNote(tp);

    assert.deepEqual(app.createdFolders, ["01 - Sources/Podcasts"]);
    assert.equal(app.renames[0].to, "01 - Sources/Podcasts/% Some Episode.md");
});

test("does not recreate a destination folder that already exists", async () => {
    const file = inboxNote("(", "Some Article");
    const { tp, app } = setup({
        file,
        frontmatter: { tags: "source/article" },
        folders: { "01 - Sources/Articles": [] },
    });

    await moveSourceNote(tp);

    assert.deepEqual(app.createdFolders, []);
});

test("YouTube and Video both land in Videos", async () => {
    for (const tag of ["source/youtube", "source/video"]) {
        const file = inboxNote("+", "Some Talk");
        const { tp, app } = setup({ file, frontmatter: { tags: tag } });
        await moveSourceNote(tp);
        assert.equal(app.renames[0].to, "01 - Sources/Videos/+ Some Talk.md", tag);
    }
});

test("leaves the note's frontmatter untouched", async () => {
    const file = inboxNote("{", "Atomic Habits");
    const { tp, app } = setup({ file, frontmatter: { tags: "source/book", status: "inbox" } });

    await moveSourceNote(tp);

    assert.deepEqual(app.frontmatterEdits, [], "filing is a move, not an edit");
});

// --- the no-op paths ---

test("a Thought note is exempt: nothing moves, and it says why", async () => {
    const file = inboxNote("=", "A Passing Idea");
    const { tp, app, notices } = setup({ file, frontmatter: { tags: "note/thought" } });

    await moveSourceNote(tp);

    assert.deepEqual(app.renames, []);
    assert.deepEqual(app.createdFolders, []);
    assert.ok(notices.some(m => /aren't sources/i.test(m)), `got: ${notices.join(" | ")}`);
});

test("an unrecognised note is a no-op with a Notice, not an error", async () => {
    const file = inboxNote("", "Meeting Notes");
    const { tp, app, notices } = setup({ file, frontmatter: { tags: "note/fleeting" } });

    await moveSourceNote(tp);

    assert.deepEqual(app.renames, []);
    assert.ok(notices.some(m => /isn't a recognised source note/i.test(m)), `got: ${notices.join(" | ")}`);
});

test("a note already in its type folder is not moved again", async () => {
    const file = inboxNote("{", "Atomic Habits", { folder: "01 - Sources/Books" });
    const { tp, app, notices } = setup({
        file,
        frontmatter: { tags: "source/book" },
        folders: { "01 - Sources/Books": [] },
    });

    await moveSourceNote(tp);

    assert.deepEqual(app.renames, [], "renaming a file onto its own path would throw");
    assert.ok(notices.some(m => /already filed/i.test(m)), `got: ${notices.join(" | ")}`);
});

test("a name collision at the destination stops the move and names the problem", async () => {
    const file = inboxNote("{", "Atomic Habits");
    const { tp, app, notices } = setup({
        file,
        frontmatter: { tags: "source/book" },
        folders: { "01 - Sources/Books": [] },
        files: { "01 - Sources/Books/{ Atomic Habits.md": { frontmatter: {} } },
    });

    await moveSourceNote(tp);

    assert.deepEqual(app.renames, [], "must not clobber the existing note");
    assert.ok(notices.some(m => /already exists/i.test(m)), `got: ${notices.join(" | ")}`);
});

test("no active note is a no-op with a Notice", async () => {
    const notices = installMockNotice();
    installMockApp({ activeFile: null });
    // installMockApp treats a null activeFile as "use the default", so override
    // getActiveFile directly to model the no-open-note case.
    globalThis.app.workspace.getActiveFile = () => null;
    const tp = { user: { sourceCaptureOrchestrator: orchestrator } };

    await moveSourceNote(tp);

    assert.ok(notices.some(m => /no active note/i.test(m)), `got: ${notices.join(" | ")}`);
});
