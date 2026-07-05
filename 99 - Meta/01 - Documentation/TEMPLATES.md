# Templates

Templates are the backbone of ShadowVault.

They enforce consistency, automate metadata generation, and reduce friction during capture and processing.

README: [README](../../README.md)

All templates are stored in `99 - Meta/00 - Templates/`.

The `Source Capture` template's logic is split across Templater **User Scripts** in `99 - Meta/02 - Scripts/` — one JS module per source type, plus a shared helpers module — rather than living in one large template file. This lives outside the Templates folder deliberately, so the `.js` files don't show up in the "Insert Template" picker (which lists everything under `templates_folder`). See [Source Capture Architecture](#source-capture-architecture) below.

---

## Design Philosophy

Templates should:

- Reduce repetitive work
- Encourage good note-taking habits
- Standardize metadata
- Avoid unnecessary complexity

---

## Main Template: `(TEMPLATE) Source Capture.md`
The primary intake tool. Run via Templater command: **Insert Template** → `(TEMPLATE) Source Capture`.

### Features

- Prompts for source type (9 types)
- Auto‑fetches metadata when possible (ISBN, DOI, URL oEmbed)
- For **Lecture**: validated pickers for Course → Unit → Lecturer
  - Lists existing Courses (`#course` in `04 - MOCS/Courses/`)
  - Lists Units belonging to that course (via `course:` frontmatter)
  - Pre‑fills Lecturer from course's `default_lecturer` field
  - Creates missing Courses/Units/People on the fly (stubbed from helper templates)
- Renames file with type prefix (e.g., `{` for Book, `§` for Lecture)
- Adds YAML frontmatter with `id`, `created`, `review`, `status: inbox`, `growth: seedling`
- Generates a rich note body (callouts, tables, timestamp placeholders)

### Type Prefixes

| Type | Prefix | Tag | Auto-fetch |
|---|---|---|---|
| 📚 Book | `{` | `source/book` | Open Library (via ISBN) |
| 📰 Article | `(` | `source/article` | Microlink API (via URL) |
| 📜 Paper | `&` | `source/paper` | CrossRef (via DOI) |
| 🎥 YouTube | `+` | `source/youtube` | YouTube oEmbed API |
| 🎬 Video | `+` | `source/video` | Manual |
| 🎧 Podcast | `%` | `source/podcast` | Manual |
| 🐦 Tweet | `!` | `source/tweet` | Twitter oEmbed API |
| 💭 Thought | `=` | `note/thought` | Manual |
| 🎓 Lecture | `§` | `source/lecture` | Smart pickers (Course/Unit/Lecturer) |

### Lecture Automation

Lecture capture automatically:

- Creates Course notes if missing
- Creates Unit notes if missing
- Creates Lecturer notes if missing
- Connects lecture to course hierarchy

Result:

```text
Course
└── Unit
    └── Lecture
```

---

## Source Capture Architecture

`(TEMPLATE) Source Capture.md` itself is a thin orchestrator: it shows the type picker, dispatches to the matching script, then assembles the frontmatter/body it returns and renames the file. All type-specific logic (prompts, auto-fetch, YAML fields, note body) lives in `99 - Meta/02 - Scripts/`:

| File | Responsibility |
|------|-----------------|
| `sourceCaptureHelpers.js` | Shared prompt helpers (`requiredPrompt`, `optionalPrompt`, `datePrompt`), the `yamlField` formatter, and `buildBaseYaml` (the frontmatter fields common to every capture type) |
| `sourceCaptureBook.js` | Book — Open Library ISBN lookup + manual fallback |
| `sourceCaptureArticle.js` | Article — Microlink URL metadata + manual fallback |
| `sourceCapturePaper.js` | Paper — CrossRef DOI lookup + manual fallback |
| `sourceCaptureYoutube.js` | YouTube — oEmbed lookup + manual fallback |
| `sourceCaptureVideo.js` | Video (non-YouTube) — manual |
| `sourceCapturePodcast.js` | Podcast — manual |
| `sourceCaptureTweet.js` | Tweet — oEmbed lookup + manual fallback |
| `sourceCaptureThought.js` | Thought — manual |
| `sourceCaptureLecture.js` | Lecture — Course/Unit/Lecturer picker-or-create flow plus lecture details |

Each per-type module is a Templater User Script: `module.exports` is an `async function(tp, helpers)` that prompts/fetches as needed and returns `{ noteTitle, yamlFields, body }`, or `null` if the user cancels. This requires Templater's **User Scripts Folder** setting to point at `99 - Meta/02 - Scripts` (already configured in this vault's `.obsidian/plugins/templater-obsidian/data.json`) — after pulling changes to these scripts, run Obsidian's **Templater: Reload templates** command (or restart Obsidian) so it picks them up.

A sibling folder, `99 - Meta/03 - Scripts-tests/`, holds a Node-based unit test suite (mocked `tp`/`app`/`fetch`) for these modules — see its `README.md` for how to run it. It's a sibling of, not nested inside, `02 - Scripts/`, so Templater never tries to load the test files as `tp.user.*` functions.

To add a new source type: create `sourceCapture<Type>.js` following the existing pattern, then register it in the `TYPE_LABELS`/`TYPE_ICONS`/`TYPE_TAGS`/`TYPE_PREFIX`/`TYPE_CAPTURERS` tables at the top of `(TEMPLATE) Source Capture.md`.

---

## Helper Templates

These are used by `Source Capture` when creating new Courses, Units, or People.

| File | Used for |
|------|----------|
| `(TEMPLATE) Course MOC.md` | New course stub (`#course`, YAML with `default_lecturer`) |
| `(TEMPLATE) Unit MOC.md` | New unit stub (`#course-unit`, YAML `course: [TEMPLATES](.md)`) |
| `(TEMPLATE) Person.md` | New person stub (`#person`) |

---

## Other Templates (Manual Use)

| Template | Purpose |
|----------|---------|
| `(TEMPLATE) Permanent Note.md` | Atomic idea note – one‑liner, evidence, connections |
| `(TEMPLATE) Literature Note.md` | Response to a source, in your own words |
| `(TEMPLATE) MOC.md` | Generic Map of Content scaffold |
| `(TEMPLATE) Daily Enhanced.md` | Daily note with morning check‑in, capture area, evening reflection |
| `(TEMPLATE) Fleeting Note.md` | Quick capture with next‑action checklist |
| `(TEMPLATE) Weekly.md` | Weekly review template |
| `(TEMPLATE) Monthly.md` | Monthly review |
| `(TEMPLATE) Yearly.md` | Annual review |



---

## Template Evolution

Templates are expected to evolve. When adding new fields:

1. Determine future usefulness
2. Ensure consistency
3. Avoid metadata bloat

The goal is to support **thinking**, not create administrative work.