---
id: <% tp.date.now("YYYYMMDDHHmm") %>
type: permanent
growth: seedling
status: active
created: <% tp.date.now("YYYY-MM-DD") %>
modified: <% tp.date.now("YYYY-MM-DD") %>
review: <% tp.date.now("YYYY-MM-DD", 14) %>
tags:
aliases:
cssclasses:
---

# <% tp.file.title %>

> [!abstract]- Badges
> `= choice(this.growth="seedling","🌱 Seedling", choice(this.growth="fern","🌿 Fern", choice(this.growth="incubator","🔆 Incubator", choice(this.growth="evergreen","🌲 Evergreen", this.growth))))` · `= choice(this.status="inbox","📥 Inbox", choice(this.status="processing","⚙️ Processing", choice(this.status="active","🟢 Active", choice(this.status="completed","✅ Completed", choice(this.status="archived","🗄️ Archived", this.status)))))`

> [!tip] One-liner
> *In one sentence, the claim this note reduces to. Write this last — if you can't state it in a sentence, the note isn't atomic yet: split it.*

---

## Core Idea

*Develop and justify the claim — the reasoning, mechanism, or evidence-in-brief. Not a restatement of the one-liner. Keep this note atomic — one idea only.*

---

> [!note]- Why It Matters
> *Optional — what changes if this is true? Delete this section if the significance is already obvious from the idea.*

---

## Evidence & Examples

- 

---

## Related Notes

- 

---

## Sources

- 

---
*Created: <% tp.date.now("YYYY-MM-DD") %> | Growth: seedling*
