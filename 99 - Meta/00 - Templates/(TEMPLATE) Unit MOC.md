---
tags: course-unit
course: # "[[link to a course]]"
semester:
aliases:
  - "<% tp.file.title %>"
created: <% tp.date.now("YYYY-MM-DDTHH:mm") %>
---

# <% tp.file.title %>

## Lectures
```dataview
LIST
FROM #source/lecture
WHERE contains(unit, [[]])
SORT date_given ASC
```

## Core Concepts


