# Media Extended v4 — capabilities for a YouTube note-taking workflow

Reference notes for the **Media Extended** plugin (aidenlx) feeding wayfinder map issue
**#26** (Coursera-style YouTube note-taking). Every claim is cited to a primary source: the
plugin's own v4 docs (`mx.aidenlx.site`), the GitHub manifest, or the copies installed in
this vault (`.obsidian/plugins/media-extended/`).

- Docs (authoritative for v4): <https://mx.aidenlx.site/docs/v4>
- Repo: <https://github.com/aidenlx/media-extended>
- Audited: 2026-07-21 against the installed plugin **v4.2.7**.

> **Provenance caveat.** v4 is a rewrite of the old v2/v3 plugin, and *future v4 releases are
> closed source* (only the v3 codebase stays MIT-open). So the docs site — not the repo — is the
> ground truth for current behavior; the repo's `main`/`master` no longer necessarily reflects
> shipped v4 internals. Source: <https://mx.aidenlx.site/docs/v4>.
>
> A separate, near-identical audit already exists on the `research/media-extended-audit` branch
> (for wayfinder **#27**); this file re-verifies its claims fresh against the live docs and frames
> them for #26. Findings agree.

---

## 0. Version (for re-verification)

- **Installed:** Media Extended `id: media-extended`, **v4.2.7**, `minAppVersion: 1.12.0`,
  `isDesktopOnly: true`. Bundles `@mx/main-daemon` `1.0.3`.
  Source: `.obsidian/plugins/media-extended/manifest.json`.
- **Latest published:** the manifest on the repo's default branch is also **4.2.7** — the vault is
  current, nothing newer to upgrade to.
  Source: <https://raw.githubusercontent.com/aidenlx/media-extended/master/manifest.json>.

---

## 1. Media / player embeds

Two *different* references, with different results:

- **Inline embed (renders MX's player inside the note)** — standard Markdown image embed with the
  URL as target; size lives in the **alt text**:

  ```markdown
  ![640x360](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
  ```

  Alt-text size accepts `widthxheight` (`640x360`), `width` only (`480`), or `xheight` only
  (`x360`, flexible width). Source: <https://mx.aidenlx.site/docs/v4/how-to/set-embed-size>.

- **Local vault media** uses Obsidian's wiki-embed instead, size after a pipe:
  `![[Lecture.mp4|640x360]]` (`|480` width-only, `|x360` height-only).
  Source: <https://mx.aidenlx.site/docs/v4/how-to/set-embed-size>.

- **Plain link (opens the player in a side tab, does NOT embed):** `[Lecture](youtube-url)`.
  Requires the **"Handle link to hosted media"** setting on (installed vault has
  `link.handle-hosted: true`). Source: <https://mx.aidenlx.site/docs/v4/how-to/load-media/hosted-service>;
  `.obsidian/plugins/media-extended/data.json`.

- **Responsive defaults:** video embeds cap at **`max-height: 60vh`** (60% of the window height) so
  they don't dominate the note, with a shared **`min-width: 400px`** (separately overridable for
  video/audio). A large size like `|1920x1080` shrinks to honor the max height.
  Source: <https://mx.aidenlx.site/docs/v4/how-to/set-embed-size>.

**Net for YouTube:** `![WxH](youtube-url)` embeds the player; `![](youtube-url)` embeds at default
size; a plain `[text](youtube-url)` link opens it in a side tab. No custom code-block/view syntax
needed.

- **Web Viewer** is a third surface: a real in-Obsidian browser that loads the actual YouTube (and
  Bilibili/Coursera) page — comments, playlists, account features — with MX layering playback
  controls, timestamp capture, screenshot, and subtitle extraction on top. It's driven by the
  **main daemon** (`@mx/main-daemon`, desktop-only) and is enabled here (`webviewer.enabled: true`).
  Source: <https://mx.aidenlx.site/docs/v4/concepts/web-viewer>;
  `.obsidian/plugins/media-extended/data.json`.

---

## 2. Timestamp / seek-link behavior

- **Fragment is `#t=`, not `?t=`.** MX intercepts a click on any link carrying a `#t=` fragment,
  finds the matching open player, and seeks it (opening the player first if closed) instead of
  navigating out to youtube.com. Source: <https://mx.aidenlx.site/docs/v4/concepts/timestamps>.

- **Hosted (YouTube) seek link** — a normal Markdown link whose URL carries `#t=SECONDS`:

  ```markdown
  [01:35](https://www.youtube.com/watch?v=xIZQRjkwV9Q#t=95)
  ```

  The fragment value is **seconds** (95 = 1:35); MX also accepts `mm:ss`.
  Source: <https://mx.aidenlx.site/docs/v4/concepts/timestamps>.

- **Local file seek link** — wiki-link with the same fragment: `[[lecture.mp4#t=1:35]]` (seconds or
  `mm:ss`). Source: <https://mx.aidenlx.site/docs/v4/concepts/timestamps>.

- **Ranges / clips:** two comma-separated times — `[[lecture.mp4#t=1:10,1:52]]`, optional `&loop`.
  Source: <https://mx.aidenlx.site/docs/v4/concepts/timestamps>.

- **Default timestamp template:** `\n- {{TIMESTAMP}}`, where `{{TIMESTAMP}}` expands to the
  generated link. Configurable. Source: <https://mx.aidenlx.site/docs/v4/concepts/templates>.

- **The tutorial's verbatim inserted line** (auto-workflow):

  ```markdown
  - [00:30](https://www.youtube.com/watch?v=UF8uR6Z6KLc#t=30) [your annotation]
  ```

  Source: <https://mx.aidenlx.site/docs/v4/tutorials/first-timestamped-note>.

---

## 3. Screenshot capture

- **Two entry points:** the player's "more options" menu, and the command palette / a right-click
  editor command (**"Media → Add screenshot"**). Source:
  <https://mx.aidenlx.site/docs/v4/how-to/capture-screenshots>.

- **Commands (verbatim set):** "Insert timestamped screenshot to note", "Clip and insert timestamped
  screenshot to note", "Add screenshot to note", "Clip and add screenshot to note", "Copy
  screenshot", "Clip and copy screenshot", "Save screenshot", "Clip and save screenshot", "Set
  current screenshot as media cover", "Clip and set screenshot as media cover".
  Source: <https://mx.aidenlx.site/docs/v4/reference/commands>.

- **Format:** **PNG / JPEG / WEBP**, chosen in settings (default WEBP). The clipboard "Copy
  screenshot" variant is **always PNG** regardless of the format setting.
  Source: <https://mx.aidenlx.site/docs/v4/how-to/capture-screenshots>.

- **Save location:** Settings → Media Extended → **Playback → Screenshot → "Screenshot location"**
  (beside the current note, or a specific folder) plus a **"Screenshot folder path"** for the
  targeted-folder mode. The installed key is **`playback.screenshot.folder-path`** (currently
  `07 - Attachments/_mx-screenshot-test`). Source:
  <https://mx.aidenlx.site/docs/v4/how-to/capture-screenshots>; `.obsidian/plugins/media-extended/data.json`.

- **Naming scheme:** `mx-img-…-pt102s.webp` (extension follows the format; `pt102s` encodes the
  capture time — 102 s). Source: <https://mx.aidenlx.site/docs/v4/how-to/capture-screenshots>.

- **Inserted markdown:**
  - plain ("Add screenshot to note"): `![[attachment/mx-img-…-pt102s.webp]]`
  - snippet ("Insert timestamped screenshot to note") pairs image + seek link, e.g.
    `- ![[attachment/mx-img-…-pt102s.webp|Lecture - 00:01:42|50]] [[lecture.mp4#t=102]]`.
  - Default screenshot-snippet template: `\n- !{{SCREENSHOT}} {{TIMESTAMP}}`, with
    `{{SCREENSHOT}}`, `{{TIMESTAMP}}`, `{{SCREENSHOT_LINK}}` variables.
  Sources: <https://mx.aidenlx.site/docs/v4/how-to/capture-screenshots>,
  <https://mx.aidenlx.site/docs/v4/concepts/templates>.

- **⚠️ YouTube frame-capture caveat (env-dependent — must be verified inside Obsidian).** The docs
  state verbatim: *"Some hosted sites block frame capture in the local player. If that happens, open
  the page through the web viewer and try again."* The docs do **not** explicitly confirm whether
  present-day YouTube frame capture succeeds in the **inline `![](youtube-url)` embed** — this is
  exactly the class of claim (frame capture / UA / bot detection) that this repo requires be proven
  with in-Obsidian DevTools evidence, not curl/Node. **Treat inline-embed YouTube screenshots as
  unproven; route the reliable path through the Web Viewer.** Sources:
  <https://mx.aidenlx.site/docs/v4/how-to/capture-screenshots>,
  <https://mx.aidenlx.site/docs/v4/concepts/web-viewer>.

---

## 4. Media Notes / Media Library auto-creation

- **Yes, MX auto-creates "media notes."** Default folder is **`media-lib`** (a root folder), and it
  is **configurable in settings**. Notes are generated via the library-view toolbar, the "Add media
  note to library" command, auto-import, or automatically when you capture a timestamp/screenshot
  with **no editor open**. Source: <https://mx.aidenlx.site/docs/v4/concepts/media-notes>.

- **Naming:** media title when metadata is available (`Introduction to Machine Learning.md`),
  otherwise a random id (`url-a1b2c3d4.md`); duplicates get suffixes.
  Source: <https://mx.aidenlx.site/docs/v4/concepts/media-notes>.

- **Injected frontmatter:** identity fields **`mx-uid`** (the library's tracking key) and a source
  field — one of **`media`** / **`video`** / **`audio`** depending on the media kind — plus
  auto-populated metadata (title, creator, description, duration, cover, publication date, and
  platform data such as YouTube view/like counts). Source:
  <https://mx.aidenlx.site/docs/v4/concepts/media-notes>.

- **Relocate / suppress:** change the media-library folder in settings; auto-import is a separate
  toggle. Source: <https://mx.aidenlx.site/docs/v4/concepts/media-notes>.
  **ShadowVault implication:** left at default, MX will create a **root `media-lib/` folder** and
  its own `mx-uid`/`video` frontmatter — this collides with the vault's numeric-prefixed folder
  scheme (`00`–`99`) and its own `id`/`type`/`growth` frontmatter schema (`METADATA.md`). If MX
  media notes are ever adopted, the folder must be repointed (e.g. under `01 - Sources/` or
  `07 - Attachments/`) and the `mx-uid`/`video` fields reconciled against or excluded from the
  schema-conformance contract (ADR 0003). *The installed `data.json` does not set a media-library
  folder key, so the default `media-lib` is currently in effect if any media note gets created.*

---

## 5. Commands, hotkeys, settings

- **Command groups** (command palette; most are hotkey-assignable via Settings → Hotkeys — MX ships
  few/no default bindings): Playback control (play/pause, forward/rewind 0.5–60 s, frame step,
  fullscreen), Playback speed (0.25×–5×, hold-to-fast-forward), Timestamps & clips (insert/copy
  variants), Screenshots (§3), Media Library (open library, import local, scan vault, import URL,
  quick switcher), Media Notes (update metadata, edit properties, open note), Setup (web-viewer,
  main-daemon, hosted-platform login), Maintenance (migrate legacy notes, release notes, clear
  history). Source: <https://mx.aidenlx.site/docs/v4/reference/commands>.

- **Timestamp-insert commands:** **"Insert timestamp snippet to note"** (full bullet+link per
  template) and **"Add timestamp link to note"** (link only). Player action-bar button: **"Take
  timestamp in last active note."** Clipboard-only variants exist ("Copy timestamp as time / as URL
  / as Obsidian URL / as library URL / as markdown link / as rich text"). Sources:
  <https://mx.aidenlx.site/docs/v4/reference/commands>,
  <https://mx.aidenlx.site/docs/v4/tutorials/first-timestamped-note>.

  > Do **not** wire the workflow to **"Take timestamp on current recording"** — that's an
  > audio-recording command that inserts a `%%REC_…%%` placeholder, not a video seek link.
  > Source: <https://mx.aidenlx.site/docs/v4/how-to/record-timestamps>.

- **Settings keys observed installed** (`.obsidian/plugins/media-extended/data.json`):
  `playback.screenshot.folder-path`, `note.embed.handle-hosted: true`, `link.handle-hosted: true`,
  `webviewer.enabled: true` (`__VERSION__: 2`, `release.previous-version: 4.2.7`). Named docs
  settings: "Screenshot location" / "Screenshot folder path", screenshot format, "Timestamp
  template", "Screenshot snippet template", "Media clip embed alias" (default `{{TIMESTAMP}}|400`),
  "Handle link to hosted media". Sources:
  <https://mx.aidenlx.site/docs/v4/how-to/capture-screenshots>,
  <https://mx.aidenlx.site/docs/v4/concepts/templates>,
  <https://mx.aidenlx.site/docs/v4/how-to/load-media/hosted-service>.

- **URI protocol:** extends `obsidian://` (no custom `mx://` scheme). `obsidian://open?...&t=SECONDS`
  for notes/local files; **`obsidian://mx-open?url=<media-url>&t=…`** or `?id=<library-id>&t=…` for
  hosted/library items; `t=` accepts Normal Play Time (seconds, `mm:ss`, ranges `10,20`); setup URIs
  `obsidian://mx-webviewer-setup` and `obsidian://mx-main-daemon-setup`.
  Source: <https://mx.aidenlx.site/docs/v4/reference/uri-protocol>.

---

## 6. Transcript / subtitle support (native)

- **Yes, native.** MX treats subtitle files as transcripts and supports **`.srt`, `.vtt`, `.ass`,
  `.ssa`**. It "turns spoken words into text you can search, navigate by clicking, and quote in your
  notes." Source: <https://mx.aidenlx.site/docs/v4/concepts/transcript>.

- **YouTube transcripts:** hosting-service subtitles from **YouTube / Bilibili / Coursera** appear
  automatically alongside local tracks "without any setup," when the service provides them.
  Source: <https://mx.aidenlx.site/docs/v4/concepts/transcript>.

- **Read-along:** click any cue to seek; the active cue highlights and auto-scrolls during playback.
  Two layouts (transcript = flowing paragraphs; subtitle = one cue/line with timestamps); optional
  spoken-word highlighting. Local subtitle files auto-pair with same-basename media (language codes
  like `en`/`fr` detected from the filename). Source:
  <https://mx.aidenlx.site/docs/v4/concepts/transcript>.

---

## 7. Doc-vs-current-workflow gaps

The current capture (`99 - Meta/02 - Scripts/sourceCaptureYoutube.js`) predates any MX adoption and
does **not** use Media Extended at all. Concrete divergences:

1. **Raw `<iframe>` instead of an MX embed.** The script emits a hard-coded
   `<iframe src="youtube-nocookie.com/embed/<id>" width="569" height="317">` (lines 64–66). That is
   a plain HTML player with **no MX integration** — clicks on timestamps can't seek it. The MX-native
   form is `![WxH](youtube-url)` (§1). Adopting MX means replacing the iframe with the Markdown embed.

2. **Wrong timestamp fragment: `?t=` vs `#t=`.** The script's stub is
   `%% [mm:ss](url?t=0) - Timestamp note %%` (line 68) — a commented-out placeholder using the
   **`?t=` query** form. MX reads/writes **`#t=` in seconds** (§2). Even un-commented, `?t=` would
   not drive the MX player. This is the single most load-bearing syntax mismatch for #26.

3. **Manual stub vs MX commands.** The script writes one commented placeholder bullet; MX supplies
   **"Insert timestamp snippet to note" / "Add timestamp link to note"** and the player "Take
   timestamp in last active note" button that write real seek links live while watching (§5). The
   workflow value of MX is precisely this live capture the script can't provide.

4. **No screenshot path.** The script has nothing for frame capture. MX offers timestamped
   screenshots (§3) — the main "Coursera-style" upgrade — but **YouTube inline-embed capture is
   unproven and likely routes through the Web Viewer** (env-dependent, §3). This needs an in-Obsidian
   test before the workflow depends on it.

5. **Media-library collision risk.** MX's default root **`media-lib/`** folder and `mx-uid`/`video`
   frontmatter (§4) conflict with the vault's `00`–`99` folders and `id`/`type`/`growth` schema. If
   media notes are adopted, repoint the folder and reconcile the frontmatter; otherwise keep MX in
   "embed + timestamp only" mode and don't trigger auto-note creation.

6. **Docs / integration tables list MX as unadopted.** `99 - Meta/01 - Documentation/EXTERNAL-INTEGRATIONS.md`
   still lists Media Extended under **Planned Integrations** ("High" priority, "Currently
   considering…"), and `ROADMAP.md` has it as an unchecked box. The plugin is in fact **installed and
   configured** (`webviewer.enabled`, `link.handle-hosted`, screenshot folder set) — so the docs lag
   the actual state and should be moved to "Implemented" with setup notes if #26 lands.
   Sources: `EXTERNAL-INTEGRATIONS.md` lines 15–24; `ROADMAP.md` line 19;
   `.obsidian/plugins/media-extended/data.json`.

7. **Inline-field / ADR context.** The script's frontmatter design already follows ADR 0005
   (frontmatter, not duplicated `key::` inline fields — comment at lines 53–55) and the pipeline's
   ADR 0006 "link to source, don't copy" model. An MX-based rewrite should preserve both: keep the
   MX embed/timestamps in the note **body**, not re-declare source metadata already in frontmatter.
