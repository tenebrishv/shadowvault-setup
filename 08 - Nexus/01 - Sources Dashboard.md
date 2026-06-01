---
cssclasses:
  - page-white
tags:
  - dashboard
---

# 📚 SOURCES

---

## 🔴 Currently Reading / Consuming

```dataview
TABLE medium, author, date-started AS "Started", rating
FROM "01 - Sources"
WHERE status = "reading"
SORT date-started DESC
```

---

## 🟡 Unread Queue

```dataview
TABLE medium, author, date-added AS "Added"
FROM "01 - Sources"
WHERE status = "unread"
SORT date-added ASC
```

---

## 🟢 Processed — Literature Notes Created

```dataview
TABLE medium, author, date-finished AS "Finished", rating
FROM "01 - Sources"
WHERE status = "processed"
SORT date-finished DESC
LIMIT 20
```

---

## 📊 By Medium

```dataview
TABLE WITHOUT ID
  medium AS "Type",
  length(rows) AS "Count"
FROM "01 - Sources"
GROUP BY medium
SORT length(rows) DESC
```

---

## ⭐ Highest Rated

```dataview
TABLE medium, author, rating
FROM "01 - Sources"
WHERE rating >= 4
SORT rating DESC
LIMIT 10
```
