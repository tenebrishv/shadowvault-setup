---
tags: course
aliases:
  - "<% tp.file.title %>"
created: <% tp.date.now("YYYY-MM-DDTHH:mm") %>
institution: 
default_lecturer: [[]]
---

# <% tp.file.title %>

> [!info]- Course Info
> **Institution:** 
> **Default Lecturer:** 
> **Semester / Year:** 

## Units

```dataview
LIST
FROM "04 - MOCS/Units" AND #course-unit
WHERE contains(course, [[]])
SORT file.name ASC
```

## Lectures

```dataview
LIST
FROM #source/lecture
WHERE contains(course, [[]])
SORT date_given ASC
```

