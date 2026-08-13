# Glossary

The vocabulary ShadowVault uses for its own parts. Most of these words exist
elsewhere in PKM writing with looser meanings — this page pins down what they
mean *here*, so the rest of the documentation can be read precisely.

README: [README](../../README.md)

---

## The note pipeline

### Source-dependence

The axis that separates literature notes from permanent notes: **does this idea
require a source to be intelligible?**

It is *orthogonal to atomicity*. An idea can be atomic and still make no sense
without the source it came from; a claim can be source-independent and still
have been synthesised from several sources. Size is not the discriminator —
dependence on a source is.

Source-dependence is encoded structurally, not by judgement: a note carries the
`source:` frontmatter field when it is source-dependent, and omits it when it is
not. That makes the distinction legible from the frontmatter alone, so a note's
label can't drift away from what the note actually is.

### Source note

The captured record of a work you consumed — a book, article, paper, video,
podcast, lecture, tweet, thought, movie or series episode. It lives in
`01 - Sources/` (after being filed out of `00 - Inbox/`), carries the work's own
metadata (author, URL, publication date, medium), and its filename opens with
the prefix for its type: `{` book, `(` article, `&` paper, `+` video, `%`
podcast, `!` tweet, `=` thought, `§` lecture, `~` movie, `»` series episode.

A Source note is **raw material plus your holistic response to it** — the
[Source recap](#source-recap) lives here. The atomic ideas drawn out of it live
in separate literature notes that link back with `source:`.

See [TEMPLATES](TEMPLATES.md) for how source notes are captured, and
[METADATA](METADATA.md) for the per-type fields.

### Literature note

A **source-dependent, atomic** note: one idea, which needs one or more sources
to be intelligible. Lives in `02 - Literature Notes/` with `type: literature`,
and carries `source:` as a list of one or more links to Source notes.

The metadata about the source — author, URL, medium — is never copied onto the
literature note. It is read through the `source:` link, so it cannot drift from
the Source note it came from.

A literature note is *not* "a summary of a source". A whole-source summary is
the [Source recap](#source-recap), and it belongs on the Source note. The one
literature note that isn't an idea note is the [Section note](#section-note),
which is a hub.

### Permanent note

A **source-independent** claim: intelligible on its own, or through other ideas
that supersede it, without needing a source to make sense. Lives in
`03 - Permanent Notes/` with `type: permanent`, and carries **no** `source:`
frontmatter — origins worth citing go in a body `## Sources` list as evidence
rather than as a dependency.

Always atomic: one claim per note, stated as a claim.

Permanent notes are not a later life-stage that every note reaches. An idea you
formed yourself is **born permanent** — it never was a literature note.

### Promotion

The move from literature note to permanent note, when an idea no longer needs
its source to make sense:

1. Drop the `source:` frontmatter (move the links into a body `## Sources` list
   if they're still worth citing).
2. Drop `section:` if present — a source-independent claim cannot sit inside a
   source's internal structure.
3. Drop the `> [!quote] From the Source` anchor; its page pointer or seek-link
   is source-dependent by construction.
4. Flip `type: literature` to `type: permanent`.
5. Move the file from `02 - Literature Notes/` to `03 - Permanent Notes/`.

Promotion is **conditional, not automatic** — most literature notes stay
literature notes, and that is a correct outcome, not a backlog.

It is **triggered by review and performed by hand.** Literature notes carry a
`review:` date (30 days by default, against a permanent note's 14) so they
surface in the due-review queue, where the prompt is exactly the question above:
*does this still need its source to be intelligible?* The edits are mechanical
but the judgement is the whole job, so the move stays manual. See
[REVIEW-SYSTEM](REVIEW-SYSTEM.md).

### Source recap

Your holistic response to a source, written **on the Source note itself**: a
restatement of the argument in your own words, your reaction to it, and the
connections it opens. It is the counterpart to the atomic literature notes drawn
from the same source, which each carry a single claim.

A source type gets a recap block when it is something you *consume and respond
to* **and** has no reflective scaffold of its own — so a Lecture and a Thought
don't get one (they already have their own), and a Tweet doesn't earn one.

### Section note

A **thin hub** over one span of a long source — a book's part, a paper's
section. It carries a query listing the literature notes whose `section:` field
names it, plus a small prose slot for that span's through-line.

It hubs, it does not summarise: there is exactly one holistic response per
source, and it is the [Source recap](#source-recap) on the Source note, never
one per section.

A Section note is **not a separate note type**. It is an ordinary literature
note (`type: literature`) that happens to have descendants, made into a hub by
inserting the `(TEMPLATE) Section Hub` block. Reach for one only when a source
is long and dense enough that its ideas need an intermediate layer — a short
source hubs its literature notes directly.

---

## Growth

### Growth stages

The `growth` frontmatter field records how developed a note is. It is a
maturity scale, not a workflow status, and a note can move backwards along it:

| Stage | | Meaning |
|---|---|---|
| `seedling` | 🌱 | Raw capture. Rough or empty. Needs development. |
| `fern` | 🌿 | Partially developed. Has some explanation. Needs more thinking. |
| `incubator` | 🔆 | Complete thought. Can stand alone. Not yet linked. |
| `evergreen` | 🌲 | Polished, atomic, linked, and connected. |

**Evergreen is not a finish line.** It is the current best version of an idea,
still open to revision — see the Evergreen Development Workflow in
[WORKFLOWS](WORKFLOWS.md).

Growth is independent of [source-dependence](#source-dependence): a literature
note can be evergreen without ever becoming a permanent note.

---

## Navigation

### MOC (Map of Content)

A curated navigation note that gathers links around a theme, in
`04 - MOCS/`. A MOC reflects **understanding, not classification** — it is
written as you come to see how a set of ideas fit together, and it is the reason
the vault's folders can stay shallow. Organisation happens through links and
MOCs, not through folder hierarchy.

### Curriculum MOC

A structural MOC that exists to hold a hierarchy rather than to express
understanding: the **Course** and **Unit** MOCs above a captured lecture, and
their television counterparts, the **Series** and **Season** MOCs above a
captured episode.

They carry `type: moc` so they render and query as MOCs, but they use a lighter
schema — no `id`, `growth`, `status` or `review`, because they are navigation
scaffolding, not ideas ripening toward evergreen. The lecture and series capture
flows create them automatically when you name one that doesn't exist yet.

Note that a Season MOC is always named with its series (`Severance S02`, never
`S02`), because the Seasons folder is flat and a bare `S02` would collide with
every other series' second season.

---

## See also

- [STRUCTURE](STRUCTURE.md) — the folders these notes live in, and why they are shallow
- [WORKFLOWS](WORKFLOWS.md) — how an idea moves between them
- [METADATA](METADATA.md) — the frontmatter fields named above, per note type
- [TEMPLATES](TEMPLATES.md) — the templates that write them
