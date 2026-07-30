# Folder Structure & Philosophy

ShadowVault uses a shallow folder structure designed to minimize friction and maximize discoverability.

Readme: [README](../../README.md)

---

## Complete folder Tree

```text
ShadowVault/
├── 00 - Inbox/ # Fleeting notes, unsorted captures  
├── 01 - Sources/ # Raw input material  
	├── Articles/  
	├── Books/  
	├── Lectures/  
	├── Papers/  
	├── Videos/  
	├── Podcasts/ # created on first use  
	└── Tweets/ # created on first use  
├── 02 - Literature Notes/ # Atomic ideas that need their source to make sense  
├── 03 - Permanent Notes/ # Evergreen ideas that stand on their own – the vault's core  
├── 04 - MOCS/ # Maps of Content (curated pathways)  
	├── Courses/ # One MOC per academic course  
	├── Units/ # One MOC per course unit/module  
	└── Home.md # Vault entry point  
├── 05 - Projects/ # Active work with a defined outcome  
├── 06 - Daily/ # Daily, weekly, monthly, annual notes  
├── 07 - Attachments/ # Images, PDFs, diagrams  
├── 08 - Nexus/ # Dashboards and vault-wide overviews  
├── 09 - Entities/ # Real-world nouns, split by decision-making capacity  
	├── Agents/ # People, Organizations, Countries, Synthetic/AI — act with intentional or decision-making power  
	└── Non-Agents/ # Places, Artifacts, Tools, Systems, Natural entities, Events — structural/relational influence only  
└── 99 - Meta/ # Vault infrastructure  
	├── 00 - Templates/ # All template files (Templater scans this for "Insert Template")
	├── 01 - Documentation/ # This documentation
	├── 02 - Scripts/ # Templater User Scripts backing Source Capture (kept out of 00 - Templates/ so they don't show up as templates)
	├── 03 - Scripts-tests/ # Unit tests for 02 - Scripts/ (sibling, not nested, so Templater doesn't load them as scripts)
	├── 04 - Tooling/ # Vault update scripts (update-vault.ps1 / .sh, generate-manifest.ps1)
	└── 05 - Views/ # Shared Dataview views invoked by the 08 - Nexus dashboards (also outside 02 - Scripts/, which Templater loads)
```

---
## Philosophy
- **Folders are shallow** – deep hierarchies create friction and false certainty. A note about "Memory" could belong to Psychology, Neuroscience, and Study Skills simultaneously – so it belongs to **none** of them as a folder. It belongs to all of them through **links** and **MOCs**.
- **Numeric prefixes** (`00`, `01`, … `99`) keep folders in a logical order (inbox first, meta last).
- **Sources are separated by type** only for convenience – the real organisation happens via tags, links, and MOCs.

## Naming Conventions
| Note type | Format | Example |
|-----------|--------|---------|
| Source (captured) | `{ Title` (book) | `{ The Art of Learning` |
| Source (lecture) | `§ YYYY-MM-DD – CourseCode – Title` | `§ 2025-02-14 – PSY101 – Introduction to Cognition` |
| Permanent note | `YYYYMMDDHHmm Idea` | `202502141430 Learning compounds over time` |
| Daily note | `YYYYMMDD` | `20250214` |
| Weekly note | `YYYY-Www` | `2025-W07` |
| Monthly note | `YYYY-MMM` | `2025-Feb` |
| Annual note | `YYYY-Y` | `2025-Y` |
| Course MOC | `Course Name` | `Cognitive Psychology` |
| Unit MOC | `Unit Name` | `Unit 1 – Memory Systems` |
| Person note | `Full Name` | `Dr. Eleanor Vance` |
| Entity note (Organization/Place/etc.) | Descriptive Name | `United Nations`, `Paris` |

## Special Folders
- **`00 - Inbox/`** – All new notes should land here, Source Capture's included. Process regularly: run [Move Source Note](TEMPLATES.md#filing-a-note-move-source-note) on a source note to file it into `01 - Sources/<type>`. Notes left here stay invisible to the folder-scoped hub queries, so the Inbox is a staging area, not a home.
- **`08 - Nexus/`** – Contains Dataview dashboards that aggregate information across the vault (e.g., due reviews, unprocessed inbox items).
- **`09 - Entities/`** – Real-world nouns. Split into two flat folders by whether the entity can decide/act (`Agents/`) or only exerts structural/relational influence (`Non-Agents/`). Subtype (Person, Organization, Place, Artifact, etc.) is a tag, not a subfolder — see [METADATA](METADATA.md#tags-system).
-
## Folder Definitions

| Folder | Purpose |
|--------|---------|
| `00 - Inbox` | Temporary holding area. Everything starts here; nothing stays. |
| `01 - Sources` | Raw inputs (Articles, Books, Lectures, Papers, Videos). Original material, not interpretation. `Podcasts/` and `Tweets/` don't ship — the [Move Source Note](TEMPLATES.md#filing-a-note-move-source-note) command creates whichever destination is missing the first time it files a note there. |
| `02 - Literature Notes` | Atomic ideas that need one or more sources to be intelligible — usually several per source, nesting under Section notes when a source is long. Carry `source:`. |
| `03 - Permanent Notes` | Atomic ideas that stand alone, needing no source to make sense. May still cite origins in a body `## Sources` list, but carry no `source:` frontmatter. The vault's core. |
| `04 - MOCS` | Maps of Content. Curated navigation paths that reflect understanding, not classification. |
| `05 - Projects` | Work with a defined outcome and deadline (courses, research, writing, etc.). |
| `06 - Daily` | Daily, weekly, monthly, yearly notes. Temporal backbone and primary capture space. |
| `07 - Attachments` | Non‑markdown files: PDFs, images, diagrams. No notes here. **Flat by default — no subfolders by type, source, or date.** Attachments are storage; you find them through the note that embeds them (a link), never by browsing this folder, so structure here would be friction with no payoff. Pasted images and new attachments land here automatically (set in `.obsidian/app.json`). **One carved exception: `Screenshots/`** — see below. |
| `08 - Nexus` | Vault‑wide dashboards (reviews, reading, growth). Operational control centre. |
| `09 - Entities/Agents` | People, Organizations, Countries, Synthetic/AI systems — entities with decision-making power. |
| `09 - Entities/Non-Agents` | Places, Artifacts, Tools, Systems, Natural entities, Events — entities with structural/relational influence only. |
| `99 - Meta` | Infrastructure: templates, documentation, configuration. Supports the system itself. |

### The one attachment subfolder: `07 - Attachments/Screenshots`

Media Extended writes video screenshots to `07 - Attachments/Screenshots` (as
WEBP), set in its plugin settings. This is a deliberate exception to the flat
rule, not a lapse from it.

The flat rule exists because *hand-curated* attachments are found through the
note that embeds them, so foldering them adds friction and buys nothing. Video
screenshots are not hand-curated: a single lecture can drop dozens of them in
one sitting, they are named by the plugin rather than by you, and you never go
looking for one directly — you reach it through the note it was captured into.
Machine-generated dumps mixed into the same folder as your PDFs would make that
folder unbrowsable for the times you *do* open it.

The exception is narrow: it covers plugin-generated capture output only. Do not
read it as licence to sort attachments by type, source, or date.

## Why Folders Are Shallow

A note about memory could belong to Psychology, Neuroscience, Education, and Study Skills. Folders force a single location; **links do not**. ShadowVault minimises hierarchy to maximise connectivity.

## Navigation Philosophy

Preferred order of finding notes:  
**Links → MOCs → Search → Folders**  

- Folders are **storage**.
- Links are **understanding**.


