/*
 * The frontmatter schema fixture — the single definition every frontmatter
 * producer in the vault is checked against by frontmatterSchema.test.js.
 *
 * Not a test file itself (no ".test.js" suffix) so `node --test` won't try to
 * run it directly. Not a runtime dependency either: templates stay static
 * markdown (ADR 0001) and nothing in 02 - Scripts reads this file. It is a
 * test-only seam that makes ~14 independent schema producers behave as one
 * module without restructuring any of them.
 *
 * TWO RULES GOVERN EVERY ENTRY BELOW (see docs/adr/0003):
 *
 *   1. Field PRESENCE is descriptive. The `required` lists record what each
 *      producer emits TODAY. They are HAND-TRANSCRIBED, never computed from
 *      the templates — a fixture that derives its expectations by reading the
 *      templates can never fail, because deleting a field also deletes the
 *      expectation. If you delete `growth` from (TEMPLATE) Permanent Note.md,
 *      this file must go red. That only works if a human wrote it down.
 *
 *   2. Field VOCABULARY is prescriptive. VOCABULARY and ENUMS are closed sets.
 *      A producer emitting a field name or enum value outside them fails, even
 *      if the value is plausible. This is what catches `modifed`, `seedlings`,
 *      and a capture module quietly renaming `isbn` to `isbn13`.
 *
 * FILENAME IDENTIFIES THE SCHEMA; `type` DESCRIBES THE RESULTING NOTE.
 * Contracts are keyed on template basename, NOT on the `type` field. This is
 * deliberate and easy to "fix" wrongly: (TEMPLATE) MOC.md and
 * (TEMPLATE) Course MOC.md both emit `type: moc` but have completely different
 * field sets, so a `type`-keyed fixture would have to accept either shape for
 * either file — silently weakening the check for the whole moc class while
 * staying green. See docs/adr/0003 before changing the key.
 */

// ---------------------------------------------------------------------------
// Closed enums (rule 2). Sourced from METADATA.md; the test asserts the doc
// and this file agree, so neither can drift alone.
// ---------------------------------------------------------------------------

const ENUMS = {
    type: ["source", "permanent", "literature", "fleeting", "moc", "thought", "entity", "periodic"],
    growth: ["seedling", "fern", "incubator", "evergreen"],
    status: ["inbox", "processing", "active", "completed", "archived"],
    period: ["daily", "weekly", "monthly", "quarterly", "half-yearly", "yearly"],
};

// ---------------------------------------------------------------------------
// Closed field vocabulary (rule 2). Every field any producer may emit.
// Grouped for readability only — the test flattens this.
// ---------------------------------------------------------------------------

const VOCABULARY = {
    core: ["id", "type", "growth", "status", "created", "modified", "review",
           "tags", "aliases", "cssclasses", "publish"],
    periodic: ["date", "period", "week", "month", "year"],
    curriculum: ["institution", "default_lecturer", "course", "semester"],
    literature: ["source"],
    source: ["authors", "publish_date", "publisher", "isbn", "general_subject", "specific_subject",
             "url", "publication", "doi", "citekey", "keywords", "channel", "channel_url",
             "thumbnail", "watched", "released",
             "platform", "host", "guest", "account", "tweet_text", "context", "led_here",
             "unit", "lecturer", "lecture_num", "date_given"],
    entity: ["role", "organization", "contact", "website", "founded", "sector", "headquarters",
             "key_people", "government_type", "established", "capital", "leader", "creator",
             "release_date", "model_family", "coordinates", "region", "country", "historical",
             "date_created", "location", "medium", "category", "version", "scope", "origin_date",
             "components", "classification", "participants"],
};

// ---------------------------------------------------------------------------
// Per-template contracts (rule 1 — hand-transcribed, keyed on filename).
//
//   required  — fields that MUST appear in this template's frontmatter
//   optional  — fields allowed but not required
//   typeValue — the literal value of `type`, when the template pins one
// ---------------------------------------------------------------------------

const ENTITY_BASE = ["type", "tags", "aliases", "created"];

