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
- For Dataview, **JavaScript Queries must be enabled** (Settings → Dataview → *Enable JavaScript Queries*). The vault ships `.obsidian/plugins/dataview/data.json` with it on, so a fresh install needs no action — but if you already had Dataview settings of your own, the updater keeps yours and this must be turned on by hand. Without it, the badge-table sections of the Main and Inbox dashboards render as raw code instead of tables. Everything else in the vault is plain DQL and works either way.