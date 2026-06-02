# Templates

Templates are the backbone of ShadowVault.

They enforce consistency, automate metadata generation, and reduce friction during capture and processing.

README: [README](../../README.md)

All templates are stored in `99 - Meta/00 - Templates/`.

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