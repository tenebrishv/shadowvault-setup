# Handoff — Movie and Series source-capture types

**Date:** 2026-07-30
**Produced by:** a `/grilling` session with the vault owner. Every decision below was put to them
explicitly and chosen by them; nothing here is an agent's inference.
**Status:** designed, not implemented. Tracked as a GitHub issue — see *Tracking* at the bottom.

This file is the *decision record*: what was chosen, and **what was rejected and why**. The issue
carries the actionable spec. Read this one first if you are tempted to re-open a settled question —
the alternatives below were considered and declined for stated reasons, and re-litigating them is
the main way this work goes wrong.

---

## 1. What is being added

Two new source-capture types, taking `TYPE_REGISTRY` from 9 rows to 11.

| | Movie | Series (TV) |
|---|---|---|
| `name` | `Movie` | `Series` |
| `icon` | `🎞️ Movie` | `📺 Series` |
| `tag` | `source/movie` | `source/episode` |
| `prefix` | `~` | `»` |
| `folder` | `01 - Sources/Movies` | `01 - Sources/Series` |
| `capturer` | `sourceCaptureMovie` | `sourceCaptureSeries` |

### The type boundary (decided by the owner, verbatim intent)

- **Movie** — a standalone cinematic work. Movies are just that, movies.
- **Series** — anything with **episodes**. A docuseries is a Series.
- **Video** — web video content (YouTube, Vimeo, Nebula). Unchanged.

**The discriminator is the structure of the work, not the platform and not the runtime.** A film
watched on Stremio, in a cinema, or released free on YouTube is a Movie. A feature-length video
essay is a Video. Anything episodic is a Series regardless of subject matter.

This rule exists because it is decided *per capture* and a wrong call becomes a wrong tag inside a
folder-scoped dashboard. It belongs in `CONTEXT.md` under a **Movie / Series / Video** entry.

---

## 2. Movie — the spec

### Frontmatter

```yaml
director:        "Denis Villeneuve"   # NEW vocabulary
runtime:         155                  # NEW vocabulary — UNQUOTED, see below
publisher:       "Legendary Pictures" # reused (studio)
general_subject: "Science fiction"    # reused (genre)
released:        "2021"               # reused
platform:        "Stremio"            # reused (where it was watched)
url:             "https://www.wikidata.org/entity/Q55712478"
thumbnail:       "https://upload.wikimedia.org/..."
watched:         "2026-07-30"
```

Only **`director` and `runtime`** are new entries in `VOCABULARY.source`. Studio reuses `publisher`
and genre reuses `general_subject` deliberately, so Movie inherits the dashboards Book/Paper/Podcast
already feed rather than needing new queries.

### `runtime` is deliberately unquoted

`helpers.yamlField` always quotes (`sourceCaptureHelpers.js:139`), which would emit `runtime: "155"`
— a string. Dataview would then compare lexically, so `WHERE runtime < 100` is silently wrong
(`"90" < "100"` is false). The module therefore builds this one field by hand, the same way
`sourceCaptureLecture.js:170-172` bypasses `yamlField` for wikilinks. **Needs a digits-only guard on
the prompt** so a typo cannot emit invalid YAML, and a comment saying why it is special — otherwise
a future reader will "fix" it back to `yamlField`.

Note the vault already has `lecture_num: "3"`, a quoted number. It has never bitten because nothing
queries it numerically. Do not treat it as a precedent to copy.

### `director` is a plain string, never a wikilink

Owner's decision, with reasoning: *"if I find myself needing to wikilink it, I will just do it
manually and add the metadata for the director myself."*

The alternative — a validated picker over `09 - Entities/Agents` like `pickLecturer` — was costed at
~45 reusable lines plus a helpers extraction, and **declined**. The argument that settled it: a
picker pays off when the cast is small, closed and recurring (6 courses, 30 lectures). Directors are
long-tail — ~90 directors across 100 films — so auto-creating Person stubs produces a note
graveyard. Converting the field to wikilinks later is a find-and-replace over one folder.

**Do not add a director picker without being asked.**

### Fetch — Wikidata SPARQL + Wikimedia REST

Fully specified in `research/movie-metadata-apis.md` (815 lines, every claim marked VERIFIED or DOC).
Do not re-research this; read that file.

- **GET 1** — Wikidata SPARQL with `wikibase:mwapi` `EntitySearch` federated *inside* the query, so
  fuzzy title search stays one round trip. Returns title, director, year, runtime, studio and the
  canonical URL. Sub-2.1 s verified.
- **GET 2 (optional)** — Wikimedia REST summary endpoint for the poster → `thumbnail`. A film
  article's lead image *is* its poster, and GET 1 already returns the exact article URL, so there is
  no search step. Needed because Wikidata's own `P3383` covers only **1.2%** of 347,749 films —
  posters are not free-licensed.

**A picker is required and this is verified, not assumed.** `the thing` → 7 films, `parasite` → 4,
`true grit` → both 1969 and 2010, `dune` → 4. Same-titled films are the normal case. Design:
one fetch, then `tp.system.suggester` over the returned rows with a `"{title} ({year}) — {director}"`
display string, **auto-skipped when exactly one row returns** (`seven samurai` → 1).

Three traps the research hit, documented so they are not rediscovered the hard way:

1. A `FILTER(LCASE(…))` over labels **times out**; curl reports HTTP 000 and it looks like an outage.
2. Exact `"Dune"@en` matching is **case-sensitive** — `"dune"` returns 0 rows.
3. Without `GROUP BY` aggregation, multi-valued properties **cartesian-multiply** — `true grit`
   returned 15 rows for one film.

A miss returns HTTP 200 with empty bindings — the same empty-success trap `sourceCaptureBook.js`
guards against by throwing when the payload lacks essentials. Do the same here.

**Environment de-risking already done:** the query was replayed with an `obsidian/1.12.7` Electron
User-Agent and returned HTTP 200 with correct bindings, so the Open Library `/obsidian/i` → 429 trap
documented at `sourceCaptureBook.js:7-10` does **not** apply. Still send a descriptive UA.

### No Media Extended fields

Movie emits **neither `media` nor `mx-uid`**. The owner watches on Stremio and would not watch inside
Obsidian. MX cannot play it, so `media` would point at something unplayable and `mx-uid` would be an
orphan — which is precisely the live bug in **issue #48**. `sourceCaptureVideo.js`, the closest
sibling, has no MX integration either; only YouTube does, because a YouTube URL is always playable.

### Body

```
> [!meta]- Metadata
> **Director:** …  **Released:** …  **Runtime:** … min
> **Studio:** …    **Watched:** … (platform)

## Quotes & Moments

| Time | Quote / What happens |
|------|----------------------|
|      |                      |

## Source Recap        <- helpers.recapBlock("film")
```

The `Quotes & Moments` table exists because the owner said they take notes and quotes but will type
timestamps by hand (no MX seek-links). Scaffold richness is free here: ADR 0001's verbosity
trade-off **explicitly exempts script-filled bodies** (CONTEXT.md, *"Script-filled body"*).

`recapBlock` takes a `noun` with no default by design (`sourceCaptureHelpers.js:186`) — pass
`"film"`. Movie earns a recap by CONTEXT.md's stated test: consumed and responded to, with no
reflective scaffold of its own.

---

## 3. Series — the spec

### Shape: mirror the Curriculum MOC exactly

Series → Season → Episode is structurally identical to Course → Unit → Lecture, which
`sourceCaptureLecture.js` already implements and tests.

```
04 - MOCS/Series/Severance.md            <- Series MOC
04 - MOCS/Seasons/Severance S02.md       <- Season MOC
01 - Sources/Series/» Severance S02E03 – Who Is Alive?.md   <- the Source
```

The episode carries **flat pointers to both levels**, not a chain:

```yaml
series:  "[[Severance]]"
season:  "[[Severance S02]]"
episode: 3
released: "2025-01-31"    # airdate
runtime:  53
url:      "https://www.tvmaze.com/episodes/2939703/severance-2x03-who-is-alive"
watched:  "2026-07-30"
```

Flat pointers match `sourceCaptureLecture.js:170-171` (`course:` **and** `unit:` both on the
lecture). Chaining was considered and rejected in ADR 0011 as "option A" — it breaks one-hop
metadata traversal. **Do not chain.**

