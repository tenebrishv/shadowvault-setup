# Roadmap – Future Improvements

This is a living document. Suggestions and pull requests welcome.

README:[README](../../README.md)

---

## Short‑Term (next 1–2 months)

- [ ] **Nexus dashboards** – create dedicated files:
  - `08 - Nexus/Dashboards.md` – Dataview queries for reviews, growth stages, unprocessed items.
  - `08 - Nexus/Library.md` – curated collection of key resources, papers, or templates (a personal library index).
- [ ] **Implement CSS snippets** – add `Notebook Backgrounds.css`, `Daily Note Themes.css`, `Colored Sidebar Items.css`, and `CyanVoxel's General Tweaks.css` to `.obsidian/snippets/`.
- [ ] **Agents folder expansion** – subfolders or naming prefixes for:
  - `People/` (individuals)
  - `Countries/` (sovereign states)
  - `Places/` (cities, regions, fictional locations)
  - `Organizations/` (profit, non‑profit, academic)
- [ ] **Lecture naming convention** – update `Source Capture` to use:
  - `§ YYYY-MM-DD – CourseCode – Lecture Title` (e.g., `§ 2025-02-14 – PSY101 – Introduction to Memory`)
- [ ] **Split source templates** – maintain a single `Source Capture` entry point but internally refactor into separate template files per source type for easier maintenance (e.g., `(TEMPLATE) Lecture.md`, `(TEMPLATE) Book.md`, etc.).
- [ ] **Unit template with semester tag** – add YAML field `semester: "YYYY-SS"` to `(TEMPLATE) Unit MOC.md`.
- [ ]  **Zotero integration** – set up Better BibTeX + Zotero Integration plugin; define highlight colour convention.
- [ ] **Media Extended OR Obsidian Web Clipper** –  Capturing web/YouTube content directly in Obsidian.

---

## Medium‑Term (3–6 months)

- [ ] **Person template enrichment** – add fields:
  ```yaml
  relationship:         # mentor, colleague, author, teacher, friend, etc.
  email:
  work:
  hobbies:
  connections:          # wikilinks to other person notes
  type: real | fictional
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

- [ ] **Geospatial metadata for Places/Countries** – add frontmatter fields:
    ```yaml
    is_sovereign: true/false
    geographic_scale: continent | country | region | city | fictional
    geo_tags: ["lat,lon", "bounding box", "timezone"]   # optional
    ```
- [ ] Integrate with Obsidian‑Leaflet or similar map plugins.
- [ ] **Groups of people** – new note type `Group` (e.g., research team, family, reading group) with YAML:
    ```yaml
    members: [Person1](Person1), [Person2](Person2)
    type: formal | informal
    purpose:
    ```

- [ ]  **Secure contact storage** – integration with external password manager (Bitwarden, 1Password) or encrypted `.env` file, never committed to Git.
- [ ] **Automated migration scripts** for old notes into the new folder/naming conventions.

---

## Ideas Under Consideration

- Use `metadata-menu` plugin to edit frontmatter via dropdowns.
- Canvas dashboard for visual navigation.
- Audio transcription via whisper.cpp for lecture notes.
- Automatic bi‑directional linking based on named entity recognition.

---

_If you have ideas, please open an issue on GitHub._


This roadmap now reflects your detailed requests while maintaining a clear priority structure.