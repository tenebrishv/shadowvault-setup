---
cssclasses:
  - page-blueprint
  - page-grid
tags:
  - dashboard
---

# 🗺️ VAULT DASHBOARD

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

```dataview
TABLE
  choice(growth="seedling","🌱 Seedling", choice(growth="fern","🌿 Fern", choice(growth="incubator","🔆 Incubator", choice(growth="evergreen","🌲 Evergreen", growth)))) AS "Growth",
  choice(type="permanent","💡 Permanent", choice(type="literature","📝 Literature", choice(type="source","📚 Source", choice(type="fleeting","🌫️ Fleeting", choice(type="moc","🗺️ MOC", choice(type="thought","💭 Thought", choice(type="daily","📅 Daily", choice(type="entity","🧩 Entity", type)))))))) AS "Type",
  created AS "Created", file.mtime AS "Modified"
FROM "00 - Inbox"
SORT file.mtime DESC
LIMIT 20
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

```dataview
TABLE medium, author, status
FROM "01 - Sources"
WHERE status = "unread" OR status = "reading"
SORT date-added DESC
LIMIT 20
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

```dataview
TABLE
  choice(growth="seedling","🌱 Seedling", choice(growth="fern","🌿 Fern", choice(growth="incubator","🔆 Incubator", choice(growth="evergreen","🌲 Evergreen", growth)))) AS "Growth",
  choice(type="permanent","💡 Permanent", choice(type="literature","📝 Literature", choice(type="source","📚 Source", choice(type="fleeting","🌫️ Fleeting", choice(type="moc","🗺️ MOC", choice(type="thought","💭 Thought", choice(type="daily","📅 Daily", choice(type="entity","🧩 Entity", type)))))))) AS "Type"
FROM "03 - Permanent Notes"
WHERE length(file.inlinks) = 0
AND length(file.outlinks) = 0
SORT file.mtime ASC
LIMIT 10
```

---

## 📆 Due for Review

```dataview
TABLE
  review AS "Review Date",
  choice(growth="seedling","🌱 Seedling", choice(growth="fern","🌿 Fern", choice(growth="incubator","🔆 Incubator", choice(growth="evergreen","🌲 Evergreen", growth)))) AS "Growth",
  choice(type="permanent","💡 Permanent", choice(type="literature","📝 Literature", choice(type="source","📚 Source", choice(type="fleeting","🌫️ Fleeting", choice(type="moc","🗺️ MOC", choice(type="thought","💭 Thought", choice(type="daily","📅 Daily", choice(type="entity","🧩 Entity", type)))))))) AS "Type"
FROM "03 - Permanent Notes"
WHERE review <= date(today)
SORT review ASC
LIMIT 10
```
