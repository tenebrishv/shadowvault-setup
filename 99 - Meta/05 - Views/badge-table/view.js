/*
 * badge-table — the vault's one growth/status/type emoji renderer.
 *
 * Invoked from a ```dataviewjs block as:
 *
 *   dv.view("99 - Meta/05 - Views/badge-table", {
 *     pages: dv.pages('"00 - Inbox"').sort(p => p.file.mtime, "desc").limit(20),
 *     columns: ["growth", "type", ["Created", p => p.created]],
 *   })
 *
 * WHY THIS FILE EXISTS
 * The badge mapping's human-readable source of truth is METADATA.md#visual-badges.
 * It used to be re-encoded as inline Dataview `choice(…)` cascades in eight
 * places across the two dashboards, which is how the `type: daily` arm went
 * stale unnoticed for two minor versions. DQL has no user-function seam — a
 * `choice()` chain cannot call out to shared code — so concentrating the map
 * requires the call sites to be DataviewJS. See docs/adr/0004.
 *
 * WHY IT IS NOT IN "02 - Scripts"
 * That folder is Templater's User Scripts folder; Templater loads every .js in
 * it and requires each export to be a function, so a Dataview view dropped there
 * breaks template loading (the same failure 2.2.0 hit with PERIOD_PRESETS).
 *
 * WHY THE GUARD KEYS ON `dv`, NOT `module`
 * The guard exists so dashboardEnums.test.js can require() this file and read
 * the maps directly instead of regex-parsing it — the maps stay the single
 * definition in both environments.
 *
 * It MUST test for `dv`. The obvious `typeof module !== "undefined"` does not
 * work: Obsidian's desktop renderer runs with Node integration, so `module` is
 * a global inside a dataviewjs block too. Guarding on it took the export branch
 * in BOTH environments — the view assigned its maps to a stray global and
 * rendered nothing at all, with no error, because nothing threw. `dv` is passed
 * only by Dataview's view evaluator, so it is the one binding that actually
 * distinguishes the two callers.
 */

// Must match METADATA.md#visual-badges exactly; the test asserts both directions.
const GROWTH_BADGES = {
    seedling: "🌱 Seedling",
    fern: "🌿 Fern",
    incubator: "🔆 Incubator",
    evergreen: "🌲 Evergreen",
};

const STATUS_BADGES = {
    inbox: "📥 Inbox",
    processing: "⚙️ Processing",
    active: "🟢 Active",
    completed: "✅ Completed",
    archived: "🗄️ Archived",
};

const TYPE_BADGES = {
    permanent: "💡 Permanent",
    literature: "📝 Literature",
    source: "📚 Source",
    fleeting: "🌫️ Fleeting",
    moc: "🗺️ MOC",
    thought: "💭 Thought",
    periodic: "📆 Periodic",
    entity: "🧩 Entity",
};

const BADGE_COLUMNS = {
    growth: { header: "Growth", map: GROWTH_BADGES, field: "growth" },
    status: { header: "Status", map: STATUS_BADGES, field: "status" },
    type: { header: "Type", map: TYPE_BADGES, field: "type" },
};

if (typeof dv === "undefined") {
    // Node (dashboardEnums.test.js) — no `dv` binding exists here.
    module.exports = { GROWTH_BADGES, STATUS_BADGES, TYPE_BADGES, BADGE_COLUMNS };
} else {
    // --- Dataview render path -------------------------------------------
    //
    // `columns` is an ordered list. A string names a badge column; a
    // [header, fn] pair is any other column. Order is exactly as given, so a
    // call site can put its own column before the badges — which the Due for
    // Review section needs, and which a fixed "badges always first" layout
    // would have quietly reordered.
    const pages = input.pages;
    const columns = input.columns ?? ["growth", "type"];

    // An unmapped value renders as itself, matching the old choice() cascades'
    // final fallback: a note with a typo'd growth shows the typo rather than a
    // blank cell, which is what makes the bad value findable.
    const badge = (map, value) => map[value] ?? value;

    const headers = ["File"];
    const cells = [];

    for (const col of columns) {
        if (typeof col === "string") {
            const spec = BADGE_COLUMNS[col];
            if (!spec) throw new Error(`badge-table: unknown badge column "${col}"`);
            headers.push(spec.header);
            cells.push(p => badge(spec.map, p[spec.field]));
        } else {
            headers.push(col[0]);
            cells.push(col[1]);
        }
    }

    dv.table(headers, pages.map(p => [p.file.link, ...cells.map(fn => fn(p))]));
}