const TEMPLATES = {
    // --- Notes moving through the pipeline -------------------------------
    "(TEMPLATE) Permanent Note": {
        typeValue: "permanent",
        required: ["id", "type", "growth", "status", "created", "modified", "review",
                   "tags", "aliases", "cssclasses"],
    },
    "(TEMPLATE) Literature Note": {
        typeValue: "literature",
        required: ["id", "type", "growth", "status", "source",
                   "created", "modified", "tags", "aliases", "cssclasses"],
    },
    "(TEMPLATE) MOC": {
        typeValue: "moc",
        required: ["id", "type", "growth", "status", "created", "modified", "tags", "aliases", "cssclasses"],
    },
    "(TEMPLATE) Fleeting Note": {
        typeValue: "fleeting",
        // Deliberately minimal per ADR 0001: no aliases, no review, no modified.
        required: ["id", "type", "growth", "status", "created", "tags", "cssclasses"],
    },

    // --- Curriculum MOCs (structural, not processed toward evergreen) -----
    "(TEMPLATE) Course MOC": {
        typeValue: "moc",
        required: ["type", "tags", "aliases", "created", "institution", "default_lecturer"],
    },
    "(TEMPLATE) Unit MOC": {
        typeValue: "moc",
        required: ["type", "tags", "course", "semester", "aliases", "created"],
    },

    // --- Entities: lightweight schema, no id/growth/status/review ---------
    "(TEMPLATE) Person": {
        typeValue: "entity",
        required: [...ENTITY_BASE, "role", "organization", "contact", "website"],
    },
    "(TEMPLATE) Organization": {
        typeValue: "entity",
        required: [...ENTITY_BASE, "founded", "sector", "website", "headquarters", "key_people"],
    },
    "(TEMPLATE) Country": {
        typeValue: "entity",
        required: [...ENTITY_BASE, "government_type", "established", "capital", "leader"],
    },
    "(TEMPLATE) Synthetic Agent": {
        typeValue: "entity",
        required: [...ENTITY_BASE, "creator", "release_date", "model_family", "url"],
    },
    "(TEMPLATE) Place": {
        typeValue: "entity",
        required: [...ENTITY_BASE, "coordinates", "region", "country", "historical"],
    },
    "(TEMPLATE) Artifact": {
        typeValue: "entity",
        required: [...ENTITY_BASE, "creator", "date_created", "location", "medium"],
    },
    "(TEMPLATE) Tool": {
        typeValue: "entity",
        required: [...ENTITY_BASE, "creator", "category", "version"],
    },
    "(TEMPLATE) System": {
        typeValue: "entity",
        required: [...ENTITY_BASE, "scope", "origin_date", "components"],
    },
    "(TEMPLATE) Natural Entity": {
        typeValue: "entity",
        required: [...ENTITY_BASE, "location", "classification"],
    },
    "(TEMPLATE) Event": {
        typeValue: "entity",
        required: [...ENTITY_BASE, "date", "location", "participants"],
    },

    // --- Periodic notes: frontmatter sits AFTER a leading <%* … %> block ---
    "(TEMPLATE) Daily Enhanced": {
        typeValue: "periodic",
        required: ["type", "period", "date", "tags", "aliases", "cssclasses", "week"],
    },
    "(TEMPLATE) Weekly": {
        typeValue: "periodic",
        required: ["type", "period", "date", "tags", "aliases", "month"],
    },
    "(TEMPLATE) Monthly": {
        typeValue: "periodic",
        required: ["type", "period", "date", "tags", "aliases", "year"],
    },
    "(TEMPLATE) Yearly": {
        typeValue: "periodic",
        required: ["type", "period", "date", "tags", "aliases"],
    },
};

// Templates with no frontmatter of their own. Every template in the folder must
// appear either here or in TEMPLATES — an unlisted template fails the test, so
// a new template cannot opt out by being forgotten.
const EXEMPT_TEMPLATES = {
    "(TEMPLATE) Source Capture":
        "Pure <%* … %> orchestrator. Emits no frontmatter of its own; the YAML it " +
        "assembles at runtime is checked via CAPTURE below.",
};

// ---------------------------------------------------------------------------
// Source Capture output (rule 1). buildBaseYaml emits the fields common to
// every captured note; each module appends its own.
//
// NOTE the split against the templates above: capture emits `publish` and no
// `title`/`cssclasses`; the hand-authored templates emit `title`/`cssclasses`
// and no `publish`. Both are real. Documented in METADATA.md.
// ---------------------------------------------------------------------------

const BASE_CAPTURE_FIELDS = ["tags", "publish", "aliases", "created", "id", "type", "review", "status", "growth"];

// Date formats buildBaseYaml must request. The mocked tp.date.now returns its
// own format string (and "format:offset" when given an offset), so these assert
// the format each field was built with — invisible to a real-date test.
const BASE_CAPTURE_DATE_FORMATS = {
    created: "YYYY-MM-DDTHH:mm",
    id: "YYYYMMDDHHmm",
    review: "YYYY-MM-DD:14",
};

// Per-type capture contracts. Each module is invoked for real down its
// MANUAL-PROMPT FALLBACK path (fetch mocked to fail) — the deterministic branch
// that exercises the full field set without network fixtures. The auto-fetch
// branches are already covered by the per-module tests; this suite is only
// asking "what field names come out?".
const CAPTURE = {
    Book: {
        // ISBN(skip), Title, Author(s), URL, Year, Publisher, General, Specific
        promptScript: ["", "Atomic Habits", "James Clear", "https://openlibrary.org/works/OL1W",
                       "2018", "Avery", "Self-help", "Habit formation"],
        required: ["authors", "url", "publish_date", "publisher", "isbn", "general_subject", "specific_subject"],
    },
    Article: {
        promptScript: ["https://example.com/x", "Fallback Title", "Some Author", "Some Site", "2020"],
        required: ["authors", "url", "publication", "publish_date"],
    },
    Paper: {
        // DOI(skip), Title, Authors, DOI-again(re-asked when falsy), Year, Keywords, Abstract
        promptScript: ["", "A Manual Paper", "A. Uthor", "", "2019", "kw1, kw2", "An abstract."],
        required: ["authors", "doi", "citekey", "url", "publish_date", "keywords", "general_subject"],
    },
    Youtube: {
        promptScript: ["https://youtu.be/broken", "Manual Title", "Manual Channel"],
        required: ["channel", "channel_url", "url", "thumbnail", "watched", "released"],
    },
    Video: {
        promptScript: ["A Great Talk", "Vimeo", "Some Creator", "https://vimeo.com/123", "2023-05-01"],
        required: ["platform", "channel", "url", "released", "watched"],
    },
    Podcast: {
        promptScript: ["Episode 42", "Host Name", "Guest Name", "https://podcast.example/42", "2022-11-11", "Philosophy"],
        required: ["host", "guest", "url", "publish_date", "general_subject"],
    },
    Tweet: {
        promptScript: ["https://twitter.com/someuser/status/2", "someuser", "Manual tweet text", "", ""],
        required: ["account", "url", "keywords", "publish_date"],
        // Emitted only when the tweet text is non-empty.
        optional: ["tweet_text"],
    },
    Thought: {
        promptScript: ["Does free will exist?", "Reading about determinism", "A podcast episode"],
        required: ["context", "led_here"],
    },
    Lecture: {
        // Needs the Course/Unit/Lecturer pickers satisfied before its prompts.
        suggestions: ["Cognitive Psychology", "Unit 1", "Dr. Vance"],
        promptScript: ["Intro to Memory", "3", "2024-03-01", "", "memory, encoding"],
        mockApp: {
            folders: {
                "04 - MOCS/Courses": ["Cognitive Psychology"],
                "04 - MOCS/Units": ["Unit 1"],
                "09 - Entities/Agents": ["Dr. Vance"],
            },
            files: {
                "04 - MOCS/Courses/Cognitive Psychology.md": { frontmatter: { default_lecturer: "Dr. Vance" } },
                "04 - MOCS/Units/Unit 1.md": { frontmatter: { course: "[[Cognitive Psychology]]" } },
                "09 - Entities/Agents/Dr. Vance.md": { frontmatter: { tags: "agent/person" } },
            },
        },
        required: ["course", "unit", "lecturer", "lecture_num", "date_given", "url", "keywords"],
    },
};

// `type` values Source Capture writes, by module. Thought is the odd one out —
// everything else is a source.
const CAPTURE_TYPE_VALUES = { Thought: "thought", _default: "source" };

// ---------------------------------------------------------------------------
// Inline-field contract (see docs/adr/0005).
//
// A capture module writes to TWO surfaces: the frontmatter it returns as
// `yamlFields`, and the note `body`. Dataview reads BOTH — a `key:: value` in
// the body declares a field just as a YAML key does, and merges same-named
// declarations from the two surfaces into one array. So a module that writes
// `channel:` in frontmatter and `channel::` in the body makes `p.channel` an
// array of the same value twice.
//
// That is exactly what happened, and it survived this suite for a release
// because the suite only ever looked at surface one. Two clauses close it:
//
//   1. NO ECHO. A module's inline field names must be disjoint from its own
//      frontmatter field names, compared case-insensitively — Dataview
//      canonicalises inline keys, so `Course::` collides with `course:`.
//
//   2. NO CAPTURED VALUE. If a module writes a NON-EMPTY value into a `::`
//      field, that value belongs in frontmatter. Inline fields are emitted
//      empty, as placeholders for prose the reader writes later.
//
// Clause 2 expresses the intent; clause 1 holds the line. Neither subsumes the
// other: YouTube used to emit `released:` AND an empty `> released::`, which
// clause 2 alone would wave through — until the day someone filled one in and
// which one they picked decided whether the dashboards saw it.
//
// The allowlist below is HAND-TRANSCRIBED and descriptive, exactly like the
// `required` lists (rule 1 of ADR 0003): it records the placeholders each
// module emits TODAY. A module emitting an inline field not listed here fails,
// so a new `key::` cannot appear without a human writing it down.
const CAPTURE_INLINE_PLACEHOLDERS = {
    Book: ["citation"],
    Paper: ["hypothesis", "methodology", "results", "summary", "context", "significance"],
    Article: [],
    Youtube: [],
    Video: [],
    Podcast: [],
    Tweet: [],
    Thought: [],
    Lecture: [],
};

// ---------------------------------------------------------------------------
// METADATA.md section binding (issue #19; see docs/adr/0003).
//
// The flat two-way doc check (documentedFields) unions EVERY yaml block in
// METADATA.md into one set, so it catches invented or undocumented field NAMES
// but not a field documented under the WRONG heading — `isbn` under Podcast, or
// the Book block silently losing `publisher` while some other block still
// mentions it, both stay green. This map binds each per-type heading to the
// exact field set its yaml block must document, keyed on the type's contract, so
// a field in the wrong section fails.
//
// Heading TEXT lives HERE, in the fixture — never in the test's parser — so
// renaming a heading in METADATA.md is a one-line fixture edit, not a mysterious
// red run (ADR 0003: don't couple the conformance parser to doc prose). The
// label is the heading up to the first " (", so the `(`agent/person`)` tag on an
// entity heading can change freely.
//
// Only per-TYPE blocks are bound. The shared blocks (Core, Entity base,
// Literature, Periodic, Curriculum MOC) document fields common to many producers
// and stay covered by the flat check alone.
const distinctiveEntityFields = (name) =>
    TEMPLATES[name].required.filter((f) => !ENTITY_BASE.includes(f));

const DOC_SECTIONS = {
    // Source Capture per-type blocks → the module's type-specific fields.
    "Book": [...CAPTURE.Book.required],
    "Article": [...CAPTURE.Article.required],
    "Paper": [...CAPTURE.Paper.required],
    // One block documents both YouTube and non-YouTube video.
    "YouTube / Video": [...new Set([...CAPTURE.Youtube.required, ...CAPTURE.Video.required])],
    "Podcast": [...CAPTURE.Podcast.required],
    "Tweet": [...CAPTURE.Tweet.required, ...(CAPTURE.Tweet.optional || [])],
    "Lecture": [...CAPTURE.Lecture.required],
    "Thought": [...CAPTURE.Thought.required],

    // Entity subtype blocks → the subtype's distinctive fields (the shared
    // type/tags/aliases/created live in the Entity base block, not bound here).
    "Person": distinctiveEntityFields("(TEMPLATE) Person"),
    "Organization": distinctiveEntityFields("(TEMPLATE) Organization"),
    "Country": distinctiveEntityFields("(TEMPLATE) Country"),
    "Synthetic Agent — AI/algorithms": distinctiveEntityFields("(TEMPLATE) Synthetic Agent"),
    "Place": distinctiveEntityFields("(TEMPLATE) Place"),
    "Artifact": distinctiveEntityFields("(TEMPLATE) Artifact"),
    "Tool": distinctiveEntityFields("(TEMPLATE) Tool"),
    "System": distinctiveEntityFields("(TEMPLATE) System"),
    "Natural Entity": distinctiveEntityFields("(TEMPLATE) Natural Entity"),
    "Event": distinctiveEntityFields("(TEMPLATE) Event"),
};

module.exports = {
    ENUMS,
    VOCABULARY,
    TEMPLATES,
    EXEMPT_TEMPLATES,
    DOC_SECTIONS,
    BASE_CAPTURE_FIELDS,
    BASE_CAPTURE_DATE_FORMATS,
    CAPTURE,
    CAPTURE_TYPE_VALUES,
    CAPTURE_INLINE_PLACEHOLDERS,
    allKnownFields: () => new Set(Object.values(VOCABULARY).flat()),
};
