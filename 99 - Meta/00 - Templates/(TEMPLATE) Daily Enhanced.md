---
date: <%tp.date.now("YYYY-MM-DD")%>T<%tp.date.now("HH:mm")%>
tags:
  - Daily
cssclasses:
  - daily
  <% "- " + tp.date.now("dddd", 0, tp.file.title, "YYYYMMDD").toLowerCase() %>
---

# DAILY NOTE
## <% tp.date.now("dddd, MMMM Do, YYYY", 0, tp.file.title, "YYYYMMDD") %>

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
WHERE file.cday = date("<% tp.date.now("YYYY-MM-DD") %>")
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

← [[<% tp.date.now("YYYYMMDD", -1) %>]] | [[<% tp.date.now("YYYYMMDD", 1) %>]] →
