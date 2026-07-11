# Changelog

All notable changes to this vault are documented in this file.  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] – 2026-07-10

### Added
- `semester:` YAML field on `(TEMPLATE) Unit MOC.md` and on the Unit stub `sourceCaptureLecture.js` creates inline.
- **Visual Badges system** — `growth`/`status`/`type` now render as emoji badges instead of plain YAML text, with a single canonical mapping documented in `METADATA.md#visual-badges`:
  - An in-note badge callout (live Dataview `choice()` expressions) under the H1 in the Permanent Note, Literature Note, Fleeting Note, and MOC templates.
  - Emoji-mapped Growth/Type columns in the Main and Inbox Nexus dashboards (Sources Dashboard intentionally left out — it uses a non-canonical status schema).
  - Supercharged Links configured (`.obsidian/plugins/supercharged-links-obsidian/data.json`) plus a hand-authored `.obsidian/snippets/growth-badges.css`: a type badge on every file in the file explorer, and type+growth+status badges on in-text `[[links]]` in both Reading mode and Live Preview — badges on the active editing line collapse back to plain link text via `.cm-active`, so they don't get in the way while typing.
- `.github/FUNDING.yml` — adds a Ko-fi Sponsor button to the repo page.

### Changed
- Lecture notes are now titled `§ YYYY-MM-DD – CourseCode – Lecture Title` instead of just the bare lecture title, per the roadmap's lecture naming convention — `sourceCaptureLecture.js`'s `noteTitle` now composes the lecture date, course, and title (falling back to today's date if none was given), matching the pattern already used by `sourceCaptureTweet.js`.

### Fixed
- `periodicNoteHelpers.js` exported `PERIOD_PRESETS`, a plain object, alongside its functions — Templater's User Scripts loader requires every exported property to be a function and refused to load the whole module ("Exported object ... must contain only functions"), breaking Daily/Weekly/Monthly/Yearly note creation entirely. `PERIOD_PRESETS` is only used internally by `resolvePeriod`, so it's no longer exported. The mocked unit test suite didn't catch this because it `require()`s the module directly, bypassing Templater's own export validation.
- Main Dashboard's growth-stage section headings used inconsistent emoji versus the README's growth-stage table (🌲 for Incubators, 🏔️ for Evergreen) — corrected to 🔆 Incubators / 🌲 Evergreen to match the canonical mapping now documented in `METADATA.md`.

## [2.1.0] – 2026-07-06

### Added
- `(TEMPLATE) Weekly.md`, `(TEMPLATE) Monthly.md`, `(TEMPLATE) Yearly.md` — the periodic note templates referenced by `WORKFLOWS.md`/`REVIEW-SYSTEM.md`/`TEMPLATES.md` but previously missing from the vault.
- `99 - Meta/02 - Scripts/periodicNoteHelpers.js` — shared Templater User Script behind all four periodic templates (anchor resolution, period label/prev/next computation, parent-period lookup), exposed as `tp.user.periodicNoteHelpers.*`, mirroring `sourceCaptureHelpers.js`. Unit tested in `periodicNoteHelpers.test.js` (36 tests total in the suite, up from 30).
- Parent-linking hierarchy — Daily → `week:`, Weekly → `month:`, Monthly → `year:` — as a frontmatter wikilink field (Dataview-queryable) plus a `↑ Parent` body link, alongside the existing prev/next navigation.
- `aliases:` field on Daily/Weekly/Monthly/Yearly frontmatter, so any period note can carry a custom name without affecting its date-based filename or the navigation/hierarchy above.
- Design Philosophy Principle 11, "Entities: Agency as the Dividing Line," reconciling the `09 - Entities/Agents` vs. `Non-Agents` folder split with Principle 2 ("Links Over Folders"); also acknowledged the Entity `growth`/`status`/`review` carve-out under Principles 4 and 9.

### Changed
- `(TEMPLATE) Daily Enhanced.md` reworked to derive weekday, heading, notes-query, and navigation from one consistent anchor date. Previously the weekday/heading parsed the filename while the notes-query/nav always meant "today" — silently wrong for backfilled notes. Now falls back to today and self-renames if the filename isn't a parseable date, same as the new periodic templates.
- `04 - MOCs` corrected to `04 - MOCS` (the folder's actual on-disk casing) across `sourceCaptureLecture.js`, its unit tests, dashboards, and all documentation — was previously inconsistent and would have broken the Lecture Course/Unit picker on a case-sensitive filesystem.
- `status` frontmatter enum documented in `METADATA.md`/`CLAUDE.md` corrected to include `active` — it was already the real default baked into the Permanent Note, Literature Note, Fleeting Note, and MOC templates; the docs were stale, not the templates.
- Various documentation corrections: stale `SETUP.md` CSS-snippet and Lecture-troubleshooting instructions, missing Templater User Scripts Folder setup step, broken/malformed links, `STRUCTURE.md`'s phantom Podcasts subfolder, README's duplicated Core Principles bullet, a `TEMPLATES.md` copy-paste artifact, overstated Luhmann/Forte lineage claims in `INSPIRATION.md`.

### Fixed
- Dataview `date(...)` calls in the periodic templates are now properly quoted — unquoted, Templater-rendered dates parse as arithmetic (bare hyphens), not date literals, silently returning empty dashboard results.

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
- Documented CSS snippets (planned, not yet implemented): Notebook Backgrounds, Daily Note Themes, Colored Sidebar Items, General Tweaks.
- MIT‑style license replaced with **CC BY‑NC‑SA 4.0** (added in commit `853f87c`).

### Changed
- Converted all internal wikilinks to relative Markdown paths for better GitHub compatibility (`e085e7d`).

### Fixed
- Preserved folder structure with `.gitkeep` files.
- Merged and cleaned up repository history.

### Removed
- None.

---

[2.2.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.2.0
[2.1.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.1.0
[2.0.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.0.0
[1.0.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v1.0.0

