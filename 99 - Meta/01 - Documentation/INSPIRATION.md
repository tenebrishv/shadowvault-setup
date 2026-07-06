# Sources & Inspirations

ShadowVault is not built from scratch. It synthesises ideas and workflows from several established Personal Knowledge Management (PKM) systems. This document credits the thinkers and methods that shaped the vault.

README: [README](../../README.md)

---

## Zettelkasten

**Niklas Luhmann** – German sociologist who developed the *slip‑box* method.

**Influences on ShadowVault:**
- **Atomic notes** – each permanent note contains exactly one idea.
- **Unique IDs** – every note gets a timestamp ID (`YYYYMMDDHHmm`). This is a looser nod to Luhmann's practice of giving every slip a permanent, collision-free identifier – not his actual alphanumeric *folgezettel* branching scheme (`3/1a2b3`, etc.). Adopting real Luhmann-style IDs is tracked as an open idea in [ROADMAP.md](ROADMAP.md#ideas-under-consideration).
- **Links over folders** – the primary organisation is through connections between notes, not hierarchical folders.
- **Bottom‑up structure** – ideas emerge from notes, not from a predetermined outline.

**Further reading:** *How to Take Smart Notes* by Sönke Ahrens.

---

## Andy Matuschak's Evergreen Notes

**Andy Matuschak** – designer, engineer, and PKM thinker.

**Influences on ShadowVault:**
- **Notes as executable ideas** – a note should be a self‑contained, understandable unit that can be used in thinking.
- **Iterative refinement** – notes are never finished; they are continuously improved (reflected in the `growth` field).
- **Maps of Content (MOCs) as curated views** – MOCs are not indexes; they express understanding and highlight relationships.
- **Writing as a thinking tool** – the act of writing a note *is* the act of thinking.

**Further reading:** [Andyʼs working notes](https://notes.andymatuschak.org/) (public).

---

## Nick Milo's Linking Your Thinking (LYT)

**Nick Milo** – creator of the LYT framework and Obsidian ambassador.

**Influences on ShadowVault:**
- **Maps of Content (MOCs)** – home notes that provide structure without rigidity.
- **The ACE (Atlas, Calendar, Efforts) framework** – adapted into folders:
  - *Atlas* → `04 - MOCS/`
  - *Calendar* → `06 - Daily/`
  - *Efforts* → `05 - Projects/`
- **Idea emergence** – let structure emerge from the notes, not pre‑defined categories.
- **Home note** – `04 - MOCS/Home.md` as the vault's entry point.

**Further reading:** [Linking Your Thinking](https://www.linkingyourthinking.com/) (website and YouTube channel).

---

## Progressive Summarization

**Tiago Forte** – creator of *Building a Second Brain* (BASB).

**Influences on ShadowVault:**
- **Layers of distillation** – implemented as the Source → Literature → Permanent → MOC pipeline, each layer reducing volume while increasing insight density (see [DESIGN-PHILOSOPHY.md](DESIGN-PHILOSOPHY.md#6-progressive-summarization)). Note this is ShadowVault's own layering, not Forte's specific bold/highlight passes — the vault's actual highlight convention is a Zettelkasten-style importance/reaction color scheme (Yellow/Green/Pink/Purple/Blue), documented in [WORKFLOWS.md](WORKFLOWS.md#book-workflow).
- **The collector's fallacy** – captured in the philosophy: "capturing without connecting and refining is hoarding, not thinking."
- **Review as compression** – scheduled reviews encourage re‑distilling notes into even shorter forms.

**Further reading:** *Building a Second Brain* by Tiago Forte.

---

## Tallguyjenks (Jamie)

**Jamie** – Obsidian YouTuber and template creator.

**Influences on ShadowVault:**
- **Pragmatic, template‑driven capture** – the entire `Source Capture` system is inspired by his approach.
- **Prefix convention for sources** – symbols before filenames (`{` for Book, `§` for Lecture, etc.) to visually distinguish note types in the file explorer.
- **Smart prompts with auto‑fetch** – using public APIs to reduce manual entry.
- **Lecture picker with course/unit/people validation** – directly adapted from his workflow.

**Further reading:** [Tallguyjenks on YouTube](https://www.youtube.com/@Tallguyjenks).

---

## Synthesis

ShadowVault does not follow any single system strictly. It takes what works from each system.

