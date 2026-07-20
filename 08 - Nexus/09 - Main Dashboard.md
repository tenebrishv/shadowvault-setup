---
cssclasses:
  - page-blueprint
  - page-grid
tags:
  - dashboard
---

# 🗺️ VAULT DASHBOARD

> [!info]- Badge tables need Dataview → Enable JavaScript Queries
> The Growth/Type/Status badge columns below render through the shared view at `99 - Meta/05 - Views/badge-table/`. If a section shows raw code instead of a table, turn on **Enable JavaScript Queries** in Dataview's settings.

```dataview
TABLE WITHOUT ID
  length(rows) AS "Count"
FROM ""
WHERE type
GROUP BY type
SORT length(rows) DESC
```

---

## 📥 Inbox — Needs Processing

```dataviewjs
dv.view("99 - Meta/05 - Views/badge-table", {
  pages: dv.pages('"00 - Inbox"').sort(p => p.file.mtime, "desc").limit(20),
  columns: [
    "growth",
    "type",
    ["Created", p => p.created],
    ["Modified", p => p.file.mtime],
  ],
})
```

---

## 🌱 Seedlings — Needs Development

```dataview
TABLE file.outlinks AS "Links Out", created
FROM "03 - Permanent Notes" OR "02 - Literature Notes"
WHERE growth = "seedling"
SORT created ASC
LIMIT 15
```

---

## 🌿 Ferns — Needs Refinement

```dataview
TABLE file.outlinks AS "Links Out", created
FROM "03 - Permanent Notes"
WHERE growth = "fern"
SORT created ASC
LIMIT 15
```

---

## 🔆 Incubators — Needs Connections

```dataview
TABLE length(file.outlinks) AS "Links", created
FROM "03 - Permanent Notes"
WHERE growth = "incubator"
AND length(file.outlinks) < 2
SORT created ASC
LIMIT 15
```

---

## 🌲 Evergreen — Mature Notes

```dataview
TABLE length(file.inlinks) AS "Inlinks", length(file.outlinks) AS "Outlinks", modified
FROM "03 - Permanent Notes"
WHERE growth = "evergreen"
SORT length(file.inlinks) DESC
LIMIT 20
```

---

## 📚 Sources — Reading Queue

```dataviewjs
dv.view("99 - Meta/05 - Views/badge-table", {
  pages: dv.pages('"01 - Sources"')
    .where(p => ["inbox", "processing", "active"].includes(p.status))
    .sort(p => p.created, "desc")
    .limit(20),
  columns: [
    "status",
    // Coalesced because no creator field is common to all source types:
    // authors (book/article/paper), channel (youtube/video), host (podcast),
    // account (tweet), lecturer (lecture).
    //
    // Read off file.frontmatter, not the page directly: Article/YouTube/Video/
    // Podcast write these keys BOTH in frontmatter and as inline `field::` in
    // the source callout, and Dataview merges same-named inline and frontmatter
    // fields into one array — so `p.channel` renders the channel twice, once as
    // a string and once as a link.
    ["Creator", p => { const f = p.file.frontmatter;
      return f.authors ?? f.channel ?? f.host ?? f.account ?? f.lecturer; }],
    ["Published", p => { const f = p.file.frontmatter;
      return f.publish_date ?? f.released ?? f.date_given; }],
  ],
})
```

---

## 📅 Recent Daily Notes

```dataview
TABLE file.cday AS "Date"
FROM "06 - Daily"
SORT file.cday DESC
LIMIT 7
```

---

## 🗺️ MOCs

```dataview
TABLE length(file.inlinks) AS "Notes Linked"
FROM "04 - MOCS"
SORT length(file.inlinks) DESC
```

---

## 🔍 Orphan Notes — Needs Linking

```dataviewjs
dv.view("99 - Meta/05 - Views/badge-table", {
  pages: dv.pages('"03 - Permanent Notes"')
    .where(p => p.file.inlinks.length === 0 && p.file.outlinks.length === 0)
    .sort(p => p.file.mtime, "asc")
    .limit(10),
  columns: ["growth", "type"],
})
```

---

## 📆 Due for Review

```dataviewjs
dv.view("99 - Meta/05 - Views/badge-table", {
  pages: dv.pages('"03 - Permanent Notes"')
    // dv.date("today") is a DQL literal, not a JS API parse — it returns null
    // here, and `review <= null` is false for every note, so the section
    // rendered permanently empty. Luxon is unambiguous.
    .where(p => p.review && p.review <= dv.luxon.DateTime.now())
    .sort(p => p.review, "asc")
    .limit(10),
  // "Review Date" leads, as it did before the badge columns were shared.
  columns: [["Review Date", p => p.review], "growth", "type"],
})
```
