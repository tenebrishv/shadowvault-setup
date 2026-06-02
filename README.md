# ShadowVault

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

> _The brain is for having ideas, not storing them._

ShadowVault is a long-term Personal Knowledge Management (PKM) system built in Obsidian. It is a **thinking environment** – a place where ideas are captured, connected, refined, and surfaced over time into durable knowledge.

It combines ideas from:

- **Zettelkasten** — atomic notes and linked thinking    
- **Evergreen Notes** — continuously refined ideas
- **Linking Your Thinking (LYT)** — Maps of Content (MOCs)
- **Progressive Summarization** — layered distillation of information
- **TallGuyJenks workflows** — practical source capture, processing systems and naming convention

The goal is to build a system that helps transform information into understanding.

## Documentation

**Full documentation** lives in [99 - Meta/01 - Documentation/](99%20-%20Meta/01%20-%20Documentation/)

| File                                                                                      | Description                                                                               |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [SETUP.md](99%20-%20Meta/01%20-%20Documentation/SETUP.md)                                 | Installation, plugin setup, first run                                                     |
| [STRUCTURE.md](99%20-%20Meta/01%20-%20Documentation/STRUCTURE.md)                         | Folder tree, naming conventions, philosophy                                               |
| [WORKFLOWS.md](99%20-%20Meta/01%20-%20Documentation/WORKFLOWS.md)                         | Knowledge flow, note maturity, daily notes                                                |
| [TEMPLATES.md](99%20-%20Meta/01%20-%20Documentation/TEMPLATES.md)                         | All templates and the Source Capture system                                               |
| [METADATA.md](99%20-%20Meta/01%20-%20Documentation/METADATA.md)                           | YAML frontmatter schema and tags                                                          |
| [REVIEW-SYSTEM.md](99%20-%20Meta/01%20-%20Documentation/REVIEW-SYSTEM.md)                 | Review scheduling and Dataview queries                                                    |
| [PLUGINS.md](99%20-%20Meta/01%20-%20Documentation/PLUGINS.md)                             | Required and optional community plugins                                                   |
| [CSS.md](99%20-%20Meta/01%20-%20Documentation/CSS.md)                                     | CSS snippets (notebook backgrounds, daily themes, sidebar colours)                        |
| [EXTERNAL-INTEGRATIONS.md](99%20-%20Meta/01%20-%20Documentation/EXTERNAL-INTEGRATIONS.md) | Zotero, Raindrop, Snipd, etc.                                                             |
| [DESIGN-PHILOSOPHY.md](99%20-%20Meta/01%20-%20Documentation/DESIGN-PHILOSOPHY.md)         | Core principles behind the vault's design                                                 |
| [INSPIRATION.md](99%20-%20Meta/01%20-%20Documentation/INSPIRATION.md)                     | Inspirations: Zettelkasten, Evergreen Notes, LYT, Progressive Summarization, Tallguyjenks |
| [ROADMAP.md](99%20-%20Meta/01%20-%20Documentation/ROADMAP.md)                             | Planned improvements and ideas                                                            |

---

## Quick Start

Full guide on [SETUP](99%20-%20Meta/01%20-%20Documentation/SETUP.md)
1. **Clone this repository** into your Obsidian vault folder.
2. Install required plugins: **Templater**, **Dataview**.
3. Run `(TEMPLATE) Source Capture` via Templater to add your first source.
4. Start with the **Home MOC** (`04 - MOCS/Home.md`).

---

## Core Principles


- **Links over folders** – navigation happens through connections, not hierarchies.
- **Atomic notes** – one idea per permanent note, stated as a claim.
- **Nothing is ever finished** – notes are living, open to revision.
- **Avoid the collector's fallacy** – capture without connection is hoarding.
- **Knowledge Is Never Finished** –  Evergreen notes are polished but always open to revision.

---

# Knowledge Flow

Every piece of information follows a path through the vault:

```text
External World
      ↓
Capture
      ↓
Source
      ↓
Literature Note
      ↓
Permanent Note
      ↓
MOC / Project
```

Not every note reaches the end. The purpose is to identify and develop ideas worth keeping.

See [WORKFLOWS](99%20-%20Meta/01%20-%20Documentation/WORKFLOWS.md)

---
## Vault Structure (simplified)

```text
ShadowVault/
│
├── 00 - Inbox
├── 01 - Sources
├── 02 - Literature Notes
├── 03 - Permanent Notes
├── 04 - MOCs
├── 05 - Projects
├── 06 - Daily
├── 07 - Attachments
├── 08 - Nexus
├── 09 - Agents
└── 99 - Meta
```

Full structure and reasoning behind it: [STRUCTURE](99%20-%20Meta/01%20-%20Documentation/STRUCTURE.md)

---

## Note Development

Notes progress through four growth stages:

|Stage|Meaning|
|---|---|
|🌱 Seedling|Initial capture or rough idea|
|🌿 Fern|Partially developed thought|
|🔆 Incubator|Complete but not yet integrated|
|🌲 Evergreen|Refined, linked, and connected|

This system encourages gradual refinement instead of forcing perfection during capture.

Check [](99%20-%20Meta/01%20-%20Documentation/WORKFLOWS.md#Note%20Maturity%20Model)

---

## Key Features

- **Smart source capture** – 9 source types (Books, Articles, Papers, YouTube, Video, Podcast, Tweet, Thought, Lecture) with automatic metadata fetching (ISBN, DOI, oEmbed). Check [](99%20-%20Meta/01%20-%20Documentation/TEMPLATES.md#Main%20Template%20`(TEMPLATE)%20Source%20Capture.md`)
- **Validated lecture system** – picks from existing Courses/Units/People, creates missing ones on the fly. Check [](99%20-%20Meta/01%20-%20Documentation/TEMPLATES.md#Lecture%20Automation)
- **Note maturity model** – seedling → fern → incubator → evergreen. Check [](99%20-%20Meta/01%20-%20Documentation/WORKFLOWS.md#Note%20Maturity%20Model)
- **Review system** – scheduled reviews (14 days) plus Dataview queries.
- **Daily notes with weekly/monthly/yearly reviews**.
- **CSS themes** – notebook backgrounds, daily note colours, coloured sidebar, general tweaks.
- **Metadata-Driven Organization** - Every note has a growth stage, status, review dates, metadata and relationships. Extremely powerful using Dataview dashboards

## License

This work © tenebrishv is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

> **Clarification of NonCommercial:**  
> For the purposes of this license, “commercial use” includes, but is not limited to:  
> - Selling the vault or any part of it  
> - Using it in paid training, consulting, or tutoring  
> - Internal corporate use that supports revenue‑generating activities  
> - Integrating it into a SaaS, web service, or mobile app  
>  
> If you are unsure whether your intended use is allowed, please contact [tenebrishv222@gmail.com](mailto:).  
> The copyright holder reserves the right to grant commercial exceptions on a case‑by‑case basis.

*This clarification does not modify the official license terms. The full legal code is in the `LICENSE` file.*


