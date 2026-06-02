# CSS Themes & Snippets

ShadowVault prioritizes functionality over aesthetics. However, a pleasant environment encourages consistent use. The vault includes several CSS snippets for organization and visual clarity.

README:[README](../../README.md)

CSS snippets live in `.obsidian/snippets/`. Toggle them in **Settings → Appearance → CSS snippets**.

---


## Notebook Backgrounds (`Notebook Backgrounds.css`)
Apply per‑note via `cssclasses:` in frontmatter. Mix page and pen classes freely.
**Page backgrounds:**

| Class | Appearance |
|-------|-------------|
| `page-white` | Clean white page |
| `page-manila` | Warm tan / manila paper |
| `page-blueprint` | Blueprint blue with white ink |

**Pen colors** (override default ink color): `pen-black` `pen-gray` `pen-red` `pen-green` `pen-blue` `pen-purple` `pen-white`

**Modifiers:**
- `page-grid` – adds grid lines to the page background
- `recolor-images` – recolors transparent‑background images to match pen colour
- `embed-manila` / `embed-white` / `embed-blueprint` – sets background behind embedded images

Example frontmatter:
```yaml
---
cssclasses: [page-manila, pen-red, page-grid]
---
```

## Daily Note Themes (`Daily Note Themes.css`)

Seven colour schemes, one per day of the week. Applied automatically by the `(TEMPLATE) Daily Enhanced.md` via Templater.

|Day|Primary Color|
|---|---|
|Sunday|Rose / Pink|
|Monday|Red / Coral|
|Tuesday|Blue|
|Wednesday|Yellow|
|Thursday|Orange|
|Friday|Green|
|Saturday|Crimson|

Requires `cssclasses: [daily, <weekday>]` in frontmatter (lowercase weekday, e.g., `tuesday`).

## Colored Sidebar (`Colored Sidebar Items.css`)

Colors top‑level folders by numeric prefix. The colour cascade applies to all child files.

|Prefix|Color|
|---|---|
|`00`|Mint|
|`01`|Cyan|
|`02`|Light Blue|
|`03`|Blue|
|`04`|Violet|
|`05`|Purple|
|`06`|Magenta|
|`07`|Hot Red|
|`99`|Cool Gray|

## General Tweaks (`CyanVoxel's General Tweaks.css`)

Utility classes available on any note:

|Class|Effect|
|---|---|
|`image-borders`|Adds border around images|
|`center-images`|Centres all images|
|`center-titles`|Centres all headings (H1–H6)|
|`no-embed-border`|Removes border around embeds|

## Base Theme

The vault uses **Vanilla AMOLED** theme (pure black background in dark mode). Interface and editor font: **JetBrains Mono Nerd Font Mono**.

To change theme: **Settings → Appearance → Themes**.