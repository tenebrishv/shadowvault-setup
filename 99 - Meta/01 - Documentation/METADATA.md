# Metadata Schema & Tags

ShadowVault uses YAML frontmatter to provide structure, automation, and discoverability.
Metadata should support retrieval and understanding.

README: [README](../../README.md)

---
## Core Frontmatter Fields

These are the fields carried by notes moving through the pipeline — Permanent,
Literature, MOC, Fleeting, and captured Sources. They are **not** universal:
entity, curriculum-MOC, series-MOC, and periodic notes use their own lighter
schemas,
documented further down.

```yaml
---
id:           # YYYYMMDDHHmm – unique timestamp ID
type:         # source | permanent | literature | fleeting | moc | thought | entity | periodic
growth:       # seedling | fern | incubator | evergreen
status:       # inbox | processing | active | completed | archived
created:      # YYYY-MM-DDTHH:mm
modified:     # YYYY-MM-DD – last substantive revision
review:       # YYYY-MM-DD – next scheduled review date
publish:      # true/false – set by Source Capture
tags:         # list of broad categories eg: sources/book
aliases:      # alternative titles
cssclasses:   # for CSS snippets (e.g., page-white, pen-blue)
---
```

Not every core note emits every field. The split below is real and enforced by
the conformance test in `99 - Meta/03 - Scripts-tests/frontmatterSchema.test.js`:

| Field        | Permanent | Literature | MOC | Fleeting | Source Capture |
| ------------ | --------- | ---------- | --- | -------- | -------------- |
| `id`         | ✓         | ✓          | ✓   | ✓        | ✓              |
| `type`       | ✓         | ✓          | ✓   | ✓        | ✓              |
| `growth`     | ✓         | ✓          | ✓   | ✓        | ✓              |
| `status`     | ✓         | ✓          | ✓   | ✓        | ✓              |
| `created`    | ✓         | ✓          | ✓   | ✓        | ✓              |
| `modified`   | ✓         | ✓          | ✓   | —        | —              |
| `review`     | ✓         | ✓          | —   | —        | ✓              |
| `publish`    | —         | —          | —   | —        | ✓              |
| `tags`       | ✓         | ✓          | ✓   | ✓        | ✓              |
| `aliases`    | ✓         | ✓          | ✓   | —        | ✓              |
| `cssclasses` | ✓         | ✓          | ✓   | ✓        | —              |

Notes on the asymmetries, all of them deliberate as of this writing:

- **No `title` field.** The human-readable title lives in the filename (captured
  notes carry it with a type prefix; other notes carry it plainly), and Dataview
  exposes it as `file.name`. A `title:` frontmatter copy only ever went stale on
  rename, so no producer emits one.
- **`publish` is written only by Source Capture.**
- **`cssclasses` is written only by the hand-authored templates.**
- **Fleeting Note omits `aliases`, `review`, and `modified`** — it is the deliberate
  minimal template (ADR 0001); speed of capture wins over structure.
- **MOC carries `growth`** — a MOC ripens from a bare stub link-list (`seedling`)
  to a curated, annotated map (`evergreen`); `status` tracks whether it is live,
  `growth` how developed it is. The structural MOCs (Course/Unit, Series/Season)
  are the exception — they are navigation scaffolding and carry no `growth`,
  documented further down.

- id
	- Permanent reference
	- Unique filenames
	- Prevent collisions
- growth 
	- How connected is this note
	- seedling: New capture
	- fern: Developing 
	- incubator: Complete but isolated
	- evergreen: Refined and connected 
- status
	- How far is it in the processing
	- inbox: not started
	- processing: started, not completed
	- active: ongoing, open-ended (default for Permanent/Literature/Fleeting/MOC templates — these are never really "completed", just continuously revised)
	- completed: completed
	- archived: this no longer serves a purpose

