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

```dataview
TABLE file.ctime AS "Captured", tags
FROM "00 - Inbox"
WHERE !contains(tags, "processed")
SORT file.ctime ASC
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
