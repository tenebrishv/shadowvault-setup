/*
 * Shared test doubles for the sourceCapture<Type>.js and
 * periodicNoteHelpers.js unit tests.
 * Not a test file itself (no ".test.js" suffix) so `node --test` won't try
 * to run it directly.
 *
 * These mock only the surface each module actually touches:
 *   - tp.system.prompt / tp.system.suggester (scripted answers, in call order)
 *   - tp.date.now (returns a deterministic marker instead of a real date)
 *   - tp.file.title / tp.file.rename (periodicNoteHelpers.js only)
 *   - tp.file.find_tfile / tp.file.create_new (Lecture stub creation)
 *   - global Notice (no-op, records messages)
 *   - global fetch (scripted per test)
 *   - a fake app.vault / app.metadataCache (Lecture module only)
 *   - global moment (periodicNoteHelpers.js only — a chainable spy, not real
 *     calendar arithmetic; see installMockMoment)
 */

// `templates`: template basenames tp.file.find_tfile should resolve.
// `vaultState`: the `state` handle returned by installMockApp — when given,
// tp.file.create_new registers the new note there so later
// app.vault.getAbstractFileByPath / processFrontMatter calls can find it.
// `user`: the tp.user.* surface — shared helpers plus per-type capture modules.
// The orchestrator resolves its capturer through this, so tests can hand it a
// stub capturer instead of driving a real module's prompts.
function createMockTp({ prompts = [], suggestions = [], fileTitle, templates = [], vaultState = null, user = null } = {}) {
    const promptQueue = [...prompts];
    const suggestionQueue = [...suggestions];
    const calls = { prompts: [], suggestions: [], renames: [], createNew: [] };

    return {
        ...(user ? { user } : {}),
        system: {
            async prompt(message) {
                calls.prompts.push(message);
                if (promptQueue.length === 0) {
                    throw new Error(`tp.system.prompt("${message}") called with no scripted answer left`);
                }
                return promptQueue.shift();
            },
            async suggester(displayItems, actualValues, throwOnCancel, placeholder) {
                calls.suggestions.push(placeholder);
                if (suggestionQueue.length === 0) {
                    throw new Error(`tp.system.suggester(${placeholder}) called with no scripted answer left`);
                }
                return suggestionQueue.shift();
            },
        },
        date: {
            // Deterministic stand-in: encodes its own arguments so assertions
            // can confirm the right format/offset was requested, without
            // needing to replicate Templater's real date formatting.
            now(format, offset) {
                return offset === undefined ? format : `${format}:${offset}`;
            },
        },
        file: {
            title: fileTitle,
            async rename(newTitle) {
                calls.renames.push(newTitle);
            },
            find_tfile(name) {
                if (!templates.includes(name)) return null;
                return { basename: name, extension: "md", path: `99 - Meta/00 - Templates/${name}.md` };
            },
            async create_new(template, filename, openNew, folder) {
                calls.createNew.push({ template: template.basename, filename, folder });
                const path = `${folder}/${filename}.md`;
                if (vaultState && !vaultState.files[path]) {
                    vaultState.files[path] = { frontmatter: {} };
                }
                return { path, basename: filename, extension: "md" };
            },
        },
        _calls: calls,
    };
}

