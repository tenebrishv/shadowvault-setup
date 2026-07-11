---
id: <% tp.date.now("YYYYMMDDHHmm") %>
title: <% tp.file.title %>
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
> *What is the core claim of this note in a single sentence?*

---

## Core Idea

*Develop the idea here. Keep this note atomic — one idea only.*

---

## Why It Matters

*Why does this idea matter? What does it connect to?*

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
