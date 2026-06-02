#  ShadowVault Personal Knowledge Vault - Obsidian Set-up

>[!quote] *The brain is for having ideas, not storing them.*

ShadowVault is a long-term Personal Knowledge Management system built in Obsidian. It is not a filing cabinet. It is a thinking environment — a place where ideas are captured, connected, refined, and surfaced over time into durable knowledge.

This vault synthesises ideas from several PKM systems:
- **Zettelkasten** – atomic, linked notes; unique IDs; bottom‑up structure.
- **Andy Matuschak’s Evergreen Notes** – notes as executable ideas; iterative refinement.
- **Nick Milo’s Linking Your Thinking (LYT)** – Maps of Content (MOCs); flexible hierarchy.
- **Progressive Summarization** – layers of highlighting and distillation (applied in the note templates).
- **Tallguyjenks** – pragmatic workflows, template‑driven capture, and  prefix convention for sources.
- 
All these ideas are woven into the folder structure, the capture templates, and the review workflow (status: inbox → seedling → evergreen).

---

## Core Philosophy

**Functionality before aesthetics.** A tool must work first and look beautiful second.

**Links over folders.** Navigation happens through connections between ideas, not through rigid hierarchies. Two folders may both be relevant to a note — a link has no such constraint.

**Atomic notes.** Each permanent note should contain exactly one idea, stated as a claim. Not "Statistics" — but "Statistical models are approximations of reality.

**Nothing is ever finished.** Evergreen notes are polished but always open to revision. Knowledge is a living thing.

**Avoid the collector's fallacy.** Capturing without connecting and refining is hoarding, not thinking.

---
## Knowledge Flow
Every piece of information enters the vault and follows a path:

```
External World
     ↓
  Capture  (00 - Inbox, Daily Notes)
     ↓
  Source   (01 - Sources)
     ↓
  Literature Note  (02 - Literature Notes)
     ↓
  Permanent Note   (03 - Permanent Notes)
     ↓
  MOC / Project    (04 - MOCs, 05 - Projects)

```
  
Not every note completes this journey. Fleeting thoughts may be discarded. Sources may be consumed and summarised without becoming permanent notes. The goal is not to process everything — it is to let the important ideas rise.

---

## Note Maturity Model
  
Notes carry a `growth` metadata field that tracks their development stage.
  
| Stage | Emoji | Meaning |
|---|---|---|
| `seedling` | 🌱 | Raw capture. Rough or empty. Needs development. |
| `fern` | 🌿 | Partially developed. Has some explanation. Needs more thinking. |
| `incubator` | 🔆 | Complete thought. Can stand alone. Not yet linked. |
| `evergreen` | 🌲 | Polished, atomic, linked, and connected to other notes. |
  
---

## Folder Structure

  

```
ShadowVault/
│
├── 00 - Inbox/             ← Everything lands here first
│
├── 01 - Sources/           ← Raw input material, organised by type
│   ├── Articles/
│   ├── Books/
│   ├── Lectures/
│   ├── Papers/
│   └── Videos/
│
├── 02 - Literature Notes/  ← Your response to a source, in your own words
│
├── 03 - Permanent Notes/   ← Atomic, evergreen ideas. The vault's core.
│
├── 04 - MOCs/              ← Maps of Content: curated pathways through knowledge
│   ├── Courses/            ← One MOC per academic course
│   └── Units/              ← One MOC per course unit/module
│
├── 05 - Projects/          ← Active work with a defined outcome or deadline
│
├── 06 - Daily/             ← Daily notes, weekly, monthly, and annual reviews
│
├── 07 - Attachments/       ← Images, PDFs, diagrams, and other binary files
│
├── 08 - Nexus/             ← Dashboards and vault-wide overview notes
│
├── 09 - Agents/            ← People notes
│   └── People/
│
└── 99 - Meta/              ← Vault infrastructure: templates, config, utilities
    └── 00 - Templates/
```

### Folder Philosophy

Folders are shallow by design. Deep hierarchies create friction and false certainty. A note about "Memory" might belong under Psychology, Neuroscience, and Study Skills simultaneously — so it belongs to none of them as a folder. It belongs to all of them through **links** and **MOCs**.

---
## Templates
All templates live in `99 - Meta/00 - Templates/`. The primary entry point is the **Source Capture** template.

### Source Capture (`(TEMPLATE) Source Capture.md`)

The main intake template. Run it via Templater to capture any input type. It guides you through the appropriate fields with smart prompts and automatic metadata fetching where possible.

**Supported types:**

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
  
Every captured note is automatically created with:

- `status: inbox`
- `growth: seedling`
- `review:` set 14 days from creation
  
The **Lecture** type additionally creates stub notes for Course, Unit, and Lecturer if they do not already exist.

### Other Templates

| Template | Purpose |
|---|---|
| `(TEMPLATE) Permanent Note.md` | Atomic idea note with one-liner, evidence, and connections |
| `(TEMPLATE) Literature Note.md` | Source response in your own words |
| `(TEMPLATE) MOC.md` | Map of Content scaffold |
| `(TEMPLATE) Course MOC.md` | Course-level MOC with linked units and lectures |
| `(TEMPLATE) Unit MOC.md` | Unit-level MOC with linked lectures and core concepts |
| `(TEMPLATE) Daily Enhanced.md` | Daily note with morning check-in, capture area, and evening reflection |
| `(TEMPLATE) Fleeting Note.md` | Quick thought with next action checklist |
| `(TEMPLATE) Person.md` | People note with role, connection points, and backlinked notes |
  
---
## Metadata Schema

Every note uses YAML frontmatter. Fields vary by note type, but the **core fields** present on all notes are:

```yaml
---
id:           # YYYYMMDDHHmm — unique timestamp ID
title:        # Human-readable title
type:         # source | permanent | literature | fleeting | moc | thought | daily
growth:       # seedling | fern | incubator | evergreen
status:       # inbox | active | archived
created:      # YYYY-MM-DDTHH:mm
review:       # YYYY-MM-DD — next scheduled review date
tags:
aliases:
cssclasses:
---
```

**Source-specific fields** (added by Source Capture):
  
```yaml
authors:
url:
publish_date:
publisher:
isbn:           # Books
doi:            # Papers
keywords:
abstract:       # Papers
channel:        # YouTube / Video
watched:        # YouTube / Video
course:         # Lectures
unit:           # Lectures
lecturer:       # Lectures
date_given:     # Lectures
lecture_num:    # Lectures
account:        # Tweets
tweet_text:     # Tweets
```

---
## Tags System

Tags are broad categorical umbrellas. Links carry meaning. Tags tell you *what category* something is; links tell you *what it connects to*.
  
**Source tags** (applied by Source Capture):

```
source/book
source/article
source/paper
source/youtube
source/video
source/podcast
source/tweet
source/lecture
note/thought
```

**Note-type tags:**
```
course          # Course MOC notes
course-unit     # Unit MOC notes
person          # People notes
Daily           # Daily notes
```

**Growth tags** are tracked via the `growth` frontmatter field, not as tags, so Dataview can query them cleanly.

---
## Maps of Content (MOCs)

MOCs live in `04 - MOCs/`. They are not indexes or tables of contents — they are **curated pathways** through a body of knowledge. A MOC should express your understanding of a topic, not just list everything related to it.

MOCs emerge naturally. Create them when you notice a cluster of linked notes forming around an idea.
  
The **Home MOC** (`04 - MOCS/Home.md`) is the vault's entry point. Start there.

**Course MOCs** (`04 - MOCS/Courses/`) aggregate all units and lectures for an academic course.  

**Unit MOCs** (`04 - MOCS/Units/`) aggregate all lectures within a course unit and surface core concepts.

---
## Daily Note System
  
Daily notes live in `06 - Daily/` and use the format `YYYYMMDD`.

The temporal review cycle:
```
Daily → Weekly → Monthly → Yearly
```

Each level reviews the one below it, surfaces highlights, and links forward and backward in time.

**Daily notes** serve as the primary capture hub throughout the day. Process the inbox, link new notes, and reflect in the evening.  

**Weekly** (`gggg-Www`), **Monthly** (`YYYY-Mmm`), and **Annual** (`YYYY-Y`) notes are created manually using their respective templates.

Navigation between daily notes uses inline wikilinks rendered as `← previous | → next`.  

---

## Review System

Every source note gets a `review:` date set 14 days from creation. Use Dataview to surface due reviews:

```dataview
TABLE title, growth, review
FROM "01 - Sources"
WHERE review <= date(today)
SORT review ASC
```

Additional discovery methods:
- **Random Note** plugin — open a random note for serendipitous review
- **Graph traversal** — follow connections outward from a note
- **Dataview dashboards** — filter by growth stage, status, or date
---

## Plugins

### Core Plugins (enabled)  

File Explorer, Global Search, Graph View, Backlinks, Canvas, Outgoing Links, Tag Pane, Properties, Page Preview, Daily Notes, Templates, Note Composer, Command Palette, Slash Commands, Bookmarks, Unique Note Creator (ZK Prefixer), Outline, Word Count, File Recovery.

### Community Plugins (in use or recommended)
  
| Plugin | Role |
|---|---|
| **Templater** | Powers all templates and automated logic |
| **Dataview** | SQL-like queries for dashboards and reviews |
| **Calendar** | Visual daily note navigation |
| **Tag Wrangler** | Bulk rename and merge tags |
| **Kanban** | Visual note status tracking |
| **Natural Language Dates** | Human-readable date parsing |
| **Supercharged Links** | Visual link styling based on metadata |
| **Metatable** | Renders YAML frontmatter as a readable table |
| **Iconize** | Folder icons by keyword match |
| **Pane Relief** | Pane history and navigation hotkeys |
| **Paste URL into Selection** | Create a link by pasting a URL over selected text |
| **File Explorer Note Count** | Shows note counts per folder |
| **Random Note** | Open a random note for review |
| **Review** | Schedule notes for future review |
| **Kindle Highlights** | Import Kindle annotations |
| **Excalidraw** | Embedded hand-drawn diagrams |
| **Advanced Slides** | Turn notes into slide decks |
| **Spaced Repetition** | Flashcard review from notes |
| **Smart Typography** | Correct typographic quotes and apostrophes |
| **Omni Search + Text Extractor** | Full-text OCR search across images and PDFs |
| **Mindmap** | Render a note as a mindmap |
| **Extended MathJax** | Full LaTeX support |

---
## Hotkeys

| Hotkey                 | Action                               |
| ---------------------- | ------------------------------------ |
| `Cmd/Ctrl + N`         | Create new unique note (ZK Prefixer) |
| `Cmd/Ctrl + Shift + P` | Open command palette                 |

All other hotkeys use Obsidian defaults unless configured per-session.
  
---
## Naming Conventions

Notes created by Source Capture are renamed using a **type prefix** followed by the title:
  
```
{ The Art of Learning           ← Book
( How Attention Works           ← Article
& Attention and working memory  ← Paper
+ Understanding Transformers    ← YouTube
% The Knowledge Project Ep. 42  ← Podcast
! naval — 2024-05-01            ← Tweet
= Learning compounds over time  ← Thought
§ Introduction to Cognition     ← Lecture
```

Daily notes use `YYYYMMDD` format for clean chronological sorting.  
Unique notes created by ZK Prefixer use `YYYYMMDDHHmm` format.

---
  
## Starting Points

- **Entry point:** `04 - MOCS/Home.md`
- **Process new captures:** `08 - Nexus/` dashboards
- **Add a new source:** Run `(TEMPLATE) Source Capture` via Templater
- **Write a new idea:** `Cmd/Ctrl + N` → rename with thought prefix `= `
- **Open today's note:** Daily Notes core plugin (ribbon or command palette

---

*This vault is always under construction. The system should serve your thinking, not the other way around.*