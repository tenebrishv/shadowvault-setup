---
id: 001
type: moc
status: active
tags:
aliases:
cssclasses:
  - page-blueprint
  - page-grid
---

# 🧭 ENTITIES

> *Real-world nouns tracked in the vault, split by the capacity to decide: **Agents** (people, organizations, countries, synthetic/AI systems) act with intentional or decision-making power; **Non-Agents** (places, artifacts, tools, systems, natural entities, events) exert structural or relational influence without deciding anything themselves. Subtypes are tags, not folders — the classification lives in links and Dataview, not in file location.*

---

## Agents

### People
```dataview
LIST
FROM #agent/person AND "09 - Entities/Agents"
SORT file.name ASC
```

### Organizations
```dataview
LIST
FROM #agent/organization AND "09 - Entities/Agents"
SORT file.name ASC
```

### Countries
```dataview
LIST
FROM #agent/country AND "09 - Entities/Agents"
SORT file.name ASC
```

### Synthetic Agents (AI / Algorithms)
```dataview
LIST
FROM #agent/synthetic AND "09 - Entities/Agents"
SORT file.name ASC
```

---

## Non-Agents

### Places
```dataview
LIST
FROM #nonagent/place AND "09 - Entities/Non-Agents"
SORT file.name ASC
```

### Artifacts
```dataview
LIST
FROM #nonagent/artifact AND "09 - Entities/Non-Agents"
SORT file.name ASC
```

### Tools
```dataview
LIST
FROM #nonagent/tool AND "09 - Entities/Non-Agents"
SORT file.name ASC
```

### Systems
```dataview
LIST
FROM #nonagent/system AND "09 - Entities/Non-Agents"
SORT file.name ASC
```

### Natural Entities
```dataview
LIST
FROM #nonagent/natural AND "09 - Entities/Non-Agents"
SORT file.name ASC
```

### Events
```dataview
LIST
FROM #nonagent/event AND "09 - Entities/Non-Agents"
SORT file.name ASC
```
