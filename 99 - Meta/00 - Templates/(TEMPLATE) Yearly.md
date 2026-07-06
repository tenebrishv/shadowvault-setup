<%*
const { periodStart: yearStart, periodEnd: yearEnd, prevLabel, nextLabel } = await tp.user.periodicNoteHelpers.resolvePeriod(tp, "yearly");
%>---
date: <% yearStart.format("YYYY-MM-DD") %>
tags:
  - Yearly
aliases:
---

# ANNUAL REVIEW
## <% yearStart.format("YYYY") %>

***

### 🌟 Annual Reflection

*What defined this year? What are you proud of?*

- 

***

### 🌲 Evergreen Notes Written This Year

```dataview
LIST
FROM "03 - Permanent Notes"
WHERE growth = "evergreen"
AND file.cday >= date("<% yearStart.format("YYYY-MM-DD") %>")
AND file.cday < date("<% yearEnd.format("YYYY-MM-DD") %>")
SORT file.cday ASC
```

***

### 🗄️ Prune or Archive

*Notes, sources, or projects that no longer serve a purpose.*

```dataview
TABLE growth, status, modified
FROM "01 - Sources" OR "05 - Projects"
WHERE status = "archived"
SORT modified DESC
```

- 

***

### 🎯 Goals for Next Year

- 

***

### 🗓️ Navigation

← [[<% prevLabel %>]] | [[<% nextLabel %>]] →