// A minimal chainable spy standing in for the global `moment` used by
// periodicNoteHelpers.js. It does NOT reimplement real calendar arithmetic
// (trust moment.js for that — verify real dates by running the periodic
// note templates in Obsidian). It only records, as a deterministic marker
// string, which chain of operations (startOf/add/subtract) produced each
// formatted value, so tests can assert *what* the helper asked moment to do.
// `invalid`: input strings that should make `.isValid()` return false (used
// to simulate a filename that doesn't parse as a date, e.g. "Untitled").
function installMockMoment({ invalid = [] } = {}) {
    const constructed = [];
    function makeInstance(log, valid) {
        return {
            clone() { return makeInstance([...log], valid); },
            startOf(unit) { log.push(`startOf:${unit}`); return this; },
            add(amount, unit) { log.push(`add:${amount},${unit}`); return this; },
            subtract(amount, unit) { log.push(`subtract:${amount},${unit}`); return this; },
            format(fmt) { return `${log.join("|")}::${fmt}`; },
            isValid() { return valid; },
        };
    }
    globalThis.moment = (input, format, strict) => {
        constructed.push({ input, format, strict });
        const origin = input === undefined ? "now" : `parsed(${input},${format})`;
        const valid = input === undefined ? true : !invalid.includes(input);
        return makeInstance([origin], valid);
    };
    return constructed;
}

function installMockNotice() {
    const messages = [];
    globalThis.Notice = class {
        constructor(message) { messages.push(message); }
    };
    return messages;
}

function installMockFetch(handler) {
    globalThis.fetch = async (url, ...rest) => handler(url, ...rest);
}

function jsonResponse(data, { ok = true } = {}) {
    return { ok, json: async () => data };
}

function failingFetch() {
    installMockFetch(async () => { throw new Error("network error (mocked)"); });
}

// Fake app.vault / app.metadataCache / app.fileManager for the Lecture module.
// folders: { "04 - MOCS/Courses": ["Existing Course"] } - basenames present in that folder
// files:   { "04 - MOCS/Courses/Existing Course.md": { frontmatter: {...} } } - existence + frontmatter
// Returns { created, frontmatterEdits, renames, state, activeFile }:
//   created         — direct app.vault.create calls (should stay empty now that
//                     stubs are born from template files)
//   frontmatterEdits — every processFrontMatter application, as { path, frontmatter }
//   renames         — every fileManager.renameFile call, as { from, to }
//   state           — live { folders, files }; pass as createMockTp's vaultState
//   activeFile      — the file getActiveFile() returns
// `activeFile`: what app.workspace.getActiveFile() returns — the note the
// orchestrator renames once capture succeeds. Defaults to a note sitting in
// 00 - Inbox, which is where Source Capture is normally run.
function installMockApp({ folders = {}, files = {}, activeFile } = {}) {
    const created = [];
    const frontmatterEdits = [];
    const renames = [];
    const state = { folders, files };
    const active = activeFile ?? {
        path: "00 - Inbox/Untitled.md",
        basename: "Untitled",
        extension: "md",
        parent: { path: "00 - Inbox" },
    };
    globalThis.app = {
        workspace: {
            getActiveFile() { return active; },
        },
        vault: {
            getAbstractFileByPath(path) {
                if (folders[path] !== undefined) {
                    return {
                        children: folders[path].map(name => ({
                            basename: name,
                            extension: "md",
                            path: `${path}/${name}.md`,
                        })),
                    };
                }
                if (files[path]) {
                    return {
                        path,
                        basename: path.split("/").pop().replace(/\.md$/, ""),
                        extension: "md",
                    };
                }
                return null;
            },
            async create(path, content) {
                created.push({ path, content });
            },
        },
        fileManager: {
            async renameFile(file, newPath) {
                renames.push({ from: file.path, to: newPath });
            },
            async processFrontMatter(file, fn) {
                const entry = (files[file.path] ??= { frontmatter: {} });
                entry.frontmatter ??= {};
                fn(entry.frontmatter);
                frontmatterEdits.push({ path: file.path, frontmatter: { ...entry.frontmatter } });
            },
        },
        metadataCache: {
            getFileCache(file) {
                const meta = files[file.path];
                return meta ? { frontmatter: meta.frontmatter } : null;
            },
        },
    };
    return { created, frontmatterEdits, renames, state, activeFile: active };
}

module.exports = {
    createMockTp,
    installMockNotice,
    installMockFetch,
    jsonResponse,
    failingFetch,
    installMockApp,
    installMockMoment,
};
