# Roadmap – Future Improvements

This is a living document. Suggestions and pull requests welcome.

README:[README](../../README.md)

---

## Short‑Term (next 1–2 months)

- [ ] **Nexus dashboards** – create dedicated files:
  - `08 - Nexus/Dashboards.md` – Dataview queries for reviews, growth stages, unprocessed items.
  - `08 - Nexus/Library.md` – curated collection of key resources, papers, or templates (a personal library index).
- [ ] **Implement CSS snippets** – add `Notebook Backgrounds.css`, `Daily Note Themes.css`, `Colored Sidebar Items.css`, and `CyanVoxel's General Tweaks.css` to `.obsidian/snippets/`.
- [x] **Lecture naming convention** – `sourceCaptureLecture.js` now titles notes `§ YYYY-MM-DD – CourseCode – Lecture Title` (e.g., `§ 2025-02-14 – PSY101 – Introduction to Memory`).
- [x] **Split source templates** — done in commit `a5ed1fd`: `Source Capture` is a thin orchestrator dispatching to per-type `sourceCapture<Type>.js` Templater User Scripts in `99 - Meta/02 - Scripts/`.
- [x] **Unit template with semester tag** – added YAML field `semester:` to `(TEMPLATE) Unit MOC.md` and to the Unit stub created inline by `sourceCaptureLecture.js`.
- [ ]  **Zotero integration** – set up Better BibTeX + Zotero Integration plugin; define highlight colour convention.
- [x] **Media Extended** – chosen as the in-Obsidian video engine; plugin installed. `sourceCaptureYoutube.js` emits the MX player embed plus `media:` and a minted `mx-uid:`, so the source note *is* MX's media-note (no `media-lib/` duplicate), and screenshots route to `07 - Attachments/Screenshots`. Capture is view-gated: watch in a side-pane player view, not the inline embed (issue #26).
- [ ] **Obsidian Web Clipper** – ship two importable templates (`Article`, `Thought`) that emit the vault's exact frontmatter and `(` / `=` filename prefixes straight into `00 - Inbox/`, plus a `SETUP.md` install step. Keyless; Interpreter is optional and must not appear in a shipped template. Blocked on one check: does Obsidian 1.13's URI allowlist suppress the confirmation dialog after the first clip? See `research/obsidian-web-clipper.md`; tracked as issues #64 (verify), #65 (templates), #66 (docs).

---

## Medium‑Term (3–6 months)

- [ ] **Person entity enrichment** – extend `agent/person`'s existing `role`/`organization`/`contact`/`website` fields with:
  ```yaml
  relationship:         # mentor, colleague, author, teacher, friend, etc.
  email:
  hobbies:
  connections:          # [[wikilinks]] to other Person entities
  real_or_fictional: real | fictional
  gender:
  contact_sensitive:    # true/false – indicates private info (stored outside vault)
  ```
- [ ]  **Privacy flags for notes** – frontmatter field `visibility:` with values:
    - `private` – never uploaded to GitHub (add to `.gitignore` or separate branch)
    - `to-publish` – may be included in public repository after review
    - `setup` – always available (templates, documentation, MOCs)
    - (Implement via Git branching or `.gitignore` patterns)
- [ ] **Automatic growth & status transitions** – Templater script or Dataview JS that:
    - Prompts user to update `growth` when note is modified after a certain threshold
    - Moves `status` from `inbox` → `active` → `archived` based on user-defined rules
- [ ] **Automatic directory relocation** – when capturing a source, automatically move the note from `00 - Inbox/` to the appropriate subfolder of `01 - Sources/` based on type.
- [ ] **Type change validation** – if a user manually edits `type:` in frontmatter, a Templater script can validate and restructure the note (add required fields, rename file prefix, etc.).

---

## Long‑Term (6+ months)

- [ ] **Extended geospatial metadata** – `nonagent/place` already has `coordinates`/`region`/`country`; extend with:
    ```yaml
    geographic_scale: continent | country | region | city | fictional
    geo_tags: ["bounding box", "timezone"]   # optional
    ```
  and add `is_sovereign: true/false` to `agent/country`.
- [ ] Integrate with Obsidian-Leaflet or similar map plugins, keyed off `nonagent/place`'s `coordinates` field.
- [ ] **Groups of people** – new Entity subtype for informal collectives (research team, family, reading group) that do not fit `agent/organization`'s formal-institution framing, e.g. `agent/group` with YAML:
    ```yaml
    members: ["[[Person1]]", "[[Person2]]"]
    formal: true/false
    purpose:
    ```

- [ ]  **Secure contact storage** – integration with external password manager (Bitwarden, 1Password) or encrypted `.env` file, never committed to Git.
- [ ] **Automated migration scripts** for old notes into the new folder/naming conventions.

---

## Ideas Under Consideration

- Use `metadata-menu` plugin to edit frontmatter via dropdowns. — done: ships preconfigured for the closed-vocabulary fields (see PLUGINS.md, ADR 0007).
- Canvas dashboard for visual navigation.
- Audio transcription via whisper.cpp for lecture notes.
- Automatic bi‑directional linking based on named entity recognition.
- Change in id's format to be like [Luhmann like ID's](https://github.com/Dyldog/luhman-obsidian-plugin) 

---

_If you have ideas, please open an issue on GitHub._


This roadmap now reflects your detailed requests while maintaining a clear priority structure.