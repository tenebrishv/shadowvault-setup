# Changelog

All notable changes to this vault are documented in this file.  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 
### Changed
- 
### Fixed
- 
### Removed
- 

## [2.0.0] – 2026-07-06

### Added
- **Entities system** — `09 - Entities/Agents/` and `09 - Entities/Non-Agents/`, replacing `09 - Agents/People/`. Classification is by decision-making power (Agents: People, Organizations, Countries, Synthetic/AI; Non-Agents: Places, Artifacts, Tools, Systems, Natural entities, Events), each a flat tag (`agent/person`, `nonagent/place`, etc.) rather than a subfolder.
- 9 new Entity templates: `(TEMPLATE) Organization.md`, `Country.md`, `Synthetic Agent.md`, `Place.md`, `Artifact.md`, `Tool.md`, `System.md`, `Natural Entity.md`, `Event.md`.
- `04 - MOCS/Entities.md` — Dataview dashboard browsing all Entity notes grouped by subtype tag.
- Lightweight Entity frontmatter schema (`type: entity`, no `id`/`growth`/`status`/`review`) documented in `METADATA.md`.

### Changed
- `(TEMPLATE) Person.md` restructured: `#person` → `agent/person` tag, free-text About callout → structured YAML (`role`, `organization`, `contact`, `website`).
- `sourceCaptureLecture.js`'s Lecturer picker now reads `09 - Entities/Agents` filtered to `agent/person`-tagged notes (that folder also holds Organizations/Countries/Synthetic agents) and stubs new Lecturer notes with the new Person schema.
- `STRUCTURE.md`, `METADATA.md`, `TEMPLATES.md`, `README.md`, `CLAUDE.md` updated to describe the Entities structure and tag vocabulary.

### Removed
- `09 - Agents/` folder and the flat `#person` tag, superseded by the Entities system above. The `ROADMAP.md` "Agents folder expansion" short-term item is likewise superseded.

**Breaking:** any existing vault content in `09 - Agents/People/` tagged `#person` must be moved to `09 - Entities/Agents/` and retagged `agent/person` to keep working with the Lecture picker and Entities MOC — hence the major version bump.

### [1.0.1] – 2026-06-02

### Fixed
- Clarified CSS snippets: Not yet implemented but planned in short term.

## [1.0.0] – 2026-06-02

### Added
- **Initial complete release of ShadowVault PKM system.**
- Source capture template for 9 types (Book, Article, Paper, YouTube, Video, Podcast, Tweet, Thought, Lecture).
- Lecture system with validated pickers for Courses, Units, and People.
- Automatic metadata fetching (ISBN, DOI, oEmbed) for supported sources.
- Full documentation split into multiple files inside `99 - Meta/01 - Documentation/`.
- CSS snippets: Notebook Backgrounds, Daily Note Themes, Colored Sidebar Items, General Tweaks.
- MIT‑style license replaced with **CC BY‑NC‑SA 4.0** (added in commit `853f87c`).

### Changed
- Converted all internal wikilinks to relative Markdown paths for better GitHub compatibility (`e085e7d`).

### Fixed
- Preserved folder structure with `.gitkeep` files.
- Merged and cleaned up repository history.

### Removed
- None.

---

[2.0.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.0.0
[1.0.0]: [https://github.com/tenebrishv/ShadowVault/releases/tag/v1.0.0](https://github.com/tenebrishv/shadowvault-setup)