These four fields — `growth`, `status`, `type`, and `period` — are the vault's closed vocabularies. Beyond driving the badges and dashboards, they are offered as **validated dropdowns** when you hand-edit frontmatter, via the recommended Metadata Menu plugin (right-click a property → *Update…*; free typing bypasses the list). The dropdown options are held identical to the values above by `99 - Meta/03 - Scripts-tests/metadataMenuEnums.test.js`, which reads them straight from the same `ENUMS` these tables mirror — so a value added here must be added to the plugin config too, or the test reds. See [PLUGINS.md](PLUGINS.md) and [ADR 0007](../../docs/adr/0007-metadata-menu-validated-options.md).

---

## Visual Badges

`growth`, `status`, and `type` are rendered as emoji badges wherever a note or a link to it appears — the **Properties panel** per-value emoji (`frontmatter-display.css` + the `shadowvault-property-icons` plugin), the Nexus dashboards, and decorated `[[links]]`/backlinks via the Supercharged Links plugin. This is the **single source of truth** for the emoji mapping; every surface below must match it. (Notes no longer carry an in-note `choice()` badge line — the panel shows per-value state directly; see [ADR 0009](../../docs/adr/0009-property-panel-per-value-icons.md).)

**growth**

| Value | Badge |
|---|---|
| seedling | 🌱 Seedling |
| fern | 🌿 Fern |
| incubator | 🔆 Incubator |
| evergreen | 🌲 Evergreen |

**status**

| Value | Badge |
|---|---|
| inbox | 📥 Inbox |
| processing | ⚙️ Processing |
| active | 🟢 Active |
| completed | ✅ Completed |
| archived | 🗄️ Archived |

**type**

| Value | Badge |
|---|---|
| permanent | 💡 Permanent |
| literature | 📝 Literature |
| source | 📚 Source |
| fleeting | 🌫️ Fleeting |
| moc | 🗺️ MOC |
| thought | 💭 Thought |
| periodic | 📆 Periodic |
| entity | 🧩 Entity |

If this mapping changes, update it here first, then propagate to `99 - Meta/05 - Views/badge-table/view.js`, the per-value rules in `.obsidian/snippets/frontmatter-display.css`, and `.obsidian/snippets/growth-badges.css`. Two guards keep the copies honest, in both directions: `dashboardEnums.test.js` (the view vs the tables above) and `propertyIconsEnums.test.js` (the panel per-value CSS vs the view). The `08 - Nexus/` dashboards hold no copy of their own — they render through the shared view.

---

## Property Icons

A different mapping from the value badges above: these are **per-field** icons
shown in the Properties panel (the in-note YAML editor), marking *which* field a
row is — a fixed emoji per field, independent of its value, in the row's **left**
icon slot. They come from the `.obsidian/snippets/frontmatter-display.css` snippet
(toggle in Settings → Style Settings → "ShadowVault — Frontmatter"), which
replaces Obsidian's native icon. This is a free-choice **decorative** layer with
no test behind it (the glyphs are arbitrary), so keep the snippet and the tables
below in sync by hand — unlike the per-value emoji, which have a tested contract.
Adding a field to any schema block in this document means adding a row here and
a rule in the snippet; nothing will red if you forget.

