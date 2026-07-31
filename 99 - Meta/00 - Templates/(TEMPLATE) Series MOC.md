---
type: moc
tags: series
publisher: 
general_subject: 
released: 
thumbnail: 
url: 
aliases:
  - "<% tp.file.title %>"
created: <% tp.date.now("YYYY-MM-DDTHH:mm") %>
---

# <% tp.file.title %>

> [!info]- Series Info
> **Network / Service:** 
> **Genres:** 
> **First aired:** 

## Seasons

```dataview
LIST
FROM "04 - MOCS/Seasons" AND #series-season
WHERE contains(series, [[]])
SORT file.name ASC
```

## Episodes

```dataview
LIST
FROM #source/episode
WHERE contains(series, [[]])
SORT released ASC
```

## Threads & Themes

