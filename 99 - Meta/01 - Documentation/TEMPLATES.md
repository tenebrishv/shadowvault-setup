# Templates

Templates are the backbone of ShadowVault.

They enforce consistency, automate metadata generation, and reduce friction during capture and processing.

README: [README](../../README.md)

All templates are stored in `99 - Meta/00 - Templates/`.

The `Source Capture` template's logic is split across Templater **User Scripts** in `99 - Meta/02 - Scripts/` — one JS module per source type, plus a shared helpers module — rather than living in one large template file. This lives outside the Templates folder deliberately, so the `.js` files don't show up in the "Insert Template" picker (which lists everything under `templates_folder`). See [Source Capture Architecture](#source-capture-architecture) below.

---

## Design Philosophy

Templates should:

- Reduce repetitive work
- Encourage good note-taking habits
- Standardize metadata
- Avoid unnecessary complexity

---

## Main Template: `(TEMPLATE) Source Capture.md`
The primary intake tool. Run via Templater command: **Insert Template** → `(TEMPLATE) Source Capture`.

### Features

- Prompts for source type (11 types)
- Auto‑fetches metadata when possible (ISBN, DOI, URL oEmbed)
- For **Lecture**: validated pickers for Course → Unit → Lecturer
  - Lists existing Courses (`#course` in `04 - MOCS/Courses/`)
  - Lists Units belonging to that course (via `course:` frontmatter)
  - Names a newly created Unit **course-qualified** — `Cognitive Psychology – Unit 1`, never a bare `Unit 1` — because `04 - MOCS/Units` is flat and generic unit names (`Unit 1`, `U1`, `todas`) collide across courses; a picked Unit keeps whatever it is already called
  - Pre‑fills Lecturer from course's `default_lecturer` field
  - Creates missing Courses/Units/People on the fly — stubs are born from the real template files (`(TEMPLATE) Course MOC.md`, `(TEMPLATE) Unit MOC.md`, `(TEMPLATE) Person.md`) via Templater, so stub and template can't drift apart
- Renames file with type prefix (e.g., `{` for Book, `§` for Lecture) — **after** Templater has finished writing the note, not during the template run, because renaming the open note mid-write makes Obsidian reload the view and drop the body
- Adds YAML frontmatter with `id`, `created`, `review`, `status: inbox`, `growth: seedling`
- Generates a rich note body (callouts, tables, timestamp placeholders)

### Type Prefixes

| Type | Prefix | Tag | Auto-fetch |
|---|---|---|---|
| 📚 Book | `{` | `source/book` | Open Library (via ISBN) |
| 📰 Article | `(` | `source/article` | Microlink API (via URL) |
| 📜 Paper | `&` | `source/paper` | CrossRef (via DOI) |
| 🎥 YouTube | `+` | `source/youtube` | YouTube oEmbed API |
| 🎬 Video | `+` | `source/video` | Manual |
| 🎧 Podcast | `%` | `source/podcast` | iTunes Search (keyless), show → episode |
| 🐦 Tweet | `!` | `source/tweet` | Twitter oEmbed API |
| 💭 Thought | `=` | `note/thought` | Manual |
| 🎓 Lecture | `§` | `source/lecture` | Smart pickers (Course/Unit/Lecturer) |
| 🎞️ Movie | `~` | `source/movie` | Wikidata SPARQL + Wikimedia REST (keyless) |
| 📺 Series | `»` | `source/episode` | TVmaze (keyless), cascading to Series/Season/Episode |

### Lecture Automation

Lecture capture automatically:

- Creates Course notes if missing
- Creates Unit notes if missing, named `<Course> – <Unit>`
- Creates Lecturer notes if missing
- Connects lecture to course hierarchy

Result:

```text
Course
└── Course – Unit
    └── Lecture
```

### Series Automation

Series capture is the same shape, one level at a time, for TV:

- Picks an existing Series (`04 - MOCS/Series/`) or creates one
- Creates the Season MOC if missing, **series-qualified** (`Severance S02`, never
  a bare `S02` — the Seasons folder is flat, and every series has a second season)
- Fills both MOCs from the same keyless TVmaze fetch that supplies the episode,
  rather than leaving bare stubs where free metadata was available
- Points the episode at **both** levels with flat wikilinks, never a chain

```text
Series
└── Season
    └── Episode
```

The episode is the Source note (`source/episode`); the Series and Season are
MOCs. See [ADR 0013](../../docs/adr/0013-tv-containment-hierarchy.md).

### Podcast Automation

Podcast capture asks for a show name, then narrows:

- Searches Apple's keyless iTunes Search API for the show and offers the matches
- Lists that show's episodes to pick from; because the episode lookup only
  returns recent episodes, the picker also offers **Search by episode title**
  for anything further back, and **Enter by hand** at any point
- Fills `title`, `url` (the Apple Podcasts episode page), `publish_date` and
  `general_subject` from the chosen episode

Two fields deliberately stay human:

- **`host` is pre-filled, not written.** iTunes only has a *show*-level
  `artistName`, which is whatever the feed put in `<itunes:author>` — the host
  for *99% Invisible* (Roman Mars), the publisher for *The Daily* (The New York
  Times). It is offered in the prompt for confirmation because it is right about
  half the time, and confirming is cheaper than typing.
- **`guest` has no source at all.** iTunes carries no guest field at either
  level, so it stays a plain prompt.

**No artwork is read, and this is a terms constraint rather than an oversight.**
Apple's legal notice for this API governs *Promo Content* — "previews of songs
and music videos, album art, and App icons" — and requires it to sit next to a
"Download on iTunes" badge. Plain text metadata and a store link fall outside
that definition entirely, which is what makes this integration clean; taking
`artworkUrl600` would pull the badge obligation onto every adopter, the same
redistribution burden [ADR 0014](../../docs/adr/0014-external-data-source-credential-ladder.md)
rejected TMDb over. Don't add a `thumbnail` field here from iTunes.

---

## Source Capture Architecture

`(TEMPLATE) Source Capture.md` is a **one-line adapter** — it awaits `tp.user.sourceCaptureOrchestrator(tp)` and assigns the result to `tR`, and that is all it does. The orchestration itself (type picker, type registry, dispatch, frontmatter/body assembly, file rename) lives in `sourceCaptureOrchestrator.js`, so the most integration-prone logic in the vault is reachable by the mocked-`tp` test suite instead of only being exercisable by hand in Obsidian. Keep the template to that one line — anything added there is untestable by definition.

All type-specific logic (prompts, auto-fetch, YAML fields, note body) lives in `99 - Meta/02 - Scripts/`:

| File | Responsibility |
|------|-----------------|
| `sourceCaptureOrchestrator.js` | The type registry, the type picker, dispatch to the per-type module, note assembly, and the rename to `<prefix> <clean title>.md` |
| `sourceCaptureHelpers.js` | Shared prompt helpers (`requiredPrompt`, `optionalPrompt`, `datePrompt`), `fetchWithFallback` (the try-fetch → manual-fallback skeleton every auto-fetching type uses), `sanitizeTitle` (the single filename cleaner), the `yamlField` formatter, and `buildBaseYaml` (the frontmatter fields common to every capture type) |
| `sourceCaptureBook.js` | Book — Open Library ISBN lookup + manual fallback |
| `sourceCaptureArticle.js` | Article — Microlink URL metadata + manual fallback |
| `sourceCapturePaper.js` | Paper — CrossRef DOI lookup + manual fallback |
| `sourceCaptureYoutube.js` | YouTube — oEmbed lookup + manual fallback |
| `sourceCaptureVideo.js` | Video (non-YouTube) — manual |
| `sourceCapturePodcast.js` | Podcast — keyless iTunes Search show picker, then an episode picker, with a title-search rung for back-catalogue episodes and a manual fallback |
| `sourceCaptureTweet.js` | Tweet — oEmbed lookup + manual fallback |
| `sourceCaptureThought.js` | Thought — manual |
| `sourceCaptureLecture.js` | Lecture — Course/Unit/Lecturer picker-or-create flow plus lecture details |
| `sourceCaptureMovie.js` | Movie — keyless Wikidata SPARQL lookup, a disambiguation picker, an optional Wikimedia poster GET, and a manual fallback |
| `sourceCaptureSeries.js` | Series — Series/Season picker-or-create flow plus a cascading keyless TVmaze fetch that fills all three levels |
| `moveSourceNote.js` | Not capture — the [Move Source Note](#filing-a-note-move-source-note) command, which files a captured note out of the Inbox using the registry's `folder` column |

Each per-type module is a Templater User Script: `module.exports` is an `async function(tp, helpers)` that prompts/fetches as needed and returns `{ noteTitle, yamlFields, body }`, or `null` if the user cancels. This requires Templater's **User Scripts Folder** setting to point at `99 - Meta/02 - Scripts` (already configured in this vault's `.obsidian/plugins/templater-obsidian/data.json`) — after pulling changes to these scripts, run Obsidian's **Templater: Reload templates** command (or restart Obsidian) so it picks them up.

A sibling folder, `99 - Meta/03 - Scripts-tests/`, holds a Node-based unit test suite (mocked `tp`/`app`/`fetch`) for these modules — see its `README.md` for how to run it. It's a sibling of, not nested inside, `02 - Scripts/`, so Templater never tries to load the test files as `tp.user.*` functions.

### Adding a new source type

Two steps, no more:

1. Create `99 - Meta/02 - Scripts/sourceCapture<Type>.js` following the existing pattern (`async function(tp, helpers)` returning `{ noteTitle, yamlFields, body }` or `null`). If it auto-fetches, build it on `helpers.fetchWithFallback` rather than hand-rolling the try/catch — that is what keeps the Notice wording and the fallback behaviour identical across types.
2. Add **one row** to `TYPE_REGISTRY` in `sourceCaptureOrchestrator.js`:

```js
{ name: "Podcast", icon: "🎧 Podcast", tag: "source/podcast", prefix: "%", folder: "01 - Sources/Podcasts", capturer: "sourceCapturePodcast" },
```

`capturer` is the user-script name as a string; the orchestrator resolves it through `tp.user` at call time. `prefix` need not be unique — Video and YouTube deliberately share `+`, and share a `folder` to match. `folder` is the filing destination used by [Move Source Note](#filing-a-note-move-source-note), *not* by capture — capture always lands notes in `00 - Inbox`. Set it to `null` only for a type that isn't a source (currently just Thought); the test suite requires every row to state the field one way or the other, so a new type can't silently become unfileable.

This replaced the five parallel `TYPE_LABELS`/`TYPE_ICONS`/`TYPE_TAGS`/`TYPE_PREFIX`/`TYPE_CAPTURERS` tables that used to sit at the top of the template, where forgetting one of the five shipped a half-registered type. `sourceCaptureOrchestrator.test.js` now fails on a malformed or incomplete row.

### Filing a note: `Move Source Note`

Capture always leaves a note in `00 - Inbox`, on purpose — the Inbox is the review staging area, and routing automatically on capture would remove that review step. `(TEMPLATE) Move Source Note.md` is the separate, opt-in action that files one: run it with a source note active and it moves that note into its type folder under `01 - Sources`.

This is **not** cosmetic tidiness. The Section- and Source-note hub queries are folder-scoped, so a note still sitting in the Inbox is invisible to its own hub even with correct `source:`/`section:` frontmatter — which reads as a broken query rather than a misfiled note.

| Type | Destination |
|------|-------------|
| Book | `01 - Sources/Books` |
| Article | `01 - Sources/Articles` |
| Paper | `01 - Sources/Papers` |
| Lecture | `01 - Sources/Lectures` |
| Video, YouTube | `01 - Sources/Videos` |
| Podcast | `01 - Sources/Podcasts` |
| Tweet | `01 - Sources/Tweets` |
| Movie | `01 - Sources/Movies` |
| Series | `01 - Sources/Series` |
| Thought | *none — exempt* |

Notes on the behaviour:

- **The mapping is the registry.** Destinations come from the `folder` column of `TYPE_REGISTRY`, read at runtime through `tp.user.sourceCaptureOrchestrator.typeRegistry()`, so capture and filing cannot disagree about where a type belongs.
- **Type is resolved from the frontmatter tag**, with the filename prefix as a fallback for a note whose frontmatter was edited away. The `type` field is *not* usable for this — it only ever says `source` or `thought`, never which source type.
- **Thought is exempt.** It's the one registry row that isn't a source, so it has no destination; the command says so and moves nothing.
- **Podcasts/ and Tweets/ don't ship** in the vault — they're created the first time a note is filed into them, so a fresh vault works without setup.
- **It's a no-op, never an error,** for a note that isn't a recognised source, one already sitting in its type folder, or one whose name is already taken at the destination. Each case shows a Notice explaining which it was.
- **The move goes through Obsidian's file manager**, not a raw vault rename, so inbound `[[wikilinks]]` are rewritten and frontmatter is left untouched.

Bind it to a hotkey via **Templater → Settings → Template Hotkeys**, which also registers it in the command palette — see [PLUGINS.md](PLUGINS.md#installation-notes). Like `Source Capture`, the template is a one-line adapter; the logic lives in `moveSourceNote.js` where `moveSourceNote.test.js` can reach it.

---

## Helper Templates

`Source Capture`'s lecture and series flows birth missing Courses, Units, People, Series, and Seasons directly *from* these template files (`tp.file.find_tfile` + `tp.file.create_new`), then fills in what the picker already knows via `processFrontMatter` — the template file is the single source of the note's shape, so a stub-born note and a manually templated note are identical by construction.

| File | Used for | Filled on creation |
|------|----------|--------------------|
| `(TEMPLATE) Course MOC.md` | New course stub (`#course`) | `default_lecturer` is written back (as a quoted wikilink) once the first lecture's lecturer is picked |
| `(TEMPLATE) Unit MOC.md` | New unit stub (`#course-unit`), named `<Course> – <Unit>` | `course` is set to the picked course |
| `(TEMPLATE) Person.md` | New person stub (`agent/person`) — the Lecturer picker in `sourceCaptureLecture.js` only offers `09 - Entities/Agents` notes tagged `agent/person`, since that folder also holds Organizations/Countries/Synthetic agents | — |
| `(TEMPLATE) Series MOC.md` | New series stub (`#series`) | `publisher` (network or streaming service), `general_subject` (genres), `released`, `thumbnail` and `url`, all from the TVmaze fetch |
| `(TEMPLATE) Season MOC.md` | New season stub (`#series-season`) | `series` is set to the picked series; `released` and `episode_count` come from TVmaze's `/seasons` call |

---

## Entity Templates (Manual Use)

One template per Entity subtype. All use a lightweight schema (`type: entity`, no `id`/`growth`/`status`/`review`) plus structured YAML fields per subtype — see [METADATA.md#entity-fields](METADATA.md#entity-fields-09---entities). Browse everything via the [Entities MOC](../../04%20-%20MOCS/Entities.md). Templates themselves live in `99 - Meta/00 - Templates/`; the table's "Folder" column is the destination folder for the resulting *note*, not the template file.

| Template | Tag | Folder |
|----------|-----|--------|
| `(TEMPLATE) Person.md` | `agent/person` | `Agents/` |
| `(TEMPLATE) Organization.md` | `agent/organization` | `Agents/` |
| `(TEMPLATE) Country.md` | `agent/country` | `Agents/` |
| `(TEMPLATE) Synthetic Agent.md` | `agent/synthetic` | `Agents/` |
| `(TEMPLATE) Place.md` | `nonagent/place` | `Non-Agents/` |
| `(TEMPLATE) Artifact.md` | `nonagent/artifact` | `Non-Agents/` |
| `(TEMPLATE) Tool.md` | `nonagent/tool` | `Non-Agents/` |
| `(TEMPLATE) System.md` | `nonagent/system` | `Non-Agents/` |
| `(TEMPLATE) Natural Entity.md` | `nonagent/natural` | `Non-Agents/` |
| `(TEMPLATE) Event.md` | `nonagent/event` | `Non-Agents/` |

---

## Other Templates (Manual Use)

| Template | Purpose |
|----------|---------|
| `(TEMPLATE) Permanent Note.md` | Atomic idea note – one‑liner, evidence, connections |
| `(TEMPLATE) Literature Note.md` | Response to a source, in your own words |
| `(TEMPLATE) MOC.md` | Generic Map of Content scaffold |
| `(TEMPLATE) Daily Enhanced.md` | Daily note with morning check‑in, capture area, evening reflection |
| `(TEMPLATE) Fleeting Note.md` | Quick capture with next‑action checklist |
| `(TEMPLATE) Weekly.md` | Weekly review template |
| `(TEMPLATE) Monthly.md` | Monthly review |
| `(TEMPLATE) Yearly.md` | Annual review |

### Periodic Note Architecture

`Daily Enhanced`, `Weekly`, `Monthly`, and `Yearly` all prompt for (or default to) their target period, rename the note to the canonical label themselves (no manual pre-naming), and link up to their parent period (Daily → `week:`, Weekly → `month:`, Monthly → `year:`) alongside the existing prev/next navigation. The shared logic behind this — anchor resolution, label/prev/next computation, and the parent-period lookup — lives in one Templater User Script, `99 - Meta/02 - Scripts/periodicNoteHelpers.js` (exposed as `tp.user.periodicNoteHelpers.*`), the same pattern as `sourceCaptureHelpers.js`. It has its own unit tests in `99 - Meta/03 - Scripts-tests/periodicNoteHelpers.test.js`; real calendar arithmetic (ISO week boundaries, month/year rollover) is verified by using the templates in Obsidian, not by the test suite, which mocks `moment` as a call-recording spy rather than reimplementing it.



---

## Template Evolution

Templates are expected to evolve. When adding new fields:

1. Determine future usefulness
2. Ensure consistency
3. Avoid metadata bloat

The goal is to support **thinking**, not create administrative work.