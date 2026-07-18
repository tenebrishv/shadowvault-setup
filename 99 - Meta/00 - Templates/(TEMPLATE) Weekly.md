<%*
const { periodStart: weekStart, periodEnd: weekEnd, prevLabel, nextLabel } = await tp.user.periodicNoteHelpers.resolvePeriod(tp, "weekly");
const monthLabel = tp.user.periodicNoteHelpers.parentLabel(weekStart, "month", "YYYY-MMM");
%>---
type: periodic
period: weekly
date: <% weekStart.format("YYYY-MM-DD") %>
tags:
  - Weekly
aliases:
month: "[[<% monthLabel %>]]"
---

# WEEKLY REVIEW
## Week <% weekStart.format("WW, GGGG") %>

***

### 🌟 Highlights

*What stood out this week?*

- 

***

### 🗒️ Notes Created This Week

```dataview
LIST
FROM ""
WHERE file.cday >= date("<% weekStart.format("YYYY-MM-DD") %>")
AND file.cday < date("<% weekEnd.format("YYYY-MM-DD") %>")
AND type != "daily"
SORT file.ctime ASC
```

***

### 📅 Daily Notes This Week

```dataview
LIST
FROM "06 - Daily"
WHERE file.cday >= date("<% weekStart.format("YYYY-MM-DD") %>")
AND file.cday < date("<% weekEnd.format("YYYY-MM-DD") %>")
SORT file.cday ASC
```

***

### 🌱 Open Threads

*Projects, seedlings, or reviews still needing attention.*

- 

***

### 🔭 Plan for Next Week

*What deserves focus next?*

- 

***

### 🗓️ Navigation

↑ Month: [[<% monthLabel %>]]

← [[<% prevLabel %>]] | [[<% nextLabel %>]] →
