# Design Philosophy

This vault is built on a set of core principles. Every folder, template, and automation is shaped by these ideas.

README: [README](../../README.md)

---

## 1. Functionality Before Aesthetics

> *"A tool must work first and look beautiful second."*

Visual polish is welcome, but it never comes at the cost of utility. The vault works with any Obsidian theme today; a pure-black **Vanilla AMOLED** look plus CSS snippets (notebook backgrounds, daily themes, colored sidebar) is the intended aesthetic layer, tracked in [CSS.md](CSS.md) — but it is optional and not yet built. Nothing here blocks using the vault without it.

---

## 2. Links Over Folders

> *"A note about 'Memory' could belong to Psychology, Neuroscience, and Study Skills simultaneously – so it belongs to none of them as a folder."*

Folders are shallow (no nesting deeper than 2–3 levels). The real structure emerges from **wikilinks** and **Maps of Content (MOCs)**. A permanent note is not *located* in a single category – it is *connected* to many.

**The one deliberate exception:** `09 - Entities/Agents/` vs. `09 - Entities/Non-Agents/` (see [Principle 11](#11-entities-agency-as-the-dividing-line)). It is a folder split, not a tag, because it is a stable fact about an entity that's decided once and never revisited — unlike a permanent note's subject matter, which shifts as understanding grows. A folder is the wrong tool for evolving categorization; it is the right tool for a classification that doesn't change.

---

## 3. Atomic Notes

> *"Each permanent note should contain exactly one idea, stated as a claim."*

A note titled "Memory" is too broad. "Working memory capacity is limited to 4±1 chunks" is atomic. This forces clarity and encourages linking.

**Test for atomicity:** Can you delete half the note and still have a coherent idea? If yes, the note likely contains two ideas.

---

## 4. Nothing Is Ever Finished

Notes have a `growth` field (seedling → fern → incubator → evergreen), but even "evergreen" notes can be revised. The goal is **continuous improvement**, not perfection. [Note Maturity Model](WORKFLOWS.md#Note%20Maturity%20Model)

Scheduled reviews (`review:` date) ensure notes do not rot.

**Exception:** `09 - Entities/` notes carry no `growth`/`status`/`review`. They record reference *facts* about a real-world noun (a person, a place, a tool), not an *idea being developed* — there is no maturity arc to track. This principle governs thinking notes, not reference notes.

---

## 5. Avoid the Collector's Fallacy

> *"Capturing without connecting and refining is hoarding, not thinking."*

The vault does not reward collecting sources. Every capture must eventually be processed into literature notes, permanent notes, or projects – or deleted.

The `status: inbox` is a temporary state, not a permanent holding pen.

---

## 6. Progressive Summarization

Layers of distillation are built into the note templates:

- **Source note** – raw capture + metadata + highlights.
- **Literature note** – your summary + reaction + key excerpts.
- **Permanent note** – atomic idea with one‑liner evidence and connections.
- **MOC** – curated pathway through a topic (the highest-level summary).

Each layer reduces volume while increasing insight density.

---

## 7. Pragmatic Automation

Automation should **reduce friction, not hide understanding**. The `Source Capture` template fetches metadata, but you can override everything. Lecture pickers suggest existing courses, but you can create new ones on the fly.

The vault is not a black box – every decision is transparent and editable.

---

## 8. Designed for Serendipity

The graph, random note, and local backlinks are first‑class citizens. The system encourages **surprise connections** – the most valuable insights often come from linking two notes that were never meant to meet.

Folders are not forbidden, but they are not the primary navigation method.

---

## 9. Time as a First‑Class Dimension

Daily, weekly, monthly, and yearly notes create a **temporal backbone**. Reviews are scheduled. The `created` and `review` timestamps allow queries like "what did I think about X six months ago?"

This transforms the vault from a static archive into a living, time‑aware thinking tool.

As with Principle 4, `09 - Entities/` notes sit outside this dimension deliberately — a fact about a person or place doesn't age the way an idea does, so it has no `created`/`review` timestamps to place it in the timeline.

---

## 10. Your Brain Is for Having Ideas, Not Storing Them

The vault's entire purpose is **external cognition**. You store notes so your brain can focus on connecting, questioning, and creating.

If the vault ever feels like a chore, something is wrong. Optimise for *thinking*, not for *organisation*.

---

## 11. Entities: Agency as the Dividing Line

> *"Can it decide, or can it only be acted upon?"*

`09 - Entities/` holds real-world nouns — people, places, tools, organizations, events — that the vault needs to reference but isn't actively *thinking about*. They are split into two flat folders by one question: does this entity have decision-making power (`Agents/`: people, organizations, countries, synthetic/AI) or only structural/relational influence (`Non-Agents/`: places, artifacts, tools, systems, natural entities, events)?

Everything *below* that top split — Person vs. Organization vs. Country, or Place vs. Tool vs. Event — is a **tag** (`agent/person`, `nonagent/place`), not a subfolder, exactly as Principle 2 prescribes. Only the agency question gets a folder, because it's the one classification about an entity that is decided once, doesn't shift with understanding, and never requires a note to move.

---

*These principles are guidelines, not laws. Break them when useful.*