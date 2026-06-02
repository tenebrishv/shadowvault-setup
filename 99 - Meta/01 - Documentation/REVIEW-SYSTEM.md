# Review System

How is data reviewed in the future once it is captured.

README: [[README]]

## Scheduled Reviews
Every source note created by `Source Capture` gets a `review:` date set to **14 days after creation** (e.g., created `2025-02-14` → review `2025-02-28`).

To see what’s due for review, use this Dataview query (place it in `08 - Nexus/Reviews.md`):
```dataview
TABLE title, growth, review
FROM "01 - Sources"
WHERE review <= date(today)
SORT review ASC
```

## Additional Discovery Methods

- **Random Note** plugin – open a random note for serendipitous review. Configure hotkey for quick access.
- **Graph traversal** – open the local graph of a note and follow connections outward.
- **Dataview dashboards** – filter by growth stage, status, or date.

## Review Workflow for a Note

1. **Read** the note carefully.
2. **Update** the content:
    - Clarify ambiguous passages
    - Add missing links
    - Upgrade `growth` stage if warranted (e.g., seedling → fern)
3. **Set new review date** (if desired) by editing the `review:` frontmatter. Suggested intervals:
    - seedling: 7 days
    - fern: 30 days
    - incubator: 90 days
    - evergreen: 180 days
4. **Extract** any new permanent notes if the note sparked a distinct idea.
## Periodic Reviews

- **Daily**: Process inbox, check due reviews, write daily note.
- **Weekly**: Review weekly note, summarise highlights, plan next week. Use `(TEMPLATE) Weekly.md`.
- **Monthly**: Look back at monthly note, identify patterns, update MOCs.
- **Yearly**: Annual reflection, prune or archive notes, set goals for the year.

The temporal notes (`06 - Daily/`, `Weekly`, `Monthly`, `Yearly`) link to each other so you can navigate through time.