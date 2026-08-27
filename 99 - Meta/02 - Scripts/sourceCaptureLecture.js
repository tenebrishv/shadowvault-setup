// SPDX-License-Identifier: AGPL-3.0-only
/*
 * Lecture capture: validated Course -> Unit -> Lecturer picker, creating
 * stub notes for any that don't exist yet, then the lecture details.
 * Stubs are born from the real template files via Templater, so the
 * templates stay the single source of note shape; this module only knows
 * template names plus the frontmatter fills the picker has already learned.
 * Returns { noteTitle, yamlFields, body }, or null if cancelled.
 */

const COURSE_FOLDER = "04 - MOCS/Courses";
const UNIT_FOLDER = "04 - MOCS/Units";
const AGENTS_FOLDER = "09 - Entities/Agents";
const PERSON_TAG = "agent/person";

const TEMPLATES = {
    course: "(TEMPLATE) Course MOC",
    unit: "(TEMPLATE) Unit MOC",
    person: "(TEMPLATE) Person",
};

async function getNotesInFolder(folderPath) {
    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (!folder || !folder.children) return [];
    return folder.children.filter(file => file.extension === "md");
}

function noteHasTag(file, tag) {
    const cache = app.metadataCache.getFileCache(file);
    const tags = cache?.frontmatter?.tags;
    if (!tags) return false;
    const list = Array.isArray(tags) ? tags : [tags];
    return list.some(t => String(t).trim() === tag);
}

async function getPersonNotes(folderPath) {
    const files = await getNotesInFolder(folderPath);
    return files.filter(file => noteHasTag(file, PERSON_TAG));
}

// Births a stub from its template file. `fills` are frontmatter values the
// picker already knows (e.g. the unit's course). Returns true if a note was
// actually created, false if it already existed.
async function createStub(tp, templateName, folder, name, fills) {
    const path = `${folder}/${name}.md`;
    if (app.vault.getAbstractFileByPath(path)) return false;

    const template = tp.file.find_tfile(templateName);
    if (!template) throw new Error(`Missing template: ${templateName}`);
    const file = (await tp.file.create_new(template, name, false, folder))
        ?? app.vault.getAbstractFileByPath(path);

    if (fills && file) {
        await app.fileManager.processFrontMatter(file, fm => Object.assign(fm, fills));
    }
    return true;
}

// Normalizes a link-valued frontmatter field to a bare note name. Accepts
// "Name", "[[Name]]", "[[Name|alias]]", and the nested-array shape YAML
// gives an unquoted [[Name]].
function linkTargetName(value) {
    if (!value) return "";
    const flat = Array.isArray(value) ? (value.flat(Infinity)[0] ?? "") : value;
    return String(flat)
        .replace(/^\s*\[\[/, "")
        .replace(/\]\]\s*$/, "")
        .split("|")[0]
        .trim();
}

// Returns { name, created } — `created` distinguishes a name the user just
// typed (about to become a filename, so it is cleaned here) from one picked
// off the list (an existing basename, already safe). Mirrors
// sourceCaptureSeries.js:65-72.
//
// `preferredFirst`, when given, is hoisted to the top of the otherwise
// alphabetical list so Obsidian's suggester highlights it by default (it
// auto-highlights the first row). The lecturer picker uses this to
// pre-select the course's `default_lecturer`; without it the in-place
// `.sort()` here would scatter that name back into alphabetical order.
async function pickOrCreate(tp, helpers, label, existingItems, preferredFirst = "") {
    const rest = existingItems.filter(item => item !== preferredFirst).sort();
    const ordered = preferredFirst ? [preferredFirst, ...rest] : rest;
    const choices = [...ordered, "➕ Create New"];
    const picked = await tp.system.suggester(choices, choices, false, label);
    if (!picked) return null;
    if (picked !== "➕ Create New") return { name: picked, created: false };

    const fresh = await helpers.requiredPrompt(tp, `New ${label}`);
    if (!fresh) return null;
    const clean = helpers.sanitizeTitle(fresh);
    if (!clean) {
        new Notice(`That ${label.toLowerCase()} name has no usable characters.`);
        return null;
    }
    return { name: clean, created: true };
}

// Unit notes are COURSE-QUALIFIED — "Cognitive Psychology – Unit 1", never
// "Unit 1".
//
// The Units folder is flat and createStub returns early when the path already
// exists, so a bare "Unit 1" typed under a second course silently adopts the
// FIRST course's unit note — which keeps pointing at that other course in its
// `course:` field, and whose Dataview list then mixes lectures from both.
// pickUnit's own course filter hides the collision rather than catching it: the
// colliding note is filtered out of the list you are shown, so "it isn't there"
// looks like a reason to create it. Unit names are generic by design ("Unidad
// 1", "U1", "todas"), which makes this the common case, not an edge one.
//
// Same fix, and the same shape, as sourceCaptureSeries.js's series-qualified
// season names (ADR 0013 §3, which recorded this bug as #58 and left it open).
// The separator is the en dash the vault already uses inside lecture titles.
//
// Already-qualified input is passed through untouched, so re-typing the name
// the picker showed you cannot build "Course – Course – Unit 1".
const UNIT_SEPARATOR = " – ";
const unitNoteName = (course, unit) =>
    unit.startsWith(course + UNIT_SEPARATOR) ? unit : `${course}${UNIT_SEPARATOR}${unit}`;

async function pickCourse(tp, helpers) {
    const courseFiles = await getNotesInFolder(COURSE_FOLDER);
    const picked = await pickOrCreate(tp, helpers, "Course", courseFiles.map(f => f.basename));
    if (!picked) return null;

    const course = picked.name;
    const coursePath = `${COURSE_FOLDER}/${course}.md`;
    const created = await createStub(tp, TEMPLATES.course, COURSE_FOLDER, course);
    return { course, coursePath, created };
}

async function pickUnit(tp, helpers, course) {
    const unitFiles = await getNotesInFolder(UNIT_FOLDER);
    const matchingUnits = unitFiles.filter(file => {
        const cache = app.metadataCache.getFileCache(file);
        const courseField = cache?.frontmatter?.course;
        if (!courseField) return false;
        return String(courseField).replaceAll("[[", "").replaceAll("]]", "").includes(course);
    });
    const picked = await pickOrCreate(tp, helpers, "Unit", matchingUnits.map(f => f.basename));
    if (!picked) return null;

    // Only a freshly typed name gets qualified. A picked one is already a note
    // in this course's list, whatever it happens to be called — including the
    // bare names any vault captured before this fix.
    const unit = picked.created ? unitNoteName(course, picked.name) : picked.name;
    await createStub(tp, TEMPLATES.unit, UNIT_FOLDER, unit, { course: `[[${course}]]` });
    return unit;
}

async function pickLecturer(tp, helpers, coursePath) {
    let defaultLecturer = "";
    const courseFile = app.vault.getAbstractFileByPath(coursePath);
    if (courseFile) {
        const cache = app.metadataCache.getFileCache(courseFile);
        defaultLecturer = linkTargetName(cache?.frontmatter?.default_lecturer);
    }

    const peopleFiles = await getPersonNotes(AGENTS_FOLDER);
    const peopleNames = peopleFiles.map(f => f.basename);
    // Keep the course's default lecturer on the list even when they have no
    // Person note yet; pickOrCreate then hoists them to the top so the
    // suggester lands on them by default.
    if (defaultLecturer && !peopleNames.includes(defaultLecturer)) {
        peopleNames.push(defaultLecturer);
    }

    const picked = await pickOrCreate(tp, helpers, "Lecturer", peopleNames, defaultLecturer);
    if (!picked) return null;

    const lecturer = picked.name;
    await createStub(tp, TEMPLATES.person, AGENTS_FOLDER, lecturer);
    return lecturer;
}

module.exports = async function sourceCaptureLecture(tp, helpers) {
    const { requiredPrompt, optionalPrompt, datePrompt, yamlField } = helpers;
    const data = {};

    const courseResult = await pickCourse(tp, helpers);
    if (!courseResult) return null;
    data.course = courseResult.course;

    data.unit = await pickUnit(tp, helpers, data.course);
    if (!data.unit) return null;

    data.lecturer = await pickLecturer(tp, helpers, courseResult.coursePath);
    if (!data.lecturer) return null;

    // A brand-new course self-populates its default lecturer from the first
    // capture, so the picker pre-selects them next time without hand-editing.
    if (courseResult.created) {
        const courseFile = app.vault.getAbstractFileByPath(courseResult.coursePath);
        if (courseFile) {
            await app.fileManager.processFrontMatter(courseFile, fm => {
                fm.default_lecturer = `[[${data.lecturer}]]`;
            });
        }
    }

    data.title = await requiredPrompt(tp, "Lecture Title");
    if (!data.title) return null;
    data.lecture_num = await optionalPrompt(tp, "Lecture Number");
    data.date_given = await datePrompt(tp, "Lecture Date");
    data.url = await optionalPrompt(tp, "Recording URL");
    data.keywords = await optionalPrompt(tp, "Keywords");

    // "§ YYYY-MM-DD – CourseCode – Lecture Title" (roadmap naming convention).
    // The "§ " prefix is added by the orchestrator template; noteTitle only
    // covers the date/course/title portion, since it's also reused as the
    // in-body heading (see sourceCaptureTweet.js for the same pattern).
    const datePart = data.date_given || tp.date.now("YYYY-MM-DD");
    const noteTitle = helpers.sanitizeTitle(`${datePart} – ${data.course} – ${data.title}`);

    let yamlFields = "";
    // Built by hand rather than through yamlField because the value is a
    // wikilink, not a plain scalar — but the quoting hazard is the same, so the
    // link target goes through yamlQuote just like every other quoted field.
    yamlFields += `course: "[[${helpers.yamlQuote(data.course)}]]"\n`;
    yamlFields += `unit: "[[${helpers.yamlQuote(data.unit)}]]"\n`;
    yamlFields += `lecturer: "[[${helpers.yamlQuote(data.lecturer)}]]"\n`;
    yamlFields += yamlField("lecture_num", data.lecture_num);
    yamlFields += yamlField("date_given", data.date_given);
    yamlFields += yamlField("url", data.url);
    yamlFields += yamlField("keywords", data.keywords);

    let body = `# ${noteTitle}\n\n`;
    // Plain markdown, not `key::` inline fields — see docs/adr/0005. Dataview
    // canonicalises inline keys case-insensitively, so `Course::` collided with
    // the frontmatter `course` field above; `Date::`/`Lecture::`/`Recording::`
    // restated `date_given`/`lecture_num`/`url` under second names.
    body += `> [!meta]- Metadata\n`;
    body += `> **Course:** [[${data.course}]]\n`;
    body += `> **Unit:** [[${data.unit}]]\n`;
    body += `> **Lecturer:** [[${data.lecturer}]]\n`;
    if (data.date_given) body += `> **Date:** ${data.date_given}\n`;
    if (data.lecture_num) body += `> **Lecture:** ${data.lecture_num}\n`;
    if (data.url) body += `> **Recording:** ${data.url}\n`;
    body += `\n---\n\n`;

    body += `## Learning Objectives\n\n- \n\n`;
    body += `## Pre-Lecture Notes\n\n- \n\n`;
    body += `## In-Lecture Notes\n\n- \n\n`;

    body += `## Key Concepts\n\n`;
    body += `| Concept | Explanation |\n`;
    body += `|----------|-------------|\n`;
    body += `| | |\n\n`;

    body += `## Questions Raised\n\n- \n\n`;

    body += `## Follow-Up Tasks\n\n`;
    body += `- [ ] Review lecture\n`;
    body += `- [ ] Extract permanent notes\n`;
    body += `- [ ] Update MOCs\n\n`;

    body += `---\n\n`;
    body += `## Extracted Permanent Notes\n\n`;
    body += "```dataview\n";
    body += "LIST\n";
    body += "FROM [[]] AND !#source\n";
    body += "SORT file.name ASC\n";
    body += "```\n\n";

    body += `---\n\n`;
    body += `## Related Lectures\n\n`;
    body += "```dataview\n";
    body += "LIST\n";
    body += `FROM #source/lecture\n`;
    body += `WHERE contains(course, [[${data.course}]])\n`;
    body += `AND file.name != this.file.name\n`;
    body += `SORT date_given ASC\n`;
    body += "```\n";

    return { noteTitle, yamlFields, body };
};

// Exposed so the test suite's guard test can verify these template files
// actually exist in the vault without restating the names. A function (not
// a plain object) because Templater's User Scripts loader rejects modules
// with non-function exports (see CHANGELOG 2.2.0, periodicNoteHelpers).
module.exports.stubTemplates = function stubTemplates() {
    return { ...TEMPLATES };
};
