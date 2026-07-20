---
cssclasses:
  - page-manila
tags:
  - dashboard
---

# 📥 INBOX

> *Process everything here before it grows stale. Aim for zero.*

---

## 🆕 Unprocessed — Fleeting Notes

> [!info]- Badge table needs Dataview → Enable JavaScript Queries
> The Growth/Type columns below render through the shared view at `99 - Meta/05 - Views/badge-table/`. If this section shows raw code instead of a table, turn on **Enable JavaScript Queries** in Dataview's settings.

```dataviewjs
dv.view("99 - Meta/05 - Views/badge-table", {
  pages: dv.pages('"00 - Inbox"')
    .where(p => !p.file.tags.includes("#processed"))
    .sort(p => p.file.ctime, "asc"),
  columns: [
    "growth",
    "type",
    ["Captured", p => p.file.ctime],
    ["Tags", p => p.file.tags],
  ],
})
```

---

## ⚡ Quick Actions

- **New fleeting note** → `Cmd+N` → save to `00 - Inbox`
- **Process a note** → read it → create permanent note → add `#processed` tag → move or delete
- **Can't process now?** → add `review` date in frontmatter

---

## 📌 Processing Protocol

1. Read the note
2. Is it a distinct idea? → Create a **Permanent Note** in `03 - Permanent Notes`
3. Is it from a source? → Create a **Literature Note** in `02 - Literature Notes`
4. Is it a source to track? → Create a **Source** in `01 - Sources`
5. Is it junk? → Delete it
6. Link the new note to at least one existing note
7. Tag the inbox note `#processed` or delete it

---

## 📊 Inbox Stats

```dataview
TABLE WITHOUT ID
  length(rows) AS "Total"
FROM "00 - Inbox"
GROUP BY "All fleeting notes"
```
