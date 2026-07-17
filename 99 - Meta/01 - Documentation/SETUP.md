# Setup Guide

This guide walks through installing and configuring ShadowVault from a fresh Obsidian installation.

README: [README](../../README.md)

---

## Prerequisites

- Obsidian
- Git (optional but recommended)
- GitHub account (optional)

---

## Installation

### 1: Clone or copy vault

```bash
git clone https://github.com/tenebrishv/shadowvault-setup.git
```

Or download the ZIP and extract it.

---

### 2: Open in obsidian

Open Obsidian → **Open folder as vault** → select the `ShadowVault` folder.

---

### 3:  Enable Plugins


Go to **Settings → Community plugins → Turn on community plugins → Browse**.

Install and enable the plugins listed in [PLUGINS](PLUGINS.md).

---

### 4. Configure Templater

- Settings → Templater → **Template folder location**: `99 - Meta/00 - Templates/`
- Settings → Templater → **User Scripts folder location**: `99 - Meta/02 - Scripts/` — **required** for `Source Capture` to work, since its per-type logic lives there as Templater User Scripts (see [TEMPLATES.md#source-capture-architecture](TEMPLATES.md#source-capture-architecture)). Already set in this vault's `.obsidian/plugins/templater-obsidian/data.json`, but re-check this after cloning fresh.
- Enable **Trigger Templater on new file creation** (optional)
- Enable **Automatic jump to cursor** (recommended)

---

### 5. Files & Links

These ship pre-set in this vault's `.obsidian/app.json`, so a fresh clone already has them — verify under **Settings → Files and links** if anything looks off:

- **Default location for new notes**: `In the folder specified below` → `00 - Inbox`. Everything starts in the Inbox and gets processed out (Source Capture notes can be moved there manually).
- **Default location for new attachments**: `In the folder specified below` → `07 - Attachments`. Pasted images and new attachments all land in one flat folder — see the [attachment rule in STRUCTURE.md](STRUCTURE.md#folder-definitions).

---

### 6. (Optional) CSS snippets — planned, not yet available

CSS snippets (notebook backgrounds, daily note themes, colored sidebar, general tweaks) are **designed but not yet implemented** — see [CSS.md](CSS.md). There is nothing to enable yet; this step will apply once the `.css` files ship.

---

### 7. First run

- Open command palette (`Cmd/Ctrl + P`) → `Templater: Open Insert Template modal`
- Choose `(TEMPLATE) Source Capture`
- Select a source type and follow prompts

Your first captured note will appear in the current folder (you can move it to `01 - Sources/` later). 

---

## Troubleshooting

- **Templater error "Invalid or unexpected token"**: Confirm the **User Scripts folder location** points at `99 - Meta/02 - Scripts/` and run **Templater: Reload templates** (it caches loaded user scripts). If a script was edited, ensure it doesn't use syntax your Obsidian's JS engine rejects (e.g. optional chaining `?.` on older installs) — see `sourceCaptureLecture.js` and the other `sourceCapture*.js` modules.
- **Dataview picker shows no courses/units**: Verify that course notes have the tag `#course` and are inside `04 - MOCS/Courses/`. Unit notes must have `#course-unit` and YAML field `course: [CourseName](CourseName)`.
- **New course/unit/person not created**: Check that helper templates exist in `99 - Meta/00 - Templates/` with exact names:
    - `(TEMPLATE) Course MOC.md`
    - `(TEMPLATE) Unit MOC.md`
    - `(TEMPLATE) Person.md`

---

## Updating the Vault

Close Obsidian, then run the updater for your OS:

```powershell
powershell -ExecutionPolicy Bypass -File "99 - Meta/04 - Tooling/update-vault.ps1"
```

```bash
bash "99 - Meta/04 - Tooling/update-vault.sh"
```

It touches only framework-owned files (templates, scripts, docs, dashboards) — your notes are never modified. Full guide, flags, and troubleshooting: [UPDATING](UPDATING.md).

Review [CHANGELOG](../../CHANGELOG.md) after each update.

---