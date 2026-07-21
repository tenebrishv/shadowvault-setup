# Plugins

ShadowVault relies on a combination of core and community plugins.

README: [README](../../README.md)

## Core Plugins (Obsidian built‑in, enabled)
File Explorer, Global Search, Graph View, Backlinks, Canvas, Outgoing Links, Tag Pane, Properties, Page Preview, Daily Notes, Templates, Note Composer, Command Palette, Slash Commands, Bookmarks, Unique Note Creator (ZK Prefixer), Outline, Word Count, File Recovery.
## Required Community Plugins
| Plugin | Why needed |
|--------|-------------|
| **Templater** | Powers all templates, including `Source Capture` |
| **Dataview** | Queries for Course/Unit/Person pickers in Lectures; powers review dashboards and MOC lists |
## Recommended Community Plugins (enhance functionality)
| Plugin                           | Role                                                                     |
| -------------------------------- | ------------------------------------------------------------------------ |
| **Calendar**                     | Visual daily note navigation                                             |
| **Tag Wrangler**                 | Bulk rename and merge tags                                               |
| **Kanban**                       | Visual note status tracking (e.g., Inbox → Processing → Done)            |
| **Natural Language Dates**       | Write "next Friday" in daily note to get a link                          |
| **Supercharged Links**           | Style links based on note type (e.g., red for source, green for person)  |
| **Metadata Menu**                | Validated dropdowns for the `growth`/`status`/`type`/`period` fields, with free typing as the bypass |
| **Style Settings**               | UI toggles for the frontmatter-icon / Properties-collapse / link-badge CSS snippets (no snippet editing) |
| **Iconize**                      | Adds folder icons based on folder name keywords                          |
| **Pane Relief**                  | Pane history and navigation hotkeys                                      |
| **Paste URL into Selection**     | Create a link by pasting a URL over selected text                        |
| **File Explorer Note Count**     | Shows note counts per folder                                             |
| **Random Note**                  | Open a random note for review                                            |
| **Review**                       | Schedule notes for future review (alternative to manual `review:` field) |
| **Kindle Highlights**            | Import Kindle annotations                                                |
| **Excalidraw**                   | Embedded hand‑drawn diagrams                                             |
| **Advanced Slides**              | Turn notes into slide decks                                              |
| **Spaced Repetition**            | Convert notes into flashcards                                            |
| **Smart Typography**             | Automatic typographic quotes and apostrophes                             |
| **Omni Search + Text Extractor** | Full‑text OCR search across images and PDFs                              |
| **Mindmap**                      | Render a note as a mindmap                                               |
| **Extended MathJax**             | Full LaTeX support                                                       |
## Installation Notes
- After installing community plugins, you must **enable** them (toggle on).
- For Templater, set the template folder to `99 - Meta/00 - Templates/`, and set the **User Scripts Folder** to `99 - Meta/02 - Scripts/` (required by the `Source Capture` template — see [TEMPLATES.md](TEMPLATES.md#source-capture-architecture)). Keep the User Scripts Folder outside the template folder — Templater's "Insert Template" picker lists everything under `templates_folder`, so `.js` files nested inside it would show up as if they were templates.
- **Style Settings** is optional and pure enhancement. Two shipped CSS snippets carry `/* @settings */` blocks — `frontmatter-display.css` (per-field emoji icons in the Properties panel + a *Properties panel visibility* control: Always visible / Collapsed-hover-to-reveal / Hidden) and `growth-badges.css` (hide toggles for the type / growth+status / underline link badges). With Style Settings installed, these appear as switches under Settings → Style Settings ("ShadowVault — Frontmatter" and "ShadowVault — Link badges"). The snippets are written base-visible, so **without** Style Settings the vault looks exactly as before — every toggle only ever *adds* a hide/collapse class. Note the collapse mode reveals on hover/focus, not click (a CSS limit); see [ADR 0008](../../docs/adr/0008-style-settings-frontmatter-display.md). `frontmatter-display.css` targets Obsidian's Properties-panel markup, so verify it visually after an Obsidian update.
- **Metadata Menu** is optional — the vault works fully without it; it only adds validated dropdowns for the four closed-vocabulary fields (`growth`, `status`, `type`, `period`). It ships preconfigured: `.obsidian/plugins/metadata-menu/data.json` defines those four as global "Select" preset fields, so a fresh install needs no setup (a converting vault with its own Metadata Menu settings keeps them and ours lands in `_backup/_new-config/`, like Dataview's). The dropdown is opt-in — invoke it by right-clicking a property → *Update…*, or the command palette; the native Properties panel and source-mode YAML always accept free typing, which is the "easy bypass". The option lists are held identical to the canonical vocabularies by `99 - Meta/03 - Scripts-tests/metadataMenuEnums.test.js`. See [ADR 0007](../../docs/adr/0007-metadata-menu-validated-options.md).
- For Dataview, **JavaScript Queries must be enabled** (Settings → Dataview → *Enable JavaScript Queries*). The vault ships `.obsidian/plugins/dataview/data.json` with it on, so a fresh install needs no action — but if you already had Dataview settings of your own, the updater keeps yours and this must be turned on by hand. Without it, the badge-table sections of the Main and Inbox dashboards render as raw code instead of tables. Everything else in the vault is plain DQL and works either way.