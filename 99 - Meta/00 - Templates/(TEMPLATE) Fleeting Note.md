---
id: <% tp.date.now("YYYYMMDDHHmm") %>
title: <% tp.file.title %>
type: fleeting
growth: seedling
status: active
created: <% tp.date.now("YYYY-MM-DD") %>
tags:
cssclasses:
---

# <% tp.file.title %>

> [!abstract]- Badges
> `= choice(this.growth="seedling","🌱 Seedling", choice(this.growth="fern","🌿 Fern", choice(this.growth="incubator","🔆 Incubator", choice(this.growth="evergreen","🌲 Evergreen", this.growth))))` · `= choice(this.status="inbox","📥 Inbox", choice(this.status="processing","⚙️ Processing", choice(this.status="active","🟢 Active", choice(this.status="completed","✅ Completed", choice(this.status="archived","🗄️ Archived", this.status)))))`

*Capture the raw thought. Don't overthink it.*

---

## The Thought


---

## Context

*What were you doing / reading / listening to when this came up?*

---

## Next Action

- [ ] Process into permanent note
- [ ] Find related notes
- [ ] Research further
- [ ] Discard

---
*Captured: <% tp.date.now("YYYY-MM-DD HH:mm") %> — process within 48h*
