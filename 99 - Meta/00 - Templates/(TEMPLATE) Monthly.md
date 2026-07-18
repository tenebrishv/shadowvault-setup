<%*
const { periodStart: monthStart, periodEnd: monthEnd, prevLabel, nextLabel } = await tp.user.periodicNoteHelpers.resolvePeriod(tp, "monthly");
const yearLabel = tp.user.periodicNoteHelpers.parentLabel(monthStart, "year", "YYYY-[Y]");
%>---
type: periodic
period: monthly
date: <% monthStart.format("YYYY-MM-DD") %>
tags:
  - Monthly
aliases:
year: "[[<% yearLabel %>]]"
---

# MONTHLY REVIEW
## <% monthStart.format("MMMM YYYY") %>

***

### 🌟 Patterns & Themes

*What recurred this month? What surprised you?*

- 

***

### 🗒️ Notes Created This Month

```dataview
LIST
FROM ""
WHERE file.cday >= date("<% monthStart.format("YYYY-MM-DD") %>")
AND file.cday < date("<% monthEnd.format("YYYY-MM-DD") %>")
AND type != "daily"
SORT growth ASC
```

***

### 🗺️ MOCs Touched This Month

*Which Maps of Content grew or need updating?*

- 

***

### 🌲 Growth Stage Snapshot

```dataview
TABLE WITHOUT ID
  growth AS "Growth", length(rows) AS "Count"
FROM "03 - Permanent Notes"
GROUP BY growth
SORT growth ASC
```

***

### 🔭 Neglected Areas

*Topics or projects that haven't been touched in a while.*

- 

***

### 🗓️ Navigation

↑ Year: [[<% yearLabel %>]]

← [[<% prevLabel %>]] | [[<% nextLabel %>]] →
