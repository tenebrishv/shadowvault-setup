# Metadata Schema & Tags

ShadowVault uses YAML frontmatter to provide structure, automation, and discoverability.
Metadata should support retrieval and understanding.

README: [README](../../README.md)

---
## Core Frontmatter Fields (present on all notes)

```yaml
---
id:           # YYYYMMDDHHmm – unique timestamp ID
title:        # Human‑readable title (usually same as file name without prefix)
type:         # source | permanent | literature | fleeting | moc | thought | daily | entity
growth:       # seedling | fern | incubator | evergreen
status:       # inbox | processing | active | completed | archived
created:      # YYYY-MM-DDTHH:mm
review:       # YYYY-MM-DD – next scheduled review date
tags:         # list of broad categories eg: sources/book
aliases:      # alternative titles
cssclasses:   # for CSS snippets (e.g., page-white, pen-blue)
---
```

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
| daily | 📅 Daily |
| entity | 🧩 Entity |

If this mapping changes, update it here first, then propagate to the templates, `08 - Nexus/` dashboards, and `.obsidian/snippets/growth-badges.css`.

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
abstract:
```
### YouTube / Video

```yaml
channel:
url:
watched: YYYY-MM-DD
released:     # optional
source:       # for non‑YouTube videos (Vimeo, Nebula)
```

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