Only **`series`, `season`, `episode`** are new vocabulary. Airdate reuses `released`, network reuses
`publisher`, genres reuse `general_subject`, poster reuses `thumbnail` — consistent with Movie.

### Season names must be series-qualified

`Severance S02`, never `S02`. **This avoids a real, pre-existing collision bug** —
`sourceCaptureLecture.js:102` births Unit stubs into a *flat* `04 - MOCS/Units`, and `createStub`
returns early if the path exists (`:45`), so a second course with a "Unit 1" silently reuses the
first course's Unit note **with the wrong `course:` field**. Course units have distinctive names so
nobody has hit it; every series has an S02, so Seasons would hit it constantly.

> The Lecture bug is **real and pre-existing**, tracked separately as
> [#58](https://github.com/tenebrishv/shadowvault-setup/issues/58). Deliberately out of scope here —
> do not fix it as a drive-by inside this work.

### Fetch — TVmaze, cascading to all three levels

TVmaze is keyless, **CC BY-SA**, rate-limited to 20 calls / 10 s, and asks for a descriptive
User-Agent (same pattern as `sourceCaptureBook.js:10`). Attribution is satisfied by storing the
canonical TVmaze URL in `url`. All endpoints below were **verified live on 2026-07-30**:

```
GET /search/shows?q=severance
  → id 44933, url, name, genres, premiered "2022-02-18", averageRuntime 49,
    webChannel {name: "Apple TV"}, image {medium, original}, externals.imdb

GET /shows/44933/seasons
  → per-season premiereDate, endDate, episodeOrder, image

GET /shows/44933/episodebynumber?season=2&number=3
  → name "Who Is Alive?", season 2, number 3, airdate "2025-01-31",
    runtime 53, url, image, summary
```

**Cascade on first capture.** When the picker births a Series or Season note that does not yet
exist, fill it from the fetch rather than leaving a bare stub. `createStub` already accepts a `fills`
parameter (`sourceCaptureLecture.js:43-56`), so the mechanism exists and is tested.

- **Series MOC** ← genres, premiered, publisher (network/webChannel), thumbnail, url
- **Season MOC** ← premiered, episode_count, `series:` backlink
- **Episode** ← title, season, episode, released, runtime, url

Three GETs, and only on first capture of a new series; subsequent episodes of a known season need
only the episode lookup.

Note `webChannel` is populated for streaming services and `network` for broadcasters — Severance
returns `network: null` with `webChannel: {name: "Apple TV"}`. **Read both**, preferring whichever
is non-null, or a lot of modern shows will have an empty `publisher`.

### Body

Same shape as Movie — meta callout, `## Quotes & Moments`, then `helpers.recapBlock("episode")`.
`"episode"` is literally one of the example nouns in `sourceCaptureHelpers.js:186`.

### Series and Season MOCs use the light Curriculum-MOC schema

`type: moc`, `tags`, `aliases`, `created` plus their own relations — and **no `id` / `growth` /
`status` / `review`**, matching `(TEMPLATE) Course MOC.md` and `(TEMPLATE) Unit MOC.md`. See
CONTEXT.md, *"Curriculum MOC"*. Two new templates are needed:
`(TEMPLATE) Series MOC.md` and `(TEMPLATE) Season MOC.md`.

The Season MOC lists its episodes with the Curriculum-MOC idiom:
```dataview
LIST FROM #source/episode WHERE contains(season, [[]]) SORT episode ASC
```

---

## 4. Decisions that were made and should not be re-opened

| Decision | Chosen | Rejected, and why |
|---|---|---|
| Movie as a type | Distinct registry row | Reusing Video — overloads `channel` to mean director, the exact drift issue #22 fixed. Movie-as-Entity — loses the recap and literature notes. |
| Movie prefix | `~` | `?` is illegal on Windows and stripped by `ILLEGAL_TITLE_CHARS`. Sharing `+` with Video breaks `moveSourceNote`'s prefix fallback once folders differ. |
| Movie icon | `🎞️` | `🎬` is already Video's; `🎥` is YouTube's. |
| Series prefix | `»` | `@` — the owner reserves it for people notes. `$` — ASCII but semantically meaningless. |
| Director | Plain string | Validated picker (note graveyard); bare wikilink (typos silently fork the entity). |
| Fetcher (Movie) | Wikidata + Wikimedia REST | **TMDb** — needs a key, and this repo is public and ships as a framework. **Cinemeta** — better ranking and matches Stremio, but has *no studio field*, publishes no terms for third-party callers, and is TMDb-derived. **iTunes** — broken, see below. |
| Fetcher (Series) | TVmaze | Cinemeta supports series but has no published terms; Wikidata's per-episode coverage is thin. |
| MX fields | None | Would create orphan `mx-uid`s, feeding issue #48. |
| TV hierarchy | Curriculum-MOC mirror | Season-as-Source with episodes as ADR 0011 Section notes — elegant, but an episode stops being a source with its own runtime and airdate. Two-level with `season` as a bare number — no season note to write on. |
| Fetch reach | Cascade all three levels | Episode-only (Lecture parity) — leaves bare stubs where free metadata was available. |

### Also worth knowing

**Apple's iTunes Search API movie filter is silently broken.** Verified: `media=movie`,
`entity=movie`, `entity=movieArtist`, `entity=shortFilm`, `media=tvShow`, `entity=tvSeason` all
return 0 results, while ebook/podcast/music filters work fine. The records are still in the index — a
bare `?term=dune` with no `media` param returns `feature-movie` records — but without the filter,
relevance collapses (`inception` → 29 feature-movies, **none of them Inception**). Apple's live docs
still list `movie` as valid and carry **no deprecation notice**. This is an undocumented regression.
Re-test in a quarter; do not build on it.

**Letterboxd is excluded by name.** Their access page refuses API access "for LLM or GPT-related use,
**for private or personal projects**". They recommend TMDB instead.

---

## 5. Open items deliberately left out of scope

- **The Lecture Unit collision bug** (§3). Real, pre-existing, tracked as
  [#58](https://github.com/tenebrishv/shadowvault-setup/issues/58).
- **Issue #41** — rolling `recapBlock` out to the other five capture types. Movie and Series get one
  at birth; the backlog is untouched.
- **An ADR for the TV containment hierarchy.** Recommended and agreed in principle, not yet written.
  It passes all three of the `/domain-modeling` tests: hard to reverse once episode notes exist,
  surprising without context (why are Series/Season MOCs rather than Sources? why flat pointers?),
  and the result of a real trade-off against ADR 0011. Number it `0013`.
- **No ADR for the fetcher choice** — `research/movie-metadata-apis.md` already is that record.
- **`CONTEXT.md`** needs the Movie / Series / Video boundary entry (§1). It is gitignored, so this is
  a local-only edit.

## 6. Verification

There is no build or test tooling for the vault as a whole, but these scripts *are* covered:

- Run the mocked unit suite — the `/verify` skill, or `node --test` in `99 - Meta/03 - Scripts-tests/`.
- Run `/templater-lint` **only if** a `.md` template under `99 - Meta/00 - Templates/` changed — the
  two new MOC templates qualify.
- Templater caches loaded user scripts: **Reload templates** (or restart Obsidian) before any manual
  check, or you will be testing the old module.
- The live-in-Obsidian pass is the last mile and cannot be skipped: every API claim above was
  verified with `curl`, not from inside Obsidian's renderer.

## 7. Tracking

**GitHub issue: [#57 — Add Movie and Series (TV) source-capture types](https://github.com/tenebrishv/shadowvault-setup/issues/57)**
(`enhancement`, `ready-for-agent`). That issue carries the file-by-file spec; this file carries the
reasoning behind it.

Sibling document: `research/movie-metadata-apis.md` — the primary-source API survey this design's
fetch decisions rest on.

> **A note on where this lives.** This is a design decision record, not a primary-source survey, so
> it is a slightly odd fit for `research/`. It sits here because `docs/` — where agent-facing dev
> docs and the ADRs live — is gitignored, and this reasoning needs to survive a fresh clone and be
> visible to a cloud agent. If a tracked home for decision records ever exists, move it there.