The map comes in two tiers, split by a Style Settings switch. The **core eleven
ship on**; every other field in this document is iconned too, but **off by
default** — see [Opt-in: the rest of the schema](#opt-in-the-rest-of-the-schema)
below.

### Core fields (always on)

| Field | Icon | Field | Icon |
|---|---|---|---|
| `id` | 🆔 | `publish` | 🌐 |
| `type` | 🗂️ | `tags` | 🏷️ |
| `growth` | 🪴 | `aliases` | 🎭 |
| `status` | 🚦 | `cssclasses` | 🎨 |
| `created` | 📅 | `review` | 🔁 |
| `modified` | ✏️ | | |

### Opt-in: the rest of the schema

Everything below is behind **Style Settings → ShadowVault — Frontmatter → *Also
icon source & entity fields***, a `class-toggle` (`sv-show-source-field-icons`)
that is **off by default**. With it off, these fields keep Obsidian's native
icon and the panel looks exactly as it did before #36; with it on, every field
declared anywhere in this document carries its own glyph. The two switches
compose as **master-off**: *Hide field emoji icons* kills all per-field emoji,
core and opt-in alike.

The scope is deliberately *every* non-core field rather than a curated subset —
the rules are pure CSS with no runtime cost, and a curated list only makes
"which fields made the cut" a recurring question.

**Source-specific**

| Field | Icon | Field | Icon | Field | Icon |
|---|---|---|---|---|---|
| `authors` | ✍️ | `channel` | 📺 | `account` | 👤 |
| `url` | 🔗 | `channel_url` | 📡 | `tweet_text` | 🐦 |
| `publish_date` | 🗓️ | `media` | 🎬 | `course` | 🎓 |
| `publisher` | 🏢 | `mx-uid` | 🧬 | `unit` | 📦 |
| `isbn` | 🔢 | `captions` | 💬 | `lecturer` | 🗣️ |
| `general_subject` | 🧭 | `thumbnail` | 🖼️ | `lecture_num` | #️⃣ |
| `specific_subject` | 🎯 | `watched` | 👁️ | `date_given` | 🕰️ |
| `publication` | 📰 | `released` | 🚀 | `context` | 🧠 |
| `doi` | 🪪 | `platform` | 🛰️ | `led_here` | ➡️ |
| `citekey` | 🔖 | `host` | 🎙️ | `director` | 🎞️ |
| `keywords` | 🗝️ | `guest` | 🤝 | `runtime` | ⏲️ |
| | | | | `series` | 📼 |
| | | | | `season` | 🍿 |
| | | | | `episode` | 🎟️ |

**Entity**

| Field | Icon | Field | Icon | Field | Icon |
|---|---|---|---|---|---|
| `role` | 🎖️ | `capital` | ⭐ | `medium` | 🪵 |
| `organization` | 🏛️ | `leader` | 👑 | `category` | 🧱 |
| `contact` | 📇 | `creator` | 🖌️ | `version` | 🆚 |
| `website` | 🌍 | `release_date` | 📤 | `scope` | 📏 |
| `founded` | 🎂 | `model_family` | 🤖 | `origin_date` | ⏳ |
| `sector` | 🏭 | `coordinates` | 📐 | `components` | 🧰 |
| `headquarters` | 🏬 | `region` | 🗾 | `classification` | 🔬 |
| `key_people` | 👥 | `country` | 🏳️ | `date` | ⌚ |
| `government_type` | ⚖️ | `historical` | 🏺 | `participants` | 🫂 |
| `established` | 🏗️ | `date_created` | 🐣 | | |
| | | `location` | 📌 | | |

**Literature / curriculum- and series-MOC / periodic**

| Field | Icon | Field | Icon |
|---|---|---|---|
| `source` | 📖 | `semester` | 🍂 |
| `section` | 🧷 | `period` | ⏱️ |
| `institution` | 🏫 | `week` | 🗒️ |
| `default_lecturer` | 📣 | `month` | 🌙 |
| `episode_count` | 🧮 | `year` | 🎊 |

Fields shared by several types (`url`, `course`, `series`, `released`,
`runtime`, `creator`, `location`, `website`, `date`) carry **one** glyph, since the panel keys on the property
name and cannot see which note type it is on.

`growth`, `status`, and `type` **also** show a per-**value** emoji on the row's
**right** (value) side — 🌱 seedling vs 🌲 evergreen — from the [Visual
Badges](#visual-badges) map above. Their field glyphs (🪴/🗂️/🚦) are chosen to
differ from every value emoji so a row never shows the same glyph twice; that
disjointness is a rule for the **whole** field map, core and opt-in, and every
glyph above is also distinct from every other. Because
CSS can't read the panel's contenteditable value, the first-party
`shadowvault-property-icons` plugin stamps it as `data-sv-value` for the CSS to
paint; `propertyIconsEnums.test.js` guards that CSS map against the badge SSOT.
See [ADR 0009](../../docs/adr/0009-property-panel-per-value-icons.md) for the
plugin/CSS split and why it replaced the in-note badge line; [ADR
0008](../../docs/adr/0008-style-settings-frontmatter-display.md) covers the
collapse mode's hover-not-click ceiling.

---

## Source‑Specific Fields (added by Source Capture)

### Book

```yaml
authors:
url:              # Open Library page (auto-fetch) or a manually entered link
publish_date:
publisher:
isbn:
general_subject:
specific_subject:
```

### Article

```yaml
authors:
url:
publication:
publish_date:
```

### Paper

```yaml
authors:
doi:
citekey:
url:
publish_date:
keywords:
general_subject:
```

The paper's abstract is **not** a frontmatter field — `sourceCapturePaper.js`
writes it into the note body as an `> [!abstract]` callout.
### YouTube / Video

```yaml
channel:
channel_url:  # YouTube only — auto-fetched from oEmbed
url:
media:        # YouTube only — same URL as `url`; Media Extended's property key
mx-uid:       # YouTube only — minted at capture; Media Extended's identity key
captions:     # YouTube only — WRITTEN BY Media Extended, not by us; do not hand-edit
thumbnail:    # YouTube only — auto-fetched from oEmbed
watched: YYYY-MM-DD
released:     # optional
platform:     # for non‑YouTube videos (Vimeo, Nebula)
```

`channel_url` and `thumbnail` are frontmatter fields, not inline ones, so they
are queryable — a dashboard can render video cards from `thumbnail` or group by
`channel_url`. The note body renders both as plain markdown (a linked channel
name, an embedded image); see the inline-field rule below.

**`media` deliberately repeats `url`.** They have different consumers: `url` is
the canonical pointer every source type carries and the dashboards read, while
`media` is Media Extended's own property key (it recognises `media`, `video` and
`audio`), which is what makes the embed and its seek-links resolve.

Don't expect a seek-link's URL to equal `url` or `media`: MX normalises the host
when it writes an anchor (a note captured from `youtu.be/<id>` gets anchors on
`www.youtube.com/watch?v=<id>`). See EXTERNAL-INTEGRATIONS.md → *Media Extended
seek-links*.

**`mx-uid` is what actually does the identifying, and we mint it.** Verified in
Obsidian 2026-07-23: MX keys its media-notes on `mx-uid`, *not* on `media` — its
parser reads `mx-uid` and gives up before it ever looks at `media`. A note
carrying only `media` is invisible to MX's library index, so MX creates its own
duplicate under `media-lib/`. MX offers no command to adopt an existing note,
so the capture module generates the id itself (`helpers.mxUid`), and with both
fields present MX treats the source note as the media-note.

This is a deliberate write into another plugin's private namespace, accepted to
keep **one note per source**. If an MX upgrade stops adopting captured notes,
`helpers.mxUid` is the first place to look — MX ships a `migrate-media-uid`
command, so the scheme has changed before.

**`captions` is written by Media Extended, not by us — don't hand-edit it.** It
is the one field in this schema no template or capture module emits: MX appends
it after you run its caption-fetch on an adopted note (observed live, v4.2.7,
2026-07-28). The value is a **list** of wikilinks to `.vtt` files in flat
`07 - Attachments/`, each carrying a query-ish fragment:

<!-- Plain fence, not ```yaml, on purpose: the conformance test reads every
     yaml-tagged block in this file as a field DECLARATION. This is an example
     of a value; the declaration is the YouTube / Video block above, and only
     that one block should have to stay in sync. -->

```
captions:
  - "[[mms5g4owpxkvm29rdzhev8c4.7zI4.en.vtt#lang=en&label=English+%28auto-generated%29]]"
```

The filename is `<mx-uid>.<short>.<lang>.vtt`, so the caption files inherit
whatever uid MX resolved for the note — change `mx-uid` after a fetch and the
link still resolves, but the name stops meaning anything. The `label` fragment
is URL-encoded (`%28auto-generated%29`), so don't pattern-match it raw.

Editing this list by hand does not change what MX loads; re-run the fetch
instead. It is documented here, and carried in the fixture's `PLUGIN_WRITTEN`,
purely so the vault knows the field exists — the schema fixture is built from
what our own producers emit, so a key a plugin invents is otherwise invisible to
it (#49).

### Podcast
```yaml
host:
guest:
url:
publish_date:
general_subject:
```

### Tweet

```yaml
account:
url:
keywords:
publish_date:
tweet_text:
```

### Lecture

```yaml
course: "[CourseName](CourseName)"
unit: "[UnitName](UnitName)"       # optional
lecturer: "[PersonName](PersonName)" # optional
lecture_num: 3
date_given: YYYY-MM-DD
url:
keywords:
```

The Course and Unit MOC templates hold **link-valued fields** (`default_lecturer` on Course, `course` on Unit). When unset, the template leaves the field empty with a YAML comment hint — e.g. `default_lecturer: # "[[link to an agent/person]]"` — so the parsed value stays genuinely empty while the raw frontmatter still teaches what belongs there. When set, the value is a quoted wikilink (`default_lecturer: "[[Jane Doe]]"`), which Obsidian renders as a link in the Properties panel. The lecture capture flow fills both automatically: a new Unit gets its `course`, and a newly created Course gets `default_lecturer` set to the first captured lecture's lecturer.

### Movie

```yaml
director:         # plain string, never a wikilink — see below
runtime:          # UNQUOTED whole minutes — see below
publisher:        # the studio
general_subject:  # the genre
released:         # release year
platform:         # where you watched it (Stremio, cinema, Blu-ray)
url:              # the Wikidata entity page (auto-fetch) or a manual link
thumbnail:        # the poster, from the film's English Wikipedia lead image
watched: YYYY-MM-DD
```

Studio reuses `publisher` and genre reuses `general_subject` deliberately, so
Movie inherits the dashboards Book/Paper/Podcast already feed rather than needing
new queries of its own. Only `director` and `runtime` are new vocabulary.

**`runtime` is emitted UNQUOTED, and it is the one frontmatter field a capture
module builds by hand.** `helpers.yamlField` always quotes, and a quoted number
makes Dataview compare **lexically** — `WHERE runtime < 100` would then be
silently wrong, because `"90" < "100"` is false. `sourceCaptureMovie.js`
therefore emits it as a bare YAML number, behind a digits-only guard on both the
fetched value and the prompt so the unquoted field can never be invalid YAML.
Don't "fix" it back to `yamlField`. (The vault's existing `lecture_num: "3"` is a
quoted number that has never bitten only because nothing queries it numerically.
It is not a precedent to copy.)

