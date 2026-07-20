---
cssclasses:
  - page-white
tags:
  - dashboard
---

# 📚 SOURCES

> *Sections follow the canonical `status` lifecycle: `inbox → processing → completed`. See `99 - Meta/01 - Documentation/METADATA.md`.*
>
> *The Creator/Published columns read `file.frontmatter.*` rather than the bare field. Several capture modules write a field twice — `channel:` in frontmatter and `channel:: [Name](url)` in the note's source callout — and Dataview merges same-named frontmatter and inline fields into one array, so the bare field renders the value twice. Going through `file.frontmatter` takes the canonical copy while leaving genuine multi-value lists (a book's several `authors`) intact.*

---

## 🔴 Currently Reading / Consuming

```dataview
TABLE
  default(default(default(file.frontmatter.authors, file.frontmatter.channel), default(file.frontmatter.host, file.frontmatter.account)), file.frontmatter.lecturer) AS "Creator",
  default(default(file.frontmatter.publish_date, file.frontmatter.released), file.frontmatter.date_given) AS "Published",
  url AS "Link"
FROM "01 - Sources"
WHERE status = "processing" OR status = "active"
SORT created DESC
```

---

## 🟡 Queue — Captured, Not Started

```dataview
TABLE
  default(default(default(file.frontmatter.authors, file.frontmatter.channel), default(file.frontmatter.host, file.frontmatter.account)), file.frontmatter.lecturer) AS "Creator",
  default(default(file.frontmatter.publish_date, file.frontmatter.released), file.frontmatter.date_given) AS "Published",
  created AS "Captured"
FROM "01 - Sources"
WHERE status = "inbox"
SORT created ASC
```

---

## 🟢 Completed — Literature Notes Created

```dataview
TABLE
  default(default(default(file.frontmatter.authors, file.frontmatter.channel), default(file.frontmatter.host, file.frontmatter.account)), file.frontmatter.lecturer) AS "Creator",
  default(default(file.frontmatter.publish_date, file.frontmatter.released), file.frontmatter.date_given) AS "Published",
  url AS "Link"
FROM "01 - Sources"
WHERE status = "completed"
SORT created DESC
LIMIT 20
```

---

## 📊 By Source Type

```dataview
TABLE WITHOUT ID
  key AS "Type",
  length(rows) AS "Count"
FROM "01 - Sources"
FLATTEN file.tags AS Tag
WHERE startswith(Tag, "#source/")
GROUP BY Tag
SORT length(rows) DESC
```

---

## ⚠️ Unfiled — Status Missing or Unrecognized

> *Should always be empty. Anything here has a `status` outside the canonical enum — a typo, a hand-edit, or a query written against a stale vocabulary.*

```dataview
TABLE
  status AS "Raw status",
  default(default(default(file.frontmatter.authors, file.frontmatter.channel), default(file.frontmatter.host, file.frontmatter.account)), file.frontmatter.lecturer) AS "Creator",
  created AS "Captured"
FROM "01 - Sources"
WHERE !contains(list("inbox", "processing", "active", "completed", "archived"), status)
SORT created ASC
```
