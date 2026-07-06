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
 *   - global Notice (no-op, records messages)
 *   - global fetch (scripted per test)
 *   - a fake app.vault / app.metadataCache (Lecture module only)
 *   - global moment (periodicNoteHelpers.js only — a chainable spy, not real
 *     calendar arithmetic; see installMockMoment)
 */

function createMockTp({ prompts = [], suggestions = [], fileTitle } = {}) {
    const promptQueue = [...prompts];
    const suggestionQueue = [...suggestions];
    const calls = { prompts: [], suggestions: [], renames: [] };

    return {
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

// Fake app.vault / app.metadataCache for the Lecture module.
// folders: { "04 - MOCS/Courses": ["Existing Course"] } - basenames present in that folder
// files:   { "04 - MOCS/Courses/Existing Course.md": { frontmatter: {...} } } - existence + frontmatter
function installMockApp({ folders = {}, files = {} } = {}) {
    const created = [];
    globalThis.app = {
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
        metadataCache: {
            getFileCache(file) {
                const meta = files[file.path];
                return meta ? { frontmatter: meta.frontmatter } : null;
            },
        },
    };
    return created;
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