**`director` is a plain string, never a wikilink.** A validated picker over
`09 - Entities/Agents` like the Lecturer picker was costed and declined:
directors are long-tail — roughly 90 across 100 films — so auto-created Person
stubs become a note graveyard. Converting the field to wikilinks later is a
find-and-replace over one folder.

**No `media` / `mx-uid`.** Media Extended cannot play what a Movie note points
at, so a minted uid would be an orphan — the live bug in #48. Auto-fetch is
keyless, from Wikidata (`query.wikidata.org/sparql`), with the poster coming from
the Wikimedia REST summary endpoint; the primary-source survey behind that choice
is `research/movie-metadata-apis.md`.

### Series

The captured note is an **episode** — hence the `source/episode` tag. The series
and the season are MOCs, documented under [Series MOC
Fields](#series-moc-fields-04---mocsseries-04---mocsseasons) below.

```yaml
series:                    # "[[link to a Series MOC]]"
season:                    # "[[link to a Season MOC]]" — always series-qualified
episode:  3                # UNQUOTED, like runtime
released: YYYY-MM-DD       # the airdate
runtime:  53               # UNQUOTED whole minutes
url:                       # the canonical TVmaze episode page
watched: YYYY-MM-DD
```

**Flat pointers to both levels, never a chain.** The episode carries `series:`
**and** `season:`, exactly as a lecture carries `course:` and `unit:`. Chaining
(`season:` alone, with the series reachable only through it) was considered and
rejected in ADR 0011 as "option A" — it breaks one-hop metadata traversal.

**`episode` and `runtime` are both unquoted**, for the reason spelled out under
Movie above: the Season MOC sorts with `SORT episode ASC`, and a quoted number
would put episode 10 before episode 9.

Airdate reuses `released`, network reuses `publisher`, genres reuse
`general_subject` and the poster reuses `thumbnail`, consistent with Movie. Only
`series`, `season` and `episode` are new vocabulary. Auto-fetch is keyless, from
TVmaze, which is CC BY-SA — attribution is satisfied by storing the canonical
TVmaze URL in `url`.

### Thought

```yaml
context:
led_here:
```

### Inline fields (`key:: value`) — when they are allowed

Dataview reads **two** surfaces on every note: the YAML frontmatter, and inline
`key:: value` declarations anywhere in the body. Same-named declarations from
the two surfaces are **merged into one array**. A note with `channel:` in
frontmatter and `channel::` in the body therefore has `p.channel` equal to
`["Some Channel", "Some Channel"]` — the same value twice, rendered twice by any
`TABLE channel`.

Two rules, enforced by `frontmatterSchema.test.js`:

> **1. No echo.** A capture module's inline field names must be disjoint from
> its own frontmatter field names, compared **case-insensitively** — Dataview
> canonicalises inline keys, so `Course::` and `course:` are one field.
>
> **2. No captured value.** If the capture knows a value, that value goes in
> frontmatter. Inline fields are emitted **empty**, as placeholders for prose
> written later.

In short: *inline fields declare data frontmatter doesn't have; they never
restate it.* The conforming placeholders are Book's `citation::` and Paper's
`hypothesis::`, `methodology::`, `results::`, `summary::`, `context::` and
`significance::` — all emitted empty, all holding prose too long for YAML.

**Formatting is not a reason to use `::`.** Dataview renders inline fields as a
styled key-value row, which makes `::` tempting for a tidy metadata callout —
but the field declaration comes along with the look, invisibly. Plain markdown
gives the same rendering and declares nothing:

```markdown
> channel:: [Some Channel](https://youtube.com/@some)     ← link + a duplicate field
> **Channel:** [Some Channel](https://youtube.com/@some)  ← link, no field
```

Both render an identical clickable link. The `[text](url)` makes the link; the
`::` only ever made the duplicate. Same for images: `> ![](url)` embeds the
thumbnail with no `thumbnail::` needed.

See `docs/adr/0005-inline-field-contract.md`.

---

## Literature Note Fields (`02 - Literature Notes/`)

A Literature Note records an **atomic** idea that needs its source to be
intelligible, so it points back at that source: `source` is a **list** of one or
more wikilinks to captured Source notes. Everything else about the source —
author, URL, medium — is read by Dataview traversal, never copied onto the
literature note, so it can never drift from the source note it links. See
[ADR 0006](../../docs/adr/0006-literature-notes-link-to-source.md) and
[ADR 0010](../../docs/adr/0010-literature-vs-permanent-source-dependence.md).

```yaml
source: []       # "[[link to a Source note]]" — one or more
section:         # "[[link to a Section note]]" — only when one sits between this note and its source
review:          # YYYY-MM-DD – next review; defaults to 30 days, unlike Permanent's 14
```

**`source` is the discriminator.** Presence of the field *means* the note is
source-dependent, which is what makes it literature rather than permanent — not
its size (ADR 0010). It is a list because one atomic claim may rest on more than
one source, so traversal is now list-aware:

```
WHERE any(map(source, (s) => contains(s.file.tags, "source/paper")))
```

rather than the single-page `contains(source.file.tags, "source/paper")`.

**`section` carries containment, not metadata** (ADR 0011). It names the note's
*immediate* container — a **Section note** — and is **singular**, because
containment is a tree. **Omit it** when the note sits directly under its source:
`source:` already carries that relation, and a second field repeating the value
would be denormalize-by-value inside one note. The two hub levels therefore query
different fields — a Source note lists everything drawn from it at any depth with
`WHERE contains(source, [[]])`; a Section note lists its direct children with
`WHERE contains(section, [[]])`.

**`review` gives Promotion its trigger.** Literature notes carry a review date so
they surface in the due-review queue, where the prompt is *does this still need
its source to be intelligible?* — a "no" is the move to `03 - Permanent Notes`.
It defaults to **30 days** rather than Permanent's 14, because source-independence
changes over months, not fortnights.

Links may dangle: write `source: ["[[{ Some Book]]"]` before you've captured that
book as a Source note, and the traversal fields light up automatically once the
note exists.

---

## Curriculum MOC Fields (`04 - MOCS/Courses`, `04 - MOCS/Units`)

Course and Unit MOCs use a **structural** schema — no `id`/`growth`/`status`/
`review`, since they are navigation scaffolding rather than ideas ripening
toward evergreen. They do carry `type: moc`, so they render and query as MOCs.

### Course MOC

```yaml
type: moc
institution:
default_lecturer:   # "[[link to an agent/person]]"
```

### Unit MOC

```yaml
type: moc
course:             # "[[link to a course]]"
semester:
```

Both are created by hand or born as stubs by the lecture capture flow; either
way the template file is the single source of their shape.

---

## Series MOC Fields (`04 - MOCS/Series`, `04 - MOCS/Seasons`)

Series and Season MOCs use the **same light structural schema** as the
curriculum MOCs above — no `id`/`growth`/`status`/`review` — because Series →
Season → Episode is structurally identical to Course → Unit → Lecture. They carry
`type: moc`, so they render and query as MOCs. See ADR 0013.

### Series MOC

```yaml
type: moc
publisher:          # the network or streaming service
general_subject:    # genres
released:           # first aired
thumbnail:          # poster
url:                # the canonical TVmaze show page
```

### Season MOC

```yaml
type: moc
series:             # "[[link to a Series MOC]]"
released:           # the season's premiere date
episode_count:      # how many episodes the season ordered
```

**Season notes are always series-qualified** — `Severance S02`, never `S02`. The
Seasons folder is flat and stub creation returns early when the path already
exists, so a bare `S02` would silently reuse another series' season note with the
wrong `series:` field. Every series has an S02, so this is not a hypothetical.

**`episode_count` is a stored field rather than a Dataview count.** TVmaze
returns `episodeOrder` on the `/seasons` call, so it costs nothing at capture
time — and a count over captured notes could only ever report how many episodes
you have *already* written up, which is the opposite of the question the field
answers.

Both are created by hand or born as stubs by the series capture flow, which fills
them from the same fetch that supplies the episode; either way the template file
is the single source of their shape.

---

## Periodic Note Fields (`06 - Daily/`)

Daily, Weekly, Monthly, and Yearly notes all carry `type: periodic`. The
calendar grain lives in a separate `period` field rather than in `type`, so
adding a quarterly or half-yearly note later needs no new `type` value and no
change to the badge mappings.

```yaml
type: periodic
period:      # see the value table below
date:        # YYYY-MM-DD – first day of the period
week:        # "[[GGGG-Www]]" – parent week (Daily only)
month:       # "[[YYYY-MMM]]" – parent month (Weekly only)
year:        # "[[YYYY-Y]]"   – parent year (Monthly only)
```

**period**

| Value | Grain |
|---|---|
| daily | One day |
| weekly | One ISO week |
| monthly | One calendar month |
| quarterly | One quarter (no template yet) |
| half-yearly | Six months (no template yet) |
| yearly | One calendar year |

`quarterly` and `half-yearly` are reserved: the vocabulary is pinned so that
whoever adds those templates inherits the spelling rather than inventing one.

---

## Entity Fields (`09 - Entities/`)

Entity notes (`09 - Entities/Agents/` and `09 - Entities/Non-Agents/`) use a **lightweight** schema — no `id`/`growth`/`status`/`review`, since they're reference facts about the world, not ideas being processed toward evergreen:

```yaml
---
type: entity
tags:         # subtype tag, e.g. agent/person, nonagent/place
aliases:
created:
---
```

Plus subtype-specific structured fields:

### Person (`agent/person`)
```yaml
role:
organization:     # [[link]]
contact:
website:
```

### Organization (`agent/organization`)
```yaml
founded:
sector:
website:
headquarters:     # [[link]] to a Place entity
key_people:       # list of [[link]]s to Person entities
```

### Country (`agent/country`)
```yaml
government_type:
established:
capital:          # [[link]] to a Place entity
leader:           # [[link]] to a Person entity
```

### Synthetic Agent — AI/algorithms (`agent/synthetic`)
```yaml
creator:          # [[link]]
release_date:
model_family:
url:
```

### Place (`nonagent/place`)
```yaml
coordinates:
region:
country:          # [[link]]
historical:       # true/false, optional
```

### Artifact (`nonagent/artifact`)
```yaml
creator:          # [[link]]
date_created:
location:         # [[link]] to current Place
medium:
```

### Tool (`nonagent/tool`)
```yaml
creator:          # [[link]]
category:
version:          # optional
```

### System (`nonagent/system`)
```yaml
scope:
origin_date:
components:       # optional list
```

### Natural Entity (`nonagent/natural`)
```yaml
location:         # [[link]]
classification:
```

### Event (`nonagent/event`)
```yaml
date:
location:         # [[link]]
participants:     # list of [[link]]s to Agent entities
```

Classification (Agent vs. Non-Agent) is a folder decision, made once, based on whether the entity can decide/act. Subtype within that folder is a tag, not a subfolder — a note never needs to move when your understanding of its finer category changes. See [Entities MOC](../../04%20-%20MOCS/Entities.md) for the curated Dataview browse view.

## Tags System

Tags are **broad categorical umbrellas**. Links carry meaning. Tags tell you _what category_ something is; links tell you _what it connects to_.

|Tag|Applied to|
|---|---|
|`source/book`|Book notes|
|`source/article`|Article notes|
|`source/paper`|Paper notes|
|`source/youtube`|YouTube notes|
|`source/video`|Video notes|
|`source/podcast`|Podcast notes|
|`source/tweet`|Tweet notes|
|`source/lecture`|Lecture notes|
|`source/movie`|Movie notes|
|`source/episode`|Series episode notes|
|`note/thought`|Thought notes|
|`course`|Course MOCs|
|`course-unit`|Unit MOCs|
|`series`|Series MOCs|
|`series-season`|Season MOCs|
|`agent/person`|Person entity notes|
|`agent/organization`|Organization entity notes|
|`agent/country`|Country entity notes|
|`agent/synthetic`|Synthetic/AI agent entity notes|
|`nonagent/place`|Place entity notes|
|`nonagent/artifact`|Artifact entity notes|
|`nonagent/tool`|Tool entity notes|
|`nonagent/system`|System entity notes|
|`nonagent/natural`|Natural entity notes|
|`nonagent/event`|Event entity notes|
|`Daily`|Daily notes (capital D)|
|`Weekly`|Weekly notes (capital W)|
|`Monthly`|Monthly notes (capital M)|
|`Yearly`|Yearly notes (capital Y)|

Do not use tags for growth stage (`seedling`, etc.) – those are kept in `growth:` field so Dataview can filter them easily.

## Naming Conventions

Source prefixes:

```text
{ Book
( Article
& Paper
+ Video
% Podcast
! Tweet
= Thought
§ Lecture
~ Movie
» Series (an episode)
```

Examples:

```text
{ Thinking Fast and Slow
& Attention and Working Memory
§ 2025-02-14 – PSY101 – Introduction to Memory
~ Dune
» Severance S02E03 – Who Is Alive?
```

Lecture notes are titled `§ YYYY-MM-DD – CourseCode – Lecture Title`, where `CourseCode` is the linked Course MOC's name — see [TEMPLATES.md](TEMPLATES.md).

Episode notes are titled `» SeriesName SxxEyy – Episode Title`, keeping the
episode's own title in the filename because that is how a reader recognises one
in a file list. The known cost is that a title can be spoilery for an unwatched
episode; the fallback, if that becomes annoying, is a code-only filename with the
title in `aliases`.

---
