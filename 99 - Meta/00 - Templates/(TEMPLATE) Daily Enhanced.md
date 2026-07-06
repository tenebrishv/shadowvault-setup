<%*
const anchor = await tp.user.periodicNoteHelpers.resolveDailyAnchor(tp);
const weekLabel = tp.user.periodicNoteHelpers.parentLabel(anchor, "isoWeek", "GGGG-[W]WW");
%>---
date: <% anchor.format("YYYY-MM-DD") %>T<% tp.date.now("HH:mm") %>
tags:
  - Daily
aliases:
cssclasses:
  - daily
  - <% anchor.format("dddd").toLowerCase() %>
week: "[[<% weekLabel %>]]"
---

# DAILY NOTE
## <% anchor.format("dddd, MMMM Do, YYYY") %>

***

### ☀️ Morning Check-in

**Intention for today:**

**Energy level:** ⬜⬜⬜⬜⬜

***

### 📥 Capture

*Dump ideas, observations, questions here throughout the day. Process later.*

- 

***

### 📚 What I'm Working With

*Sources being consumed today.*

- 

***

### 🗒️ Notes Created Today

```dataview
LIST
FROM ""
WHERE file.cday = date("<% anchor.format("YYYY-MM-DD") %>")
AND type != "daily"
SORT file.ctime ASC
```

***

### 🔗 Notes Linked Today

*What permanent notes did you connect or update?*

- 

***

### ✅ Tasks

- [ ] Process inbox
- [ ] 

***

### 🌙 Evening Reflection

**What did I learn today?**

**What should carry forward?**

***

### 🗓️ Navigation

↑ Week: [[<% weekLabel %>]]

← [[<% anchor.clone().subtract(1, "day").format("YYYYMMDD") %>]] | [[<% anchor.clone().add(1, "day").format("YYYYMMDD") %>]] →
