<%*
/*
 * Section-note hub block. INSERT INTO AN EXISTING NOTE — this is not a note
 * template, and running it on a blank file produces a note with no frontmatter.
 *
 * A Section note is `type: literature` with descendants: no new type and no new
 * note template (ADR 0011 §5). It needs only this block, so the block ships as
 * something you insert at the cursor when a literature note becomes a hub,
 * rather than as dead Dataview in every leaf note.
 *
 * Reach for it only when a source is long and dense enough that its ideas need
 * an intermediate layer; a short source hubs its literature notes directly.
 *
 * `contains(section, [[]])` lists DIRECT children only — the Curriculum-MOC
 * idiom. The whole-source list at any depth is `contains(source, [[]])` and
 * belongs on the Source note, not here.
 */
-%>
## In This Section

```dataview
LIST
FROM "02 - Literature Notes"
WHERE contains(section, [[]])
SORT file.name ASC
```

## Through-line

*What ties this span together — one small paragraph. Not a summary of each note below, and not your reflective response to the source: that is the **Source recap**, written once on the Source note itself (ADR 0011 §5).*
