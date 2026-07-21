---
id: <% tp.date.now("YYYYMMDDHHmm") %>
type: literature
growth: seedling
status: active
source:             # "[[link to the Source note]]"
created: <% tp.date.now("YYYY-MM-DD") %>
modified: <% tp.date.now("YYYY-MM-DD") %>
tags:
aliases:
cssclasses:
---

# <% tp.file.title %>

> [!abstract]- Badges
> `= choice(this.growth="seedling","🌱 Seedling", choice(this.growth="fern","🌿 Fern", choice(this.growth="incubator","🔆 Incubator", choice(this.growth="evergreen","🌲 Evergreen", this.growth))))` · `= choice(this.status="inbox","📥 Inbox", choice(this.status="processing","⚙️ Processing", choice(this.status="active","🟢 Active", choice(this.status="completed","✅ Completed", choice(this.status="archived","🗄️ Archived", this.status)))))`

> [!quote] From the Source
> *Paste the key quote or idea you're responding to here.*

---

## In My Own Words

*Restate the idea entirely in your own language. No copy-paste.*

---

## What This Makes Me Think

*Your reaction, extension, or disagreement with the idea.*

---

## Connections

*What permanent notes or other ideas does this point toward?*

- 

---

## Source Reference

*Title, author, and URL live on the linked `source` note — don't copy them here. Record only what's specific to **this** reading:*

- **Location:** (page, timestamp, or the passage you're responding to)

---
*Created: <% tp.date.now("YYYY-MM-DD") %> | Type: literature*
