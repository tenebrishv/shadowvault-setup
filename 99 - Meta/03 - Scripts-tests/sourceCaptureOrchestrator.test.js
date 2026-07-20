/*
 * Tests for the Source Capture orchestrator — the type picker, registry
 * dispatch, note assembly, and file rename that used to live as untestable
 * Templater JS inside "(TEMPLATE) Source Capture.md".
 *
 * These drive the module through its real interface: script the type pick on
 * the mocked tp, hand it a stub capturer via tp.user, and assert the assembled
 * note plus the rename that came out. No assertions on internal call structure.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const orchestrator = require("../02 - Scripts/sourceCaptureOrchestrator.js");
const helpers = require("../02 - Scripts/sourceCaptureHelpers.js");
const { createMockTp, installMockNotice, installMockApp } = require("./_testUtils.js");

// Builds a tp whose tp.user carries the real shared helpers plus a stub
// capturer standing in for whichever per-type module the registry names.
function setup({ type, capture, activeFile } = {}) {
    const notices = installMockNotice();
    const app = installMockApp({ activeFile });
    const user = { sourceCaptureHelpers: helpers };

    // Register the stub under every capturer name the registry knows, so the
    // orchestrator resolves it whichever type the test picks.
    for (const row of orchestrator.typeRegistry()) {
        user[row.capturer] = async () => capture;
    }

    const tp = createMockTp({ suggestions: [type], user });
    return { tp, notices, app };
}

const CAPTURE = {
    noteTitle: "Atomic Habits",
    yamlFields: 'authors: "James Clear"\n',
    body: "## Notes\n\n- \n",
};

// --- registry completeness ---

test("registry covers all nine source types with one row each", () => {
    const rows = orchestrator.typeRegistry();
    const names = rows.map(r => r.name);

    assert.equal(rows.length, 9);
    assert.deepEqual(names, [
        "Book", "Article", "Paper", "YouTube", "Video",
        "Podcast", "Tweet", "Thought", "Lecture",
    ]);
    assert.equal(new Set(names).size, 9, "type names must be unique");
});

test("every registry row is fully populated", () => {
    // Prefixes are deliberately NOT unique: Video and YouTube share "+",
    // as documented in CLAUDE.md. Assert each prefix is a known one instead.
    const KNOWN_PREFIXES = new Set(["{", "(", "&", "+", "%", "!", "=", "§"]);
    for (const row of orchestrator.typeRegistry()) {
        assert.ok(row.name, "name");
        assert.match(row.icon, /\S/, `${row.name} icon`);
        assert.match(row.tag, /^(source|note)\//, `${row.name} tag`);
        assert.ok(KNOWN_PREFIXES.has(row.prefix), `${row.name} prefix "${row.prefix}" is a known prefix`);
        assert.match(row.capturer, /^sourceCapture\w+$/, `${row.name} capturer name`);
    }
});

test("every registry row names a capture module that exists on disk", () => {
    for (const row of orchestrator.typeRegistry()) {
        const mod = require(`../02 - Scripts/${row.capturer}.js`);
        assert.equal(typeof mod, "function", `${row.capturer} exports a capture function`);
    }
});

test("typeRegistry hands out copies, so callers cannot mutate the registry", () => {
    orchestrator.typeRegistry()[0].prefix = "MUTATED";
    assert.equal(orchestrator.typeRegistry()[0].prefix, "{");
});

// --- dispatch + assembly ---

test("assembles base frontmatter, the type's fields, and the body", async () => {
    const { tp } = setup({ type: "Book", capture: CAPTURE });

    const note = await orchestrator(tp);

    assert.match(note, /^---\ntags: source\/book\n/);
    assert.match(note, /type: source\n/);
    assert.match(note, /aliases:\n {2}- "Atomic Habits"\n/);
    assert.match(note, /authors: "James Clear"\n/);
    assert.ok(note.endsWith("---\n\n## Notes\n\n- \n"), "body follows the closing fence");
});

test("uses the registry's tag for the picked type", async () => {
    const { tp } = setup({ type: "Thought", capture: CAPTURE });
    const note = await orchestrator(tp);

    assert.match(note, /tags: note\/thought\n/);
    assert.match(note, /type: thought\n/, "Thought is the one type that isn't a source");
});

test("renames the note to the type prefix plus the sanitized title", async () => {
    const { tp, app } = setup({ type: "Book", capture: CAPTURE });

    await orchestrator(tp);

    assert.deepEqual(app.renames, [{
        from: "00 - Inbox/Untitled.md",
        to: "00 - Inbox/{ Atomic Habits.md",
    }]);
});

test("rename strips filename-illegal characters from the title", async () => {
    const { tp, app } = setup({
        type: "YouTube",
        capture: { ...CAPTURE, noteTitle: 'What?! A "Guide": part 1/2' },
    });

    await orchestrator(tp);

    assert.equal(app.renames[0].to, "00 - Inbox/+ What! A Guide part 12.md");
});

test("renames within the folder the note already lives in", async () => {
    const { tp, app } = setup({
        type: "Paper",
        capture: CAPTURE,
        activeFile: {
            path: "01 - Sources/Papers/Untitled.md",
            basename: "Untitled",
            extension: "md",
            parent: { path: "01 - Sources/Papers" },
        },
    });

    await orchestrator(tp);

    assert.equal(app.renames[0].to, "01 - Sources/Papers/& Atomic Habits.md");
});

test("skips the rename when the module returns no title", async () => {
    const { tp, app } = setup({ type: "Thought", capture: { ...CAPTURE, noteTitle: "" } });

    const note = await orchestrator(tp);

    assert.deepEqual(app.renames, [], "nothing to rename to");
    assert.ok(note.length > 0, "the note is still assembled");
});

// --- cancellation ---

test("cancelling the type picker produces no note and no rename", async () => {
    const { tp, app, notices } = setup({ type: null, capture: CAPTURE });

    const note = await orchestrator(tp);

    assert.equal(note, "");
    assert.deepEqual(app.renames, []);
    assert.ok(notices.some(m => /cancel/i.test(m)), "tells the user it cancelled");
});

test("a module returning null (user cancelled mid-capture) produces no note and no rename", async () => {
    const { tp, app } = setup({ type: "Book", capture: null });

    const note = await orchestrator(tp);

    assert.equal(note, "");
    assert.deepEqual(app.renames, []);
});
