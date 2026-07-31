---
type: moc
tags: series-season
series: # "[[link to a series]]"
released: 
episode_count: 
aliases:
  - "<% tp.file.title %>"
created: <% tp.date.now("YYYY-MM-DDTHH:mm") %>
---

# <% tp.file.title %>

## Episodes

```dataview
LIST
FROM #source/episode
WHERE contains(season, [[]])
SORT episode ASC
```

## Season Notes

