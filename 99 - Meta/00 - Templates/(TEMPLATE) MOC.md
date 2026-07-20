---
id: <% tp.date.now("YYYYMMDDHHmm") %>
type: moc
growth: seedling
status: active
created: <% tp.date.now("YYYY-MM-DD") %>
modified: <% tp.date.now("YYYY-MM-DD") %>
tags:
aliases:
cssclasses:
---

# <% tp.file.title %>

> [!abstract]- Badges
> `= choice(this.status="inbox","📥 Inbox", choice(this.status="processing","⚙️ Processing", choice(this.status="active","🟢 Active", choice(this.status="completed","✅ Completed", choice(this.status="archived","🗄️ Archived", this.status)))))`
> (MOCs don't use `growth`, since they're curated navigation rather than an idea maturing toward evergreen.)

> *What is this MOC about? One sentence orientation.*

---

## 🌱 Start Here

*The best entry point — foundational ideas.*

- 

---

## Core Ideas

*The main permanent notes that form the backbone of this topic.*

- 

---

## Open Questions

*What remains unresolved? What do you want to think about more?*

- 

---

## Threads to Follow

*Notes that branch outward into other topics.*

- 

---

## Sources

*Key sources that fed this MOC.*

- 

---

## Dataview: Notes in this Area

```dataview
TABLE growth, created
FROM [[]] 
SORT created DESC
```

---
*Created: <% tp.date.now("YYYY-MM-DD") %> | Type: MOC*
