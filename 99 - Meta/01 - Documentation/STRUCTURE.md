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
	└── Videos/  
├── 02 - Literature Notes/ # Your response to a source, in your own words  
├── 03 - Permanent Notes/ # Atomic, evergreen ideas – the vault's core  
├── 04 - MOCs/ # Maps of Content (curated pathways)  
	├── Courses/ # One MOC per academic course  
	├── Units/ # One MOC per course unit/module  
	└── Home.md # Vault entry point  
├── 05 - Projects/ # Active work with a defined outcome  
├── 06 - Daily/ # Daily, weekly, monthly, annual notes  
├── 07 - Attachments/ # Images, PDFs, diagrams  
├── 08 - Nexus/ # Dashboards and vault-wide overviews  
├── 09 - Agents/ # People notes (lecturers, authors, contacts)  
└── 99 - Meta/ # Vault infrastructure  
	├── 00 - Templates/ # All template files
		├── Sources  
	└── 01 - Documentation/ # This documentation
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
| Source (lecture) | `§ Title` | `§ Introduction to Cognition` |
| Permanent note | `YYYYMMDDHHmm Idea` | `202502141430 Learning compounds over time` |
| Daily note | `YYYYMMDD` | `20250214` |
| Weekly note | `YYYY-Www` | `2025-W07` |
| Monthly note | `YYYY-Mmm` | `2025-Feb` |
| Annual note | `YYYY-Y` | `2025-Y` |
| Course MOC | `Course Name` | `Cognitive Psychology` |
| Unit MOC | `Unit Name` | `Unit 1 – Memory Systems` |
| Person note | `Full Name` | `Dr. Eleanor Vance` |

## Special Folders
- **`00 - Inbox/`** – All new notes (except those created by Source Capture, which can be moved here manually) should land here. Process regularly.
- **`08 - Nexus/`** – Contains Dataview dashboards that aggregate information across the vault (e.g., due reviews, unprocessed inbox items).
- **`09 - Agents/`** – People notes. Every lecturer, author, or collaborator gets a note here, tagged `#person`.
-
## Folder Definitions

| Folder | Purpose |
|--------|---------|
| `00 - Inbox` | Temporary holding area. Everything starts here; nothing stays. |
| `01 - Sources` | Raw inputs (Articles, Books, Lectures, Papers, Podcasts, Videos). Original material, not interpretation. |
| `02 - Literature Notes` | Your understanding of a source: summaries, insights, takeaways in your own words. |
| `03 - Permanent Notes` | Atomic, evergreen, linked ideas. One claim per note. The vault's core. |
| `04 - MOCs` | Maps of Content. Curated navigation paths that reflect understanding, not classification. |
| `05 - Projects` | Work with a defined outcome and deadline (courses, research, writing, etc.). |
| `06 - Daily` | Daily, weekly, monthly, yearly notes. Temporal backbone and primary capture space. |
| `07 - Attachments` | Non‑markdown files: PDFs, images, diagrams. No notes here. |
| `08 - Nexus` | Vault‑wide dashboards (reviews, reading, growth). Operational control centre. |
| `09 - Agents` | People notes (authors, lecturers, researchers). Nodes in the knowledge graph. |
| `99 - Meta` | Infrastructure: templates, documentation, configuration. Supports the system itself. |

## Why Folders Are Shallow

A note about memory could belong to Psychology, Neuroscience, Education, and Study Skills. Folders force a single location; **links do not**. ShadowVault minimises hierarchy to maximise connectivity.

## Navigation Philosophy

Preferred order of finding notes:  
**Links → MOCs → Search → Folders**  

- Folders are **storage**.
- Links are **understanding**.


