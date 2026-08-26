---
type: moc
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
AND (this.course = null OR contains(course, this.course))
SORT date_given ASC
```

## Core Concepts


