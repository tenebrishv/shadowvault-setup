# Setup Guide

This guide walks through installing and configuring ShadowVault from a fresh Obsidian installation.

README: [[README]]

---

## Prerequisites

- Obsidian
- Git (optional but recommended)
- GitHub account (optional)

---

## Installation

### 1: Clone or copy vault

```bash
git clone https://github.com/USERNAME/ShadowVault.git
```

Or download the ZIP and extract it.

---

### 2: Open in obsidian

Open Obsidian → **Open folder as vault** → select the `ShadowVault` folder.

---

### 3:  Enable Plugins


Go to **Settings → Community plugins → Turn on community plugins → Browse**.

Install and enable the plugins listed in [[PLUGINS]].

---

### 4. Configure Templater

- Settings → Templater → **Template folder location**: `99 - Meta/00 - Templates/`
- Enable **Trigger Templater on new file creation** (optional)
- Enable **Automatic jump to cursor** (recommended)

---

### 5. (Optional) Enable CSS snippets

- Settings → Appearance → **CSS snippets** → toggle on:    
    - `Notebook Backgrounds.css`
    - `Daily Note Themes.css`
    - `Colored Sidebar Items.css`
    - `CyanVoxel's General Tweaks.css`

Snippets are located in `.obsidian/snippets/`. If missing, copy them from the repository.

---

### 6. First run

- Open command palette (`Cmd/Ctrl + P`) → `Templater: Open Insert Template modal`
- Choose `(TEMPLATE) Source Capture`
- Select a source type and follow prompts

Your first captured note will appear in the current folder (you can move it to `01 - Sources/` later). 

---

## Troubleshooting

- **Templater error "Invalid or unexpected token"**: Ensure the Lecture section doesn’t use optional chaining (`?.`) – the provided code is safe.
- **Dataview picker shows no courses/units**: Verify that course notes have the tag `#course` and are inside `04 - MOCS/Courses/`. Unit notes must have `#course-unit` and YAML field `course: [[CourseName]]`.
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

Review [[CHANGELOG]] after each update.

---