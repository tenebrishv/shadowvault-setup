---
id: <% tp.date.now("YYYYMMDDHHmm") %>
title: <% tp.file.title %>
type: literature
growth: seedling
status: active
source-title:
source-author:
source-type: book
source-url:
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

- **Title:**
- **Author:**
- **Location:** (page, timestamp, URL)

---
*Created: <% tp.date.now("YYYY-MM-DD") %> | Type: literature*
