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
type:         # source | permanent | literature | fleeting | moc | thought | daily
growth:       # seedling | fern | incubator | evergreen
status:       # inbox | processing | completed | archived
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
	- completed: completed
	- archived: this no longer serves a purpose

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

### Thought

```yaml
context:
led_here:
```

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
|`person`|People notes|
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
§ Introduction to Statistics
```

---
