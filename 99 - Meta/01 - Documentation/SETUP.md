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

### 5. (Optional) CSS snippets — planned, not yet available

CSS snippets (notebook backgrounds, daily note themes, colored sidebar, general tweaks) are **designed but not yet implemented** — see [CSS.md](CSS.md). There is nothing to enable yet; this step will apply once the `.css` files ship.

---

### 6. First run

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

If installed through Git:

```bash
git pull
```

before opening Obsidian.

Review [CHANGELOG](../../CHANGELOG.md) after each update.

---