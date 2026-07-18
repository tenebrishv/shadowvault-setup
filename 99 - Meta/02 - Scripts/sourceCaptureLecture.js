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

async function pickOrCreate(tp, helpers, label, existingItems) {
    const choices = [...existingItems.sort(), "➕ Create New"];
    const picked = await tp.system.suggester(choices, choices, false, label);
    if (!picked) return null;
    if (picked !== "➕ Create New") return picked;
    return await helpers.requiredPrompt(tp, `New ${label}`);
}

async function pickCourse(tp, helpers) {
    const courseFiles = await getNotesInFolder(COURSE_FOLDER);
    const courseNames = courseFiles.map(f => f.basename);
    const course = await pickOrCreate(tp, helpers, "Course", courseNames);
    if (!course) return null;

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
    const unitNames = matchingUnits.map(f => f.basename);
    const unit = await pickOrCreate(tp, helpers, "Unit", unitNames);
    if (!unit) return null;

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
    let peopleNames = peopleFiles.map(f => f.basename);
    if (defaultLecturer && !peopleNames.includes(defaultLecturer)) {
        peopleNames.unshift(defaultLecturer);
    }

    const lecturer = await pickOrCreate(tp, helpers, "Lecturer", peopleNames);
    if (!lecturer) return null;

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
    const noteTitle = `${datePart} – ${data.course} – ${data.title}`
        .replace(/[\\/:*?"<>|#^\[\]]/g, "")
        .replace(/\n/g, " ")
        .trim();

    let yamlFields = "";
    yamlFields += `course: "[[${data.course}]]"\n`;
    yamlFields += `unit: "[[${data.unit}]]"\n`;
    yamlFields += `lecturer: "[[${data.lecturer}]]"\n`;
    yamlFields += yamlField("lecture_num", data.lecture_num);
    yamlFields += yamlField("date_given", data.date_given);
    yamlFields += yamlField("url", data.url);
    yamlFields += yamlField("keywords", data.keywords);

    let body = `# ${noteTitle}\n\n`;
    body += `> [!meta]- Metadata\n`;
    body += `> Course:: [[${data.course}]]\n`;
    body += `> Unit:: [[${data.unit}]]\n`;
    body += `> Lecturer:: [[${data.lecturer}]]\n`;
    if (data.date_given) body += `> Date:: ${data.date_given}\n`;
    if (data.lecture_num) body += `> Lecture:: ${data.lecture_num}\n`;
    if (data.url) body += `> Recording:: ${data.url}\n`;
    body += `\n---\n\n`;

    body += `# Learning Objectives\n\n- \n\n`;
    body += `# Pre-Lecture Notes\n\n- \n\n`;
    body += `# In-Lecture Notes\n\n- \n\n`;

    body += `# Key Concepts\n\n`;
    body += `| Concept | Explanation |\n`;
    body += `|----------|-------------|\n`;
    body += `| | |\n\n`;

    body += `# Questions Raised\n\n- \n\n`;

    body += `# Follow-Up Tasks\n\n`;
    body += `- [ ] Review lecture\n`;
    body += `- [ ] Extract permanent notes\n`;
    body += `- [ ] Update MOCs\n\n`;

    body += `---\n\n`;
    body += `# Extracted Permanent Notes\n\n`;
    body += "```dataview\n";
    body += "LIST\n";
    body += "FROM [[]] AND !#source\n";
    body += "SORT file.name ASC\n";
    body += "```\n\n";

    body += `---\n\n`;
    body += `# Related Lectures\n\n`;
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
