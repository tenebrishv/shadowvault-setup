# Plugins

ShadowVault relies on a combination of core and community plugins.

README: [README](../../README.md)

## What ships and what you install

Most community plugins listed here are bundled under `.obsidian/plugins/`, so
they work as soon as you open the vault. Their licences are reproduced in
[THIRD-PARTY-NOTICES.md](../../THIRD-PARTY-NOTICES.md).

**Media Extended and `obsidian-latex-ocr` are exceptions — you install them
yourself.** Media Extended's upstream project publishes no licence, so
ShadowVault has no right to redistribute its code and deliberately does not.
Install it from Settings → Community plugins → Browse → "Media Extended". The
vault ships its settings file, so it will pick up the configuration ShadowVault
expects as soon as it is installed. Nothing else about the YouTube workflow
changes.

`obsidian-latex-ocr` (or `obsidian-ocrlatex`) needs a local pix2tex/Texify
server running on your own machine to do anything, so bundling it under
`.obsidian/plugins/` would ship a plugin with nothing to talk to. Install it
from Settings → Community plugins → Browse, then point it at your local server
— see Installation Notes below.

## Core Plugins (Obsidian built‑in, enabled)
File Explorer, Global Search, Graph View, Backlinks, Canvas, Outgoing Links, Tag Pane, Properties, Page Preview, Daily Notes, Templates, Note Composer, Command Palette, Slash Commands, Bookmarks, Unique Note Creator (ZK Prefixer), Outline, Word Count, File Recovery.
## Required Community Plugins
| Plugin | Why needed |
|--------|-------------|
| **Templater** | Powers all templates, including `Source Capture` |
| **Dataview** | Queries for Course/Unit/Person pickers in Lectures; powers review dashboards and MOC lists |
## Recommended Community Plugins (enhance functionality)
| Plugin                           | Role                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Calendar**                     | Visual daily note navigation                                                                             |
| **Media Extended** *(install yourself — see above)* | Timestamped notes + screenshots for YouTube/video directly in Obsidian (Coursera-style capture workflow). Capture is **view-gated**: open the video in a side pane, not the inline embed. Bind hotkeys for *Add timestamp to note* / *Add screenshot to note* |
| **Tag Wrangler**                 | Bulk rename and merge tags                                                                               |
| **Kanban**                       | Visual note status tracking (e.g., Inbox → Processing → Done)                                            |
| **Natural Language Dates**       | Write "next Friday" in daily note to get a link                                                          |
| **Supercharged Links**           | Style links based on note type (e.g., red for source, green for person)                                  |
| **Metadata Menu**                | Validated dropdowns for the `growth`/`status`/`type`/`period` fields, with free typing as the bypass     |
| **Style Settings**               | UI toggles for the frontmatter-icon / Properties-collapse / link-badge CSS snippets (no snippet editing) |
| **Iconize**                      | Adds folder icons based on folder name keywords                                                          |
| **Pane Relief**                  | Pane history and navigation hotkeys                                                                      |
| **Paste URL into Selection**     | Create a link by pasting a URL over selected text                                                        |
| **File Explorer Note Count**     | Shows note counts per folder                                                                             |
| **Random Note**                  | Open a random note for review                                                                            |
| **Review**                       | Schedule notes for future review (alternative to manual `review:` field)                                 |
| **Kindle Highlights**            | Import Kindle annotations                                                                                |
| **Excalidraw**                   | Embedded hand‑drawn diagrams                                                                             |
| **Advanced Slides**              | Turn notes into slide decks                                                                              |
| **Spaced Repetition**            | Convert notes into flashcards                                                                            |
| **Smart Typography**             | Automatic typographic quotes and apostrophes                                                             |
| **Omni Search + Text Extractor** | Full‑text OCR search across images and PDFs                                                              |
| **Mindmap**                      | Render a note as a mindmap                                                                               |
| **Extended MathJax**             | Full LaTeX support                                                                                       |
| **obsidian-latex-ocr** *(install yourself — see above)* | Screenshot → LaTeX conversion via a local OCR model (pix2tex/Texify) — pastes recognized LaTeX straight into the active note. Needs a local `127.0.0.1` server; see Installation Notes below. `obsidian-ocrlatex` is an equivalent alternative with the same local-mode setup |
## Installation Notes
- After installing community plugins, you must **enable** them (toggle on).
- **Settings → ShadowVault Property Icons → Plugin health** verifies the shipped plugin set live — installed / enabled / loaded, with versions — and is the fastest way for a new adopter to confirm nothing is missing. It offers one-click **Enable** for anything installed-but-disabled — or **Enable all** when several are off at once, as on a fresh unzip — explains the **Media Extended** row (the one plugin you must install yourself, below), and its **Framework** section checks your installed release against GitHub's latest on demand. Obsidian Git is listed as *optional* and never counted against the vault: it ships switched off because git needs per-device setup, so enabling it is your call, not a fix. The registry behind it is pinned to `community-plugins.json`, the bundled plugin folders, and `framework-manifest.json` by `99 - Meta/03 - Scripts-tests/pluginHealth.test.js`, so it can't drift from what actually ships.
- For Templater, set the template folder to `99 - Meta/00 - Templates/`, and set the **User Scripts Folder** to `99 - Meta/02 - Scripts/` (required by the `Source Capture` template — see [TEMPLATES.md](TEMPLATES.md#source-capture-architecture)). Keep the User Scripts Folder outside the template folder — Templater's "Insert Template" picker lists everything under `templates_folder`, so `.js` files nested inside it would show up as if they were templates.
- **Bind a hotkey to `Move Source Note`.** Templater → Settings → **Template Hotkeys** → add `99 - Meta/00 - Templates/(TEMPLATE) Move Source Note.md`, then assign a key under Settings → Hotkeys (search for *Templater: Insert (TEMPLATE) Move Source Note*). This files the active source note out of `00 - Inbox` into its type folder under `01 - Sources`; without it the note stays in the Inbox, where the folder-scoped hub queries can't see it. It is an action, not a note template — running it inserts no text. See [TEMPLATES.md](TEMPLATES.md#filing-a-note-move-source-note).
- **Style Settings** is optional and pure enhancement. Two shipped CSS snippets carry `/* @settings */` blocks — `frontmatter-display.css` (per-field emoji icons in the Properties panel + a *Properties panel visibility* control: Always visible / Collapsed-hover-to-reveal / Hidden) and `growth-badges.css` (hide toggles for the type / growth+status / underline link badges). With Style Settings installed, these appear as switches under Settings → Style Settings ("ShadowVault — Frontmatter" and "ShadowVault — Link badges"). The snippets are written base-visible, so **without** Style Settings the vault looks exactly as before — every toggle only ever *adds* a hide/collapse class. Note the collapse mode reveals on hover/focus, not click (a CSS limit); see [ADR 0008](../../docs/adr/0008-style-settings-frontmatter-display.md). `frontmatter-display.css` targets Obsidian's Properties-panel markup, so verify it visually after an Obsidian update.
- **Metadata Menu** is optional — the vault works fully without it; it only adds validated dropdowns for the four closed-vocabulary fields (`growth`, `status`, `type`, `period`). It ships preconfigured: `.obsidian/plugins/metadata-menu/data.json` defines those four as global "Select" preset fields, so a fresh install needs no setup (a converting vault with its own Metadata Menu settings keeps them and ours lands in `_backup/_new-config/`, like Dataview's). The dropdown is opt-in — invoke it by right-clicking a property → *Update…*, or the command palette; the native Properties panel and source-mode YAML always accept free typing, which is the "easy bypass". The option lists are held identical to the canonical vocabularies by `99 - Meta/03 - Scripts-tests/metadataMenuEnums.test.js`. See [ADR 0007](../../docs/adr/0007-metadata-menu-validated-options.md).
- For Dataview, **JavaScript Queries must be enabled** (Settings → Dataview → *Enable JavaScript Queries*). The vault ships `.obsidian/plugins/dataview/data.json` with it on, so a fresh install needs no action — but if you already had Dataview settings of your own, the updater keeps yours and this must be turned on by hand. Without it, the badge-table sections of the Main and Inbox dashboards render as raw code instead of tables. Everything else in the vault is plain DQL and works either way.
- **`obsidian-latex-ocr`** (or `obsidian-ocrlatex`) needs a local OCR server to turn a screenshot into LaTeX: `pip install "pix2tex[api]"` then `python -m pix2tex.api.run` starts one at `127.0.0.1:8502` (Docker works too); point the plugin's backend URL at that address. This is a real setup cost — a local Python environment and a ~1.4 GB model download on first run, comparable to the existing Ollama-backed integrations — and it is keyless, ADR 0014 tier 0. The plugin's alternate "keyed" default (Hugging Face's hosted Inference API) is not the recommended path; its own README notes that mode is currently broken upstream, so local mode is the only one that reliably works today. Mathpix itself is tier 3 (paid API, no free tier) and not recommended, though you can point either plugin at Mathpix or SimpleTex manually if you want higher accuracy and are willing to supply your own key — see [EXTERNAL-INTEGRATIONS.md](EXTERNAL-INTEGRATIONS.md).