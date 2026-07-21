# Changelog

All notable changes to this vault are documented in this file.  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.10.0] – 2026-07-20

> A batch of schema-shape cleanups taken while the framework still ships with
> **no captured notes** — every field rename/removal/addition below is free now
> and would be a silent-data-loss migration once adopters have real notes. No
> migration is needed for the same reason.

### Added
- **Book captures now write a `url`** (issue #23) — Book was the only source type
  with no link back to anything. The auto-fetch path derives the canonical Open
  Library page URL from the `jscmd=data` response for free; the manual path adds a
  skippable URL prompt, exactly like every other type's manual flow. Reuses the
  existing `url` field, so no vocabulary change — a Nexus "open the source"
  affordance now works for all nine types instead of eight.
- **MOC notes now carry `growth`** (issue #18) — a MOC genuinely ripens from a
  bare stub link-list (`seedling`) to a curated, annotated map (`evergreen`), and
  `WHERE growth` Dataview queries previously excluded every MOC in silence.
  `status` tracks whether a MOC is live; `growth` how developed it is. Curriculum
  MOCs (Course/Unit) remain structural and carry no `growth`.
- **The `METADATA.md` conformance test now binds each per-type field block to its
  heading** (issue #19) — the flat check pooled every yaml block into one set, so
  a field documented under the wrong heading (`isbn` under Podcast) or dropped
  from its own block (Book losing `publisher` while some other block still named
  it) stayed green. `DOC_SECTIONS` in `_frontmatterSchema.js` now maps each source
  and entity heading to the field set it must document, keyed on the type's
  contract. Heading text lives in the fixture, not the parser, so renaming a
  heading is a one-line fixture edit (ADR 0003). Both drift directions are
  mutation-proven.

### Changed
- **Literature Notes now link to their source instead of copying it** (issue #20)
  — the four hand-typed `source-title` / `source-author` / `source-type` /
  `source-url` fields (the only hyphenated names in the schema, and a duplicate of
  the Source Capture vocabulary) collapse to a single `source` wikilink to the
  captured Source note. Author, URL, and medium are read by Dataview traversal
  (`source.authors`, `source.url`, `source.file.tags`), so they live in one place
  and can't drift. The link may dangle — write it before the source note exists
  and traversal lights up once it does — and medium filtering becomes
  `WHERE contains(source.file.tags, "source/paper")`. The body `## Source
  Reference` section keeps only its `Location` anchor; Title/Author are dropped as
  the same copy one surface down. Rationale and the reference-not-value pattern are
  recorded in [ADR 0006](docs/adr/0006-literature-notes-link-to-source.md).
- **Video's `source` frontmatter field is now `platform`** (issue #22) — one word
  meant two unrelated things three lines apart (`type: source` the note-type vs.
  `source: Vimeo` the hosting platform), the same confusion that produced #21. The
  note body already called it "Platform"; the frontmatter now agrees. Video is the
  only module that wrote `source`, and no dashboard ever read it, so the rename is
  query-safe.

### Fixed
- **Fetched Book `publish_date` is floored to a 4-digit year** (issue #25) — Open
  Library returns free text ("Sep 08, 2015", bare "2018", "October 16 2017"), so
  auto-fetched books carried `publish_date` in whatever shape the record happened
  to hold, none of them matching the `YYYY` the manual `datePrompt` enforces. Any
  Dataview sort/filter on `publish_date` saw inconsistent values. It is now
  extracted to the first `\d{4}`. Audited while here: Paper's CrossRef path already
  returns a clean year, and every other type routes its date through the validated
  `datePrompt`, so Book was the sole offender.

### Removed
- **The `title` frontmatter field** (issue #17) — it copied the filename at
  creation time via `title: <% tp.file.title %>` and never updated, so any rename
  left the two silently disagreeing. Dataview already exposes the filename as
  `file.name`, nothing read the copy, and it was the only core field whose sole
  behaviour was to go stale. Removed from the Permanent/Literature/MOC/Fleeting
  templates, the two shipped MOC notes (`Home`, `Entities`), the schema fixture,
  and `METADATA.md`.

## [2.9.0] – 2026-07-20

> [!warning] Upgrade note — run **Templater: Reload templates**
> This moves the Source Capture orchestrator into a new user script. Templater caches loaded user scripts, so after pulling, run the **Templater: Reload templates** command (or restart Obsidian) before the next capture — otherwise `tp.user.sourceCaptureOrchestrator` won't resolve and the template will fail.

### Changed
- **The Source Capture orchestrator moved out of the template and behind the user-script seam** (issue #13). `(TEMPLATE) Source Capture.md` is now a one-line adapter — `tR = await tp.user.sourceCaptureOrchestrator(tp)` — and everything it used to do (type picker, dispatch, frontmatter/body assembly, file rename) lives in `02 - Scripts/sourceCaptureOrchestrator.js`. The vault's most integration-prone logic was previously the only logic with **zero** automated coverage, because the mocked-`tp` suite cannot reach code embedded in a markdown template; it now has end-to-end tests through the same doubles every per-type module already uses. The untestable surface of the vault is one line.
- **The five parallel type tables became one registry.** `TYPE_LABELS`/`TYPE_ICONS`/`TYPE_TAGS`/`TYPE_PREFIX`/`TYPE_CAPTURERS` are now a single `TYPE_REGISTRY`, one row per source type carrying all five values. Adding a source type is one registry row plus one capture module, instead of five edits where forgetting any one shipped a half-registered type. A completeness test covers the nine rows. Note that prefixes are deliberately **not** unique — Video and YouTube both use `+`, as the filename-prefix convention has always specified.
- **One `sanitizeTitle` helper replaces five copies of the filename-cleaning regex.** The regex existed in `(TEMPLATE) Source Capture.md`, `sourceCaptureLecture.js`, `sourceCaptureTweet.js`, and *twice* in `sourceCaptureYoutube.js` — in two incompatible variants. A future rule change now lands once.
- **The repeated fetch-with-fallback skeleton is now `helpers.fetchWithFallback`.** Book, Article, Paper, YouTube and Tweet each hand-rolled the identical try-fetch → success Notice / catch → failure Notice → manual-prompt flow; each now supplies only its genuinely per-type parts (which API, which fields, which prompts). The manual-only types (Video, Podcast, Thought) are untouched. Success and failure Notice wording and timing are defined once and can no longer drift per type.
  - Because that wording is now shared, some Notice **text** changed even though the notes produced did not. The most visible: YouTube's success Notice was `Fetched: <video title>` and is now `Fetched YouTube data`, matching every other type. Notices are transient UI, not capture output — the produced notes stay byte-identical apart from the YouTube filename fix below.

### Fixed
- **YouTube titles are now cleaned by the same rules as every other source type.** The YouTube-only regex variant kept `*`, `?`, `<` and `>` — all illegal in Windows filenames — so a video titled `What?! <Part 1>` produced a filename the vault's own conventions reject. It now strips them like every other type. This is the one user-visible behaviour change in this entry; capture output is otherwise byte-identical.
- **A failed article fetch now tells you so.** Article capture was the only auto-fetching type with no failure Notice — it silently fell through to prompts labelled "(auto-fetch failed)". It now announces the failure like Book, Paper, YouTube and Tweet always did.
- **ISBN lookup works again.** Book capture called `openlibrary.org/isbn/<isbn>.json`, which answers **302**; a redirect is not an ok response, so *every* ISBN fell through to manual entry while Open Library was perfectly healthy. It now calls `/api/books?bibkeys=ISBN:<isbn>&format=json&jscmd=data`, which answers 200. The old endpoint was also hiding a second bug: its author entries are bare `{key}` references with no name, so `authors` would have been `"undefined"` had the fetch ever succeeded — the new endpoint inlines author names. Found during the manual Obsidian pass; the mocked test described a response shape neither endpoint returns, so the suite stayed green against broken behaviour. That fixture is now a trimmed copy of a real response, with a note to re-probe the live API before editing it.
- **ISBN lookup works from inside Obsidian again.** Open Library's API returns **429 to any `User-Agent` matching `/obsidian/i`, regardless of request rate** — and Obsidian's own HTTP clients send a UA containing "obsidian", so every lookup was refused before it began. This was never a rate limit and never tied to a particular ISBN; it failed identically for everyone. Book capture now sends a descriptive non-Obsidian UA (`ShadowVault/…`), which Open Library accepts, identifying the app per their stated policy without tripping the filter.
- **Auto-fetch now uses Obsidian's `requestUrl` instead of the browser `fetch`.** Templater user scripts run in the renderer at origin `app://obsidian.md`, so `fetch` enforces CORS — and an API that sets `Access-Control-Allow-Origin` on success may omit it on its *error* pages (Open Library's 429 did exactly that, so the browser blocked the response before the code could read the status and the real cause never reached the console). `requestUrl` issues the request from Obsidian's main process, where CORS does not apply, and returns the status either way; it also lets a request set its own `User-Agent`, which the ISBN fix above needs. Applied to all five auto-fetching types. Article, Tweet and YouTube also never checked the response status at all — they parsed error pages and failed incidentally; the shared `httpGetJson` helper now raises a real `HTTP <status>` error, which is what the console shows.
- **A quote in a title no longer corrupts the entire frontmatter block.** Quoted YAML scalars were built by raw string concatenation, so a value containing `"` closed the scalar early — a video titled `"HASTA DICIEMBRE VOY A ESTAR" 🗣️ SCALONI` produced `aliases:\n  - ""HASTA DICIEMBRE VOY A ESTAR" 🗣️ SCALONI"`, which is invalid YAML. Obsidian then failed to parse *every* field in the note, not just that one. Values now pass through a `yamlQuote` helper that escapes `\` and `"` and folds newlines, applied at the two shared seams (`yamlField`, `buildBaseYaml`) plus Lecture's hand-built wikilink fields — so all nine types are covered at once. Emoji were never the problem and pass through unchanged.

## [2.8.0] – 2026-07-20

### Added
- **`channel_url` and `thumbnail` frontmatter fields** on YouTube captures. Both values were already fetched from oEmbed but were reachable only inside the body callout — the channel URL buried in a markdown link, the thumbnail behind `thumbnail::`. As frontmatter they are queryable through `file.frontmatter.*` like every other field, so a dashboard can render video cards or group by channel. Net capability is higher than before the fix, not lower.
- **Inline-field conformance check** — `frontmatterSchema.test.js` now reads each capture module's `body` as well as its frontmatter, and enforces two clauses: a module's inline field names must be disjoint from its own frontmatter field names (case-insensitively — Dataview canonicalises inline keys, so `Course::` *is* `course:`), and any `::` field a module writes must be emitted **empty**. The allowlist of legitimate placeholders is hand-transcribed in `CAPTURE_INLINE_PLACEHOLDERS`, so a new `key::` cannot appear without a human writing it down. Both clauses are mutation-tested. Rationale in `docs/adr/0005` (issue #21).

### Fixed
- **Capture modules no longer declare the same field twice** — Article, YouTube, Video, Podcast and Lecture wrote the same key to both frontmatter and an inline `key::` in the body callout. Dataview merges same-named declarations from the two surfaces into one array, so `p.channel` on a YouTube note was `["Some Channel", <link to Some Channel>]` — the same value twice, and a `TABLE channel` rendered it twice. The callouts now use plain markdown (`**Channel:** [Name](url)`), which renders **identically** — the `[text](url)` always made the link; the `::` only ever made the duplicate. This replaces 2.7.0's display-layer workaround at the source; the dashboards' `file.frontmatter.*` accessor stays correct and is now merely belt-and-braces.
  - Issue #21 filed this as 4 keys in 4 modules; it was **18 collisions in 5**. `sourceCaptureLecture.js` was listed as unaffected but collided on `course`/`unit`/`lecturer` through case-insensitive canonicalisation, hidden because its own generated query uses `contains()`, which stays true on a duplicated array. A second category was missing entirely — the same value under two *different* names (`publish_date:`/`published::`, `source:`/`platform::`, `date_given:`/`Date::`), which no name-collision check would ever catch.
  - `sourceCaptureYoutube.js` also emitted `released:` **and** an empty `> released::`. Harmless until someone filled one in, at which point which one they picked decided whether the dashboards saw the value. Removed.
- **No migration needed** — the framework ships with no captured notes, and #21 was found before first use.

## [2.7.0] – 2026-07-20

> [!warning] Upgrade note — enable Dataview's JavaScript Queries
> The Main and Inbox dashboards now render badges through a shared Dataview view, which requires **Settings → Dataview → Enable JavaScript Queries**. Fresh installs get this from the shipped `.obsidian/plugins/dataview/data.json`. **If you already had Dataview settings of your own, the updater keeps them** (`data.json` is `config`-class, so your file wins and the framework's copy goes to `_backup/_new-config/`) — turn the setting on by hand, or those sections will render as raw code. Everything else in the vault is plain DQL and is unaffected.

### Added
- **Shared badge view** — `99 - Meta/05 - Views/badge-table/view.js` is now the vault's one growth/status/type emoji renderer. The eight inline `choice(…)` cascades across the two dashboards are gone; call sites pass `{pages, columns}` and keep their own query. DQL has no user-function seam, so the four badge-bearing queries became `dataviewjs` blocks — the vault's first. Rationale, rejected alternatives, and the ongoing two-query-languages cost are recorded in `docs/adr/0004` (issue #15).
- **Dashboard enum conformance test** — `99 - Meta/03 - Scripts-tests/dashboardEnums.test.js` asserts that every `status`/`growth`/`type`/`period` literal in an `08 - Nexus/` dashboard or periodic-note query is a member of the enums in `_frontmatterSchema.js`, and that the badge view's maps are total over those enums and identical to `METADATA.md`'s badge tables. `frontmatterSchema.test.js` pins what the vault *writes*; this pins what it *reads*. A stale literal now fails the suite instead of silently matching nothing.
- **"⚠️ Unfiled" section on the Sources Dashboard** — catches any source whose `status` falls outside the canonical enum. It should always be empty; anything in it is a typo, a hand-edit, or a query written against a stale vocabulary.

### Changed
- **Sources Dashboard realigned to the canonical schema** — every query on it filtered `status` on `reading`/`unread`/`processed` and displayed `medium`/`author`/`date-added`, none of which any producer has ever written, so the dashboard rendered empty for real vault content. Sections are now keyed on the documented lifecycle (Queue = `inbox`, Currently Reading = `processing` or `active`, Completed = `completed`; `archived` deliberately excluded), and captured sources appear the moment they are captured. **This supersedes the 2.2.0 note calling the Sources Dashboard's non-canonical status schema intentional** — it was drift, not design.
- **Source columns are coalesced by meaning, not by field** — no creator field is common to all eight source types (`authors` for book/article/paper, `channel` for youtube/video, `host` for podcast, `account` for tweet, `lecturer` for lecture), so a literal per-field column set would be mostly blank. The dashboards show a single "Creator" and "Published" column resolved across those fields.
- **"By Medium" → "By Source Type"** — regrouped on the `source/*` tag every capture actually writes, instead of a `medium` field only entity notes have.
- **Main Dashboard's reading queue** now filters on the canonical statuses and shows a Status badge, Creator, and Published.
- **`type != "daily"` → `type != "periodic"`** in `(TEMPLATE) Daily Enhanced.md`, `(TEMPLATE) Weekly.md`, and `(TEMPLATE) Monthly.md`. The old filter excluded nothing after 2.6.0 renamed the value, so every periodic note leaked into every other periodic note's "Notes Created" list. Flagged by #12 and fixed here as a named scope extension.
- **`METADATA.md#visual-badges` propagation list** now points at the shared view rather than the dashboards, and the mapping's agreement with the docs is machine-checked.
- **Source columns read `file.frontmatter.*`, not the bare field** — the Article/YouTube/Video/Podcast capture modules write `authors`/`channel`/`host`/`released` **twice**, once in frontmatter and once as an inline `field::` in the source callout, and Dataview merges same-named inline and frontmatter fields into one array. The bare field therefore renders each value twice, once as a string and once as a link. Going through `file.frontmatter` takes the canonical copy while leaving genuine multi-value lists (a book's several `authors`) intact. This is a display-layer workaround; the underlying double-write is [#21](https://github.com/tenebrishv/shadowvault-setup/issues/21).

### Removed
- **"⭐ Highest Rated" section on the Sources Dashboard** — `rating` appeared nowhere in the vault except that query: no template, no capture module, not in the schema vocabulary. Adding a producer would be a schema change, which belongs to a follow-up rather than a realignment.

## [2.6.0] – 2026-07-18

### Added
- **Frontmatter schema conformance test** — a single fixture (`99 - Meta/03 - Scripts-tests/_frontmatterSchema.js`) now describes core fields, per-type fields, and enum values, and `frontmatterSchema.test.js` checks every producer against it: all 21 templates (enumerated from disk, so a new template cannot opt out by being forgotten), the `buildBaseYaml` helper, all 9 capture modules invoked down their manual-prompt fallback, and `METADATA.md`'s own field tables. Still zero dependencies — `node --test`, no install step (issue #12).
- **`period` frontmatter field** on periodic notes — `daily | weekly | monthly | quarterly | half-yearly | yearly`. Calendar grain now lives in its own field so adding a quarterly or half-yearly note later needs no new `type` value and no badge changes. `quarterly` and `half-yearly` are reserved ahead of their templates so the spelling is inherited, not invented.
- **Course `default_lecturer` self-populates** — when the lecture flow creates a brand-new Course, the lecturer picked for that first capture is written back as `default_lecturer: "[[Name]]"`, so the picker pre-selects them on the next capture without hand-editing YAML. `pickLecturer` also normalizes every form the field is written in (`Name`, `"[[Name]]"`, unquoted `[[Name]]`).

### Changed
- **Lecture stubs are now born from the template files** — `sourceCaptureLecture.js` no longer hand-writes Course/Unit/Person stub content as inline strings; it creates missing notes *from* `(TEMPLATE) Course MOC.md` / `(TEMPLATE) Unit MOC.md` / `(TEMPLATE) Person.md` via Templater (`tp.file.find_tfile` + `tp.file.create_new`), then fills picker-known frontmatter (`course` on new Units) via `processFrontMatter`. The template file is the single source of note shape, so stub-born and manually templated notes are identical by construction (issue: architecture review, candidate 1).
- **Course template reconciled to the union of the two drifted shapes** — `(TEMPLATE) Course MOC.md` keeps `institution`, the Course Info callout, `## Units`, and `## Lectures`, and gains the `## Core Concepts` section that stub-born courses always had.
- **Link-affordance comments** — the unset link-valued fields `default_lecturer` (Course) and `course` (Unit) now carry their hint as a YAML comment (`default_lecturer: # "[[link to an agent/person]]"`) instead of a bare `[[]]` value, which parsed as a truthy nested array and could poison the lecturer picker's default. Documented in `METADATA.md`.
- **`type: periodic` replaces `type: daily`** — the Daily/Weekly/Monthly/Yearly templates never emitted a `type` at all, so periodic notes had no type to query or badge on. All four now emit `type: periodic` plus their `period`. The vestigial `daily` value is dropped from the enum (no producer ever wrote it) and `📆 Periodic` added to the badge table in `METADATA.md`. **The dashboards are not yet updated to match**: the `choice(type=…)` badge cascades in `08 - Nexus/` still have a `daily` arm and no `periodic` arm, so periodic notes continue to render a blank Type badge until the dashboards realignment lands. Likewise the Weekly/Monthly templates still filter `AND type != "daily"`, which no longer excludes anything — both are the dashboards issue's to fix, against the enums this change pins.
- **Course and Unit MOCs now emit `type: moc`** — they previously carried no `type`, so `WHERE type = "moc"` missed them entirely and their Type badge rendered blank.
- **`METADATA.md` reconciled against what the pipeline actually writes.** Nine disagreements fixed: `publish` (emitted, undocumented) and `modified` (emitted by three templates, undocumented) are now documented; `abstract` is removed from the Paper field list (it is written into the body, not the frontmatter); Literature's `source-*` fields, the Course/Unit MOC schema, and the periodic schema all gained sections; the `Weekly`/`Monthly`/`Yearly` tags were added to the tag table. The core-fields heading no longer claims the fields are "present on all notes" — that phrasing was false for every entity, curriculum, and periodic note, and it is what licensed the drift.
- **`title` documented as template-only** — it is written by the Permanent/Literature/MOC/Fleeting templates and never by Source Capture, which carries the title in the filename instead. (Issue #12 assumed nothing emitted it; that was not accurate.)
- **`(TEMPLATE) Natural Entity.md`** now quotes its alias like its ten sibling entity templates.

> **Note:** 2.6.0 also contains the lecture-stub work that was briefly staged as a
> 2.5.0 section (commit `Cut 2.5.0`). That version was never tagged or published —
> its tree predates the manifest-regeneration step, so releasing it would have
> shipped a `framework-manifest.json` claiming 2.4.0 and broken the updater's
> version gate. The entries were folded here instead; no version 2.5.0 exists.

## [2.4.0] – 2026-07-17

### Changed
- **Default file locations** (`.obsidian/app.json`) — new notes now default to `00 - Inbox` (`newFileLocation`/`newFileFolderPath`) and pasted images / new attachments default to `07 - Attachments` (`attachmentFolderPath`), so the capture-then-process flow works without manually moving files. `SETUP.md` documents both under a new "Files & Links" step (issue #2).
- **Attachment organization rule** — `07 - Attachments` is one flat folder: no subfolders by type, source, or date. Attachments are storage found through the embedding note's link, not by browsing, so structure there would be friction with no payoff. Documented in `STRUCTURE.md`'s folder definitions (issue #2).

## [2.3.0] – 2026-07-11

### Added
- **Framework update system** — vaults can now update to new releases without git and without touching the owner's notes:
  - `framework-manifest.json` (vault root, machine-generated) — the versioned list of framework-owned files with SHA-256 hashes; the single source of truth for what an update may touch.
  - `99 - Meta/04 - Tooling/update-vault.ps1` / `update-vault.sh` — cross-platform updater: fetches the latest GitHub release, overwrites only manifest-listed files, backs up user-modified `core` files to `99 - Meta/05 - Backups/` before overwriting, never overwrites user-modified `config` files (`.obsidian` settings — the new version is saved alongside the backups for manual diffing), applies framework deletions, and writes an `update-report.md`. Supports `-DryRun`/`--dry-run`, `-ZipPath`/`--zip-path` (offline), `-Force`, `-Yes`.
  - `99 - Meta/04 - Tooling/generate-manifest.ps1` — dev-side manifest generator with a git drift check, run when cutting a release.
  - `99 - Meta/01 - Documentation/UPDATING.md` — end-user updating guide; `SETUP.md`'s "Updating the Vault" section and the README Quick Start now point to it.

## [2.2.0] – 2026-07-10

### Added
- `semester:` YAML field on `(TEMPLATE) Unit MOC.md` and on the Unit stub `sourceCaptureLecture.js` creates inline.
- **Visual Badges system** — `growth`/`status`/`type` now render as emoji badges instead of plain YAML text, with a single canonical mapping documented in `METADATA.md#visual-badges`:
  - An in-note badge callout (live Dataview `choice()` expressions) under the H1 in the Permanent Note, Literature Note, Fleeting Note, and MOC templates.
  - Emoji-mapped Growth/Type columns in the Main and Inbox Nexus dashboards (Sources Dashboard intentionally left out — it uses a non-canonical status schema). *(Superseded in Unreleased: the Sources Dashboard's schema was drift, not a deliberate exception, and is now realigned. Badges are no longer inline in any dashboard.)*
  - Supercharged Links configured (`.obsidian/plugins/supercharged-links-obsidian/data.json`) plus a hand-authored `.obsidian/snippets/growth-badges.css`: a type badge on every file in the file explorer, and type+growth+status badges on in-text `[[links]]` in both Reading mode and Live Preview — badges on the active editing line collapse back to plain link text via `.cm-active`, so they don't get in the way while typing.
- `.github/FUNDING.yml` — adds a Ko-fi Sponsor button to the repo page.

### Changed
- Lecture notes are now titled `§ YYYY-MM-DD – CourseCode – Lecture Title` instead of just the bare lecture title, per the roadmap's lecture naming convention — `sourceCaptureLecture.js`'s `noteTitle` now composes the lecture date, course, and title (falling back to today's date if none was given), matching the pattern already used by `sourceCaptureTweet.js`.

### Fixed
- `periodicNoteHelpers.js` exported `PERIOD_PRESETS`, a plain object, alongside its functions — Templater's User Scripts loader requires every exported property to be a function and refused to load the whole module ("Exported object ... must contain only functions"), breaking Daily/Weekly/Monthly/Yearly note creation entirely. `PERIOD_PRESETS` is only used internally by `resolvePeriod`, so it's no longer exported. The mocked unit test suite didn't catch this because it `require()`s the module directly, bypassing Templater's own export validation.
- Main Dashboard's growth-stage section headings used inconsistent emoji versus the README's growth-stage table (🌲 for Incubators, 🏔️ for Evergreen) — corrected to 🔆 Incubators / 🌲 Evergreen to match the canonical mapping now documented in `METADATA.md`.

## [2.1.0] – 2026-07-06

### Added
- `(TEMPLATE) Weekly.md`, `(TEMPLATE) Monthly.md`, `(TEMPLATE) Yearly.md` — the periodic note templates referenced by `WORKFLOWS.md`/`REVIEW-SYSTEM.md`/`TEMPLATES.md` but previously missing from the vault.
- `99 - Meta/02 - Scripts/periodicNoteHelpers.js` — shared Templater User Script behind all four periodic templates (anchor resolution, period label/prev/next computation, parent-period lookup), exposed as `tp.user.periodicNoteHelpers.*`, mirroring `sourceCaptureHelpers.js`. Unit tested in `periodicNoteHelpers.test.js` (36 tests total in the suite, up from 30).
- Parent-linking hierarchy — Daily → `week:`, Weekly → `month:`, Monthly → `year:` — as a frontmatter wikilink field (Dataview-queryable) plus a `↑ Parent` body link, alongside the existing prev/next navigation.
- `aliases:` field on Daily/Weekly/Monthly/Yearly frontmatter, so any period note can carry a custom name without affecting its date-based filename or the navigation/hierarchy above.
- Design Philosophy Principle 11, "Entities: Agency as the Dividing Line," reconciling the `09 - Entities/Agents` vs. `Non-Agents` folder split with Principle 2 ("Links Over Folders"); also acknowledged the Entity `growth`/`status`/`review` carve-out under Principles 4 and 9.

### Changed
- `(TEMPLATE) Daily Enhanced.md` reworked to derive weekday, heading, notes-query, and navigation from one consistent anchor date. Previously the weekday/heading parsed the filename while the notes-query/nav always meant "today" — silently wrong for backfilled notes. Now falls back to today and self-renames if the filename isn't a parseable date, same as the new periodic templates.
- `04 - MOCs` corrected to `04 - MOCS` (the folder's actual on-disk casing) across `sourceCaptureLecture.js`, its unit tests, dashboards, and all documentation — was previously inconsistent and would have broken the Lecture Course/Unit picker on a case-sensitive filesystem.
- `status` frontmatter enum documented in `METADATA.md`/`CLAUDE.md` corrected to include `active` — it was already the real default baked into the Permanent Note, Literature Note, Fleeting Note, and MOC templates; the docs were stale, not the templates.
- Various documentation corrections: stale `SETUP.md` CSS-snippet and Lecture-troubleshooting instructions, missing Templater User Scripts Folder setup step, broken/malformed links, `STRUCTURE.md`'s phantom Podcasts subfolder, README's duplicated Core Principles bullet, a `TEMPLATES.md` copy-paste artifact, overstated Luhmann/Forte lineage claims in `INSPIRATION.md`.

### Fixed
- Dataview `date(...)` calls in the periodic templates are now properly quoted — unquoted, Templater-rendered dates parse as arithmetic (bare hyphens), not date literals, silently returning empty dashboard results.

## [2.0.0] – 2026-07-06

### Added
- **Entities system** — `09 - Entities/Agents/` and `09 - Entities/Non-Agents/`, replacing `09 - Agents/People/`. Classification is by decision-making power (Agents: People, Organizations, Countries, Synthetic/AI; Non-Agents: Places, Artifacts, Tools, Systems, Natural entities, Events), each a flat tag (`agent/person`, `nonagent/place`, etc.) rather than a subfolder.
- 9 new Entity templates: `(TEMPLATE) Organization.md`, `Country.md`, `Synthetic Agent.md`, `Place.md`, `Artifact.md`, `Tool.md`, `System.md`, `Natural Entity.md`, `Event.md`.
- `04 - MOCS/Entities.md` — Dataview dashboard browsing all Entity notes grouped by subtype tag.
- Lightweight Entity frontmatter schema (`type: entity`, no `id`/`growth`/`status`/`review`) documented in `METADATA.md`.

### Changed
- `(TEMPLATE) Person.md` restructured: `#person` → `agent/person` tag, free-text About callout → structured YAML (`role`, `organization`, `contact`, `website`).
- `sourceCaptureLecture.js`'s Lecturer picker now reads `09 - Entities/Agents` filtered to `agent/person`-tagged notes (that folder also holds Organizations/Countries/Synthetic agents) and stubs new Lecturer notes with the new Person schema.
- `STRUCTURE.md`, `METADATA.md`, `TEMPLATES.md`, `README.md`, `CLAUDE.md` updated to describe the Entities structure and tag vocabulary.

### Removed
- `09 - Agents/` folder and the flat `#person` tag, superseded by the Entities system above. The `ROADMAP.md` "Agents folder expansion" short-term item is likewise superseded.

**Breaking:** any existing vault content in `09 - Agents/People/` tagged `#person` must be moved to `09 - Entities/Agents/` and retagged `agent/person` to keep working with the Lecture picker and Entities MOC — hence the major version bump.

### [1.0.1] – 2026-06-02

### Fixed
- Clarified CSS snippets: Not yet implemented but planned in short term.

## [1.0.0] – 2026-06-02

### Added
- **Initial complete release of ShadowVault PKM system.**
- Source capture template for 9 types (Book, Article, Paper, YouTube, Video, Podcast, Tweet, Thought, Lecture).
- Lecture system with validated pickers for Courses, Units, and People.
- Automatic metadata fetching (ISBN, DOI, oEmbed) for supported sources.
- Full documentation split into multiple files inside `99 - Meta/01 - Documentation/`.
- Documented CSS snippets (planned, not yet implemented): Notebook Backgrounds, Daily Note Themes, Colored Sidebar Items, General Tweaks.
- MIT‑style license replaced with **CC BY‑NC‑SA 4.0** (added in commit `853f87c`).

### Changed
- Converted all internal wikilinks to relative Markdown paths for better GitHub compatibility (`e085e7d`).

### Fixed
- Preserved folder structure with `.gitkeep` files.
- Merged and cleaned up repository history.

### Removed
- None.

---

[Unreleased]: https://github.com/tenebrishv/shadowvault-setup/compare/v2.10.0...HEAD
[2.10.0]: https://github.com/tenebrishv/shadowvault-setup/compare/v2.9.0...v2.10.0
[2.9.0]: https://github.com/tenebrishv/shadowvault-setup/compare/v2.8.0...v2.9.0
[2.8.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.8.0
[2.7.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.7.0
[2.6.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.6.0
[2.4.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.4.0
[2.3.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.3.0
[2.2.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.2.0
[2.1.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.1.0
[2.0.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v2.0.0
[1.0.0]: https://github.com/tenebrishv/shadowvault-setup/releases/tag/v1.0.0

