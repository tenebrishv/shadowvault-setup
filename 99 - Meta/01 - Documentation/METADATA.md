# Metadata Schema & Tags

ShadowVault uses YAML frontmatter to provide structure, automation, and discoverability.
Metadata should support retrieval and understanding.

README: [README](../../README.md)

---
## Core Frontmatter Fields

These are the fields carried by notes moving through the pipeline — Permanent,
Literature, MOC, Fleeting, and captured Sources. They are **not** universal:
entity, curriculum-MOC, and periodic notes use their own lighter schemas,
documented further down.

```yaml
---
id:           # YYYYMMDDHHmm – unique timestamp ID
title:        # Human‑readable title (usually same as file name without prefix)
type:         # source | permanent | literature | fleeting | moc | thought | entity | periodic
growth:       # seedling | fern | incubator | evergreen
status:       # inbox | processing | active | completed | archived
created:      # YYYY-MM-DDTHH:mm
modified:     # YYYY-MM-DD – last substantive revision
review:       # YYYY-MM-DD – next scheduled review date
publish:      # true/false – set by Source Capture
tags:         # list of broad categories eg: sources/book
aliases:      # alternative titles
cssclasses:   # for CSS snippets (e.g., page-white, pen-blue)
---
```

Not every core note emits every field. The split below is real and enforced by
the conformance test in `99 - Meta/03 - Scripts-tests/frontmatterSchema.test.js`:

| Field | Permanent | Literature | MOC | Fleeting | Source Capture |
|---|---|---|---|---|---|
| `id` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `title` | ✓ | ✓ | ✓ | ✓ | — |
| `type` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `growth` | ✓ | ✓ | — | ✓ | ✓ |
| `status` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `created` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `modified` | ✓ | ✓ | ✓ | — | — |
| `review` | ✓ | — | — | — | ✓ |
| `publish` | — | — | — | — | ✓ |
| `tags` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `aliases` | ✓ | ✓ | ✓ | — | ✓ |
| `cssclasses` | ✓ | ✓ | ✓ | ✓ | — |

Notes on the asymmetries, all of them deliberate as of this writing:

- **`title` is written by the hand-authored templates, never by Source Capture** —
  captured notes carry the title in the filename (with its type prefix) instead.
- **`publish` is written only by Source Capture.**
- **`cssclasses` is written only by the hand-authored templates.**
- **Fleeting Note omits `aliases`, `review`, and `modified`** — it is the deliberate
  minimal template (ADR 0001); speed of capture wins over structure.
- **MOC omits `growth`** — MOCs are navigation, not ideas ripening toward evergreen.

- id
	- Permanent reference
	- Unique filenames
	- Prevent collisions
- growth 
	- How connected is this note
	- seedling: New capture
	- fern: Developing 
	- incubator: Complete but isolated
	- evergreen: Refined and connected 
- status
	- How far is it in the processing
	- inbox: not started
	- processing: started, not completed
	- active: ongoing, open-ended (default for Permanent/Literature/Fleeting/MOC templates — these are never really "completed", just continuously revised)
	- completed: completed
	- archived: this no longer serves a purpose

---

## Visual Badges

`growth`, `status`, and `type` are rendered as emoji badges wherever a note or a link to it appears — an in-note badge line (Permanent/Literature/Fleeting/MOC templates), the Nexus dashboards, and decorated `[[links]]`/backlinks via the Supercharged Links plugin. This is the **single source of truth** for the emoji mapping; every surface below must match it.

**growth**

| Value | Badge |
|---|---|
| seedling | 🌱 Seedling |
| fern | 🌿 Fern |
| incubator | 🔆 Incubator |
| evergreen | 🌲 Evergreen |

**status**

| Value | Badge |
|---|---|
| inbox | 📥 Inbox |
| processing | ⚙️ Processing |
| active | 🟢 Active |
| completed | ✅ Completed |
| archived | 🗄️ Archived |

**type**

| Value | Badge |
|---|---|
| permanent | 💡 Permanent |
| literature | 📝 Literature |
| source | 📚 Source |
| fleeting | 🌫️ Fleeting |
| moc | 🗺️ MOC |
| thought | 💭 Thought |
| periodic | 📆 Periodic |
| entity | 🧩 Entity |

If this mapping changes, update it here first, then propagate to the templates' in-note badge callouts, `99 - Meta/05 - Views/badge-table/view.js`, and `.obsidian/snippets/growth-badges.css`. The `08 - Nexus/` dashboards no longer hold their own copy — they render badges through the shared view, and `dashboardEnums.test.js` fails if the view and the tables above disagree, in either direction.

---

## Source‑Specific Fields (added by Source Capture)

### Book

```yaml
authors:
publish_date:
publisher:
isbn:
general_subject:
specific_subject:
```

### Article

```yaml
authors:
url:
publication:
publish_date:
```

### Paper

```yaml
authors:
doi:
citekey:
url:
publish_date:
keywords:
general_subject:
```

The paper's abstract is **not** a frontmatter field — `sourceCapturePaper.js`
writes it into the note body as an `> [!abstract]` callout.
### YouTube / Video

```yaml
channel:
channel_url:  # YouTube only — auto-fetched from oEmbed
url:
thumbnail:    # YouTube only — auto-fetched from oEmbed
watched: YYYY-MM-DD
released:     # optional
source:       # for non‑YouTube videos (Vimeo, Nebula)
```

`channel_url` and `thumbnail` are frontmatter fields, not inline ones, so they
are queryable — a dashboard can render video cards from `thumbnail` or group by
`channel_url`. The note body renders both as plain markdown (a linked channel
name, an embedded image); see the inline-field rule below.

### Podcast
```yaml
host:
guest:
url:
publish_date:
general_subject:
```

### Tweet

```yaml
account:
url:
keywords:
publish_date:
tweet_text:
```

### Lecture

```yaml
course: "[CourseName](CourseName)"
unit: "[UnitName](UnitName)"       # optional
lecturer: "[PersonName](PersonName)" # optional
lecture_num: 3
date_given: YYYY-MM-DD
url:
keywords:
```

The Course and Unit MOC templates hold **link-valued fields** (`default_lecturer` on Course, `course` on Unit). When unset, the template leaves the field empty with a YAML comment hint — e.g. `default_lecturer: # "[[link to an agent/person]]"` — so the parsed value stays genuinely empty while the raw frontmatter still teaches what belongs there. When set, the value is a quoted wikilink (`default_lecturer: "[[Jane Doe]]"`), which Obsidian renders as a link in the Properties panel. The lecture capture flow fills both automatically: a new Unit gets its `course`, and a newly created Course gets `default_lecturer` set to the first captured lecture's lecturer.

### Thought

```yaml
context:
led_here:
```

### Inline fields (`key:: value`) — when they are allowed

Dataview reads **two** surfaces on every note: the YAML frontmatter, and inline
`key:: value` declarations anywhere in the body. Same-named declarations from
the two surfaces are **merged into one array**. A note with `channel:` in
frontmatter and `channel::` in the body therefore has `p.channel` equal to
`["Some Channel", "Some Channel"]` — the same value twice, rendered twice by any
`TABLE channel`.

Two rules, enforced by `frontmatterSchema.test.js`:

> **1. No echo.** A capture module's inline field names must be disjoint from
> its own frontmatter field names, compared **case-insensitively** — Dataview
> canonicalises inline keys, so `Course::` and `course:` are one field.
>
> **2. No captured value.** If the capture knows a value, that value goes in
> frontmatter. Inline fields are emitted **empty**, as placeholders for prose
> written later.

In short: *inline fields declare data frontmatter doesn't have; they never
restate it.* The conforming placeholders are Book's `citation::` and Paper's
`hypothesis::`, `methodology::`, `results::`, `summary::`, `context::` and
`significance::` — all emitted empty, all holding prose too long for YAML.

**Formatting is not a reason to use `::`.** Dataview renders inline fields as a
styled key-value row, which makes `::` tempting for a tidy metadata callout —
but the field declaration comes along with the look, invisibly. Plain markdown
gives the same rendering and declares nothing:

```markdown
> channel:: [Some Channel](https://youtube.com/@some)     ← link + a duplicate field
> **Channel:** [Some Channel](https://youtube.com/@some)  ← link, no field
```

Both render an identical clickable link. The `[text](url)` makes the link; the
`::` only ever made the duplicate. Same for images: `> ![](url)` embeds the
thumbnail with no `thumbnail::` needed.

See `docs/adr/0005-inline-field-contract.md`.

---

## Literature Note Fields (`02 - Literature Notes/`)

A Literature Note records **your** reading of a source, so it carries a pointer
back to that source alongside the core fields. These are distinct from the
Source Capture fields above: those describe the source note itself, these
describe the link from your summary to it.

```yaml
source-title:
source-author:
source-type:     # book | article | paper | video | podcast | lecture …
source-url:
```

---

## Curriculum MOC Fields (`04 - MOCS/Courses`, `04 - MOCS/Units`)

Course and Unit MOCs use a **structural** schema — no `id`/`growth`/`status`/
`review`, since they are navigation scaffolding rather than ideas ripening
toward evergreen. They do carry `type: moc`, so they render and query as MOCs.

### Course MOC

```yaml
type: moc
institution:
default_lecturer:   # "[[link to an agent/person]]"
```

### Unit MOC

```yaml
type: moc
course:             # "[[link to a course]]"
semester:
```

Both are created by hand or born as stubs by the lecture capture flow; either
way the template file is the single source of their shape.

---

## Periodic Note Fields (`06 - Daily/`)

Daily, Weekly, Monthly, and Yearly notes all carry `type: periodic`. The
calendar grain lives in a separate `period` field rather than in `type`, so
adding a quarterly or half-yearly note later needs no new `type` value and no
change to the badge mappings.

```yaml
type: periodic
period:      # see the value table below
date:        # YYYY-MM-DD – first day of the period
week:        # "[[GGGG-Www]]" – parent week (Daily only)
month:       # "[[YYYY-MMM]]" – parent month (Weekly only)
year:        # "[[YYYY-Y]]"   – parent year (Monthly only)
```

**period**

| Value | Grain |
|---|---|
| daily | One day |
| weekly | One ISO week |
| monthly | One calendar month |
| quarterly | One quarter (no template yet) |
| half-yearly | Six months (no template yet) |
| yearly | One calendar year |

`quarterly` and `half-yearly` are reserved: the vocabulary is pinned so that
whoever adds those templates inherits the spelling rather than inventing one.

---

## Entity Fields (`09 - Entities/`)

Entity notes (`09 - Entities/Agents/` and `09 - Entities/Non-Agents/`) use a **lightweight** schema — no `id`/`growth`/`status`/`review`, since they're reference facts about the world, not ideas being processed toward evergreen:

```yaml
---
type: entity
tags:         # subtype tag, e.g. agent/person, nonagent/place
aliases:
created:
---
```

Plus subtype-specific structured fields:

### Person (`agent/person`)
```yaml
role:
organization:     # [[link]]
contact:
website:
```

### Organization (`agent/organization`)
```yaml
founded:
sector:
website:
headquarters:     # [[link]] to a Place entity
key_people:       # list of [[link]]s to Person entities
```

### Country (`agent/country`)
```yaml
government_type:
established:
capital:          # [[link]] to a Place entity
leader:           # [[link]] to a Person entity
```

### Synthetic Agent — AI/algorithms (`agent/synthetic`)
```yaml
creator:          # [[link]]
release_date:
model_family:
url:
```

### Place (`nonagent/place`)
```yaml
coordinates:
region:
country:          # [[link]]
historical:       # true/false, optional
```

### Artifact (`nonagent/artifact`)
```yaml
creator:          # [[link]]
date_created:
location:         # [[link]] to current Place
medium:
```

### Tool (`nonagent/tool`)
```yaml
creator:          # [[link]]
category:
version:          # optional
```

### System (`nonagent/system`)
```yaml
scope:
origin_date:
components:       # optional list
```

### Natural Entity (`nonagent/natural`)
```yaml
location:         # [[link]]
classification:
```

### Event (`nonagent/event`)
```yaml
date:
location:         # [[link]]
participants:     # list of [[link]]s to Agent entities
```

Classification (Agent vs. Non-Agent) is a folder decision, made once, based on whether the entity can decide/act. Subtype within that folder is a tag, not a subfolder — a note never needs to move when your understanding of its finer category changes. See [Entities MOC](../../04%20-%20MOCS/Entities.md) for the curated Dataview browse view.

## Tags System

Tags are **broad categorical umbrellas**. Links carry meaning. Tags tell you _what category_ something is; links tell you _what it connects to_.

|Tag|Applied to|
|---|---|
|`source/book`|Book notes|
|`source/article`|Article notes|
|`source/paper`|Paper notes|
|`source/youtube`|YouTube notes|
|`source/video`|Video notes|
|`source/podcast`|Podcast notes|
|`source/tweet`|Tweet notes|
|`source/lecture`|Lecture notes|
|`note/thought`|Thought notes|
|`course`|Course MOCs|
|`course-unit`|Unit MOCs|
|`agent/person`|Person entity notes|
|`agent/organization`|Organization entity notes|
|`agent/country`|Country entity notes|
|`agent/synthetic`|Synthetic/AI agent entity notes|
|`nonagent/place`|Place entity notes|
|`nonagent/artifact`|Artifact entity notes|
|`nonagent/tool`|Tool entity notes|
|`nonagent/system`|System entity notes|
|`nonagent/natural`|Natural entity notes|
|`nonagent/event`|Event entity notes|
|`Daily`|Daily notes (capital D)|
|`Weekly`|Weekly notes (capital W)|
|`Monthly`|Monthly notes (capital M)|
|`Yearly`|Yearly notes (capital Y)|

Do not use tags for growth stage (`seedling`, etc.) – those are kept in `growth:` field so Dataview can filter them easily.

## Naming Conventions

Source prefixes:

```text
{ Book
( Article
& Paper
+ Video
% Podcast
! Tweet
= Thought
§ Lecture
```

Examples:

```text
{ Thinking Fast and Slow
& Attention and Working Memory
§ 2025-02-14 – PSY101 – Introduction to Memory
```

Lecture notes are titled `§ YYYY-MM-DD – CourseCode – Lecture Title`, where `CourseCode` is the linked Course MOC's name — see [TEMPLATES.md](TEMPLATES.md).

---
