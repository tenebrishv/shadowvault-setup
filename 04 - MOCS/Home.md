---
id: 000
type: moc
status: active
cssclasses:
  - page-blueprint
  - page-grid
---

# 🏠 HOME

> *The vault's entry point. Start here. Follow the threads.*

---

## 🗺️ Maps of Content

*Browse by topic.*

- 

---

## 🌊 Active Thinking

*What are you currently developing?*

```dataview
TABLE growth, modified AS "Last Touched"
FROM "03 - Permanent Notes"
WHERE status = "active"
AND (growth = "fern" OR growth = "incubator")
SORT modified DESC
LIMIT 10
```

---

## 🎲 Explore Something Random

*Use the **Random Note** plugin to surface a forgotten idea.*

> Hotkey: set one up in Settings → Hotkeys → "Random note"

---

## 🔗 Quick Navigation

- [[09 - Main Dashboard]] — Full vault overview
- [[00 - Inbox Dashboard]] — Process new captures
- [[01 - Sources Dashboard]] — Reading queue

---

## 📌 Pinned Ideas

*Drop your most important evergreen notes here.*

- 
