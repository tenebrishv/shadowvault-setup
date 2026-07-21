/*
 * Property-panel per-value emoji conformance (issue #35, ADR 0009).
 *
 * frontmatter-display.css paints a per-VALUE emoji on each growth/status/type
 * row of the Properties panel, from a data-sv-value attribute the first-party
 * shadowvault-property-icons plugin stamps. That CSS map is the FOURTH
 * transcription of a vocabulary whose single source of truth is the badge view
 * (05 - Views/badge-table/view.js) — the dashboards and Metadata Menu options
 * being the other guarded copies. This file stops it drifting.
 *
 * TWO THINGS ARE PINNED
 *   1. VALUE→EMOJI. Every CSS `[data-sv-value="X"] … content:"<emoji> "` must
 *      equal the badge's leading glyph for X, in both directions. A per-value
 *      emoji that disagrees with the dashboards/links is exactly the split-brain
 *      the badge SSOT exists to prevent.
 *   2. THE FIELD SET. The plugin stamps a fixed set of field keys (SV_FIELDS);
 *      the CSS carries per-value rules keyed on data-property-key; the badge view
 *      maps a fixed set of fields. All three must be the same set — a field the
 *      plugin stamps but the CSS never paints (or vice-versa) is dead wiring.
 *
 * Checks the TEXT of the CSS + the plugin's exported constant, not a running
 * Obsidian — the plugin's DOM stamping is a manual verify-skill check. That is
 * enough: the defect class here is a stored emoji/field that no longer matches
 * the SSOT, which is visible in the source. The plugin file is require()-able in
 * Node because it guards its `require('obsidian')` the same way the badge view
 * guards on `dv` (see its header).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const badgeView = require("../05 - Views/badge-table/view.js");
const plugin = require("../../.obsidian/plugins/shadowvault-property-icons/main.js");

const CSS_PATH = path.join(
    __dirname, "..", "..", ".obsidian", "snippets", "frontmatter-display.css",
);

const BADGE_MAPS = {
    growth: badgeView.GROWTH_BADGES,
    status: badgeView.STATUS_BADGES,
    type: badgeView.TYPE_BADGES,
};

// "🌱 Seedling" -> "🌱". The badge stores emoji + space + label; the panel needs
// only the emoji (the value text is already in the row). Split on the first
// space — the emoji itself carries no space (variation selectors like ⚙️/🗄️ are
// part of the first token).
function leadingGlyph(badge) {
    return badge.split(" ")[0];
}

// Pull every per-value rule out of the CSS as { key, value, emoji }. Rules are
// one per line: `.metadata-property[data-property-key="K"][data-sv-value="V"] …
// ::before { content: "🌱 "; }`. The content is trimmed so the trailing spacer
// space doesn't count.
function extractCssTriples(css) {
    const re = /\[data-property-key="([a-z]+)"\]\[data-sv-value="([a-z-]+)"\][^{]*\{[^}]*content:\s*"([^"]*)"/g;
    const out = [];
    for (const m of css.matchAll(re)) {
        out.push({ key: m[1], value: m[2], emoji: m[3].trim() });
    }
    return out;
}

const css = fs.readFileSync(CSS_PATH, "utf8");
const triples = extractCssTriples(css);

// A silent parse failure (renamed selector, changed rule shape) would find zero
// triples and pass every "both directions" check vacuously. Floor it well under
// the real count (4 + 5 + 8 = 17) so ordinary edits don't trip it.
test("Parser: finds the per-value CSS rules", () => {
    assert.ok(triples.length >= 17,
        `extractCssTriples found only ${triples.length} rules; the parser or the CSS ` +
        `rule shape probably changed`);
});

// --- 1. value→emoji, both directions, per field ----------------------------
for (const [field, map] of Object.entries(BADGE_MAPS)) {
    test(`CSS per-value emoji for "${field}" matches the badge SSOT, both directions`, () => {
        const cssMap = {};
        for (const t of triples) {
            if (t.key === field) cssMap[t.value] = t.emoji;
        }
        const badgeMap = {};
        for (const [value, badge] of Object.entries(map)) {
            badgeMap[value] = leadingGlyph(badge);
        }
        assert.deepEqual(
            cssMap, badgeMap,
            `frontmatter-display.css per-value emoji for "${field}" differ from ` +
            `badge-table/view.js — the panel would show a different glyph than the ` +
            `dashboards and links for the same value. Reconcile the CSS with the badge map.`,
        );
    });
}

// --- 2. the field set agrees across plugin / CSS / badge view --------------
test("Field set agrees across plugin, CSS, and the badge view", () => {
    const pluginFields = [...plugin.SV_FIELDS].sort();
    const cssFields = [...new Set(triples.map(t => t.key))].sort();
    const badgeFields = Object.keys(BADGE_MAPS).sort();

    assert.deepEqual(cssFields, pluginFields,
        `the fields the CSS paints per-value (${cssFields.join(", ")}) differ from the ` +
        `fields the plugin stamps (${pluginFields.join(", ")}) — one side has dead wiring`);
    assert.deepEqual(pluginFields, badgeFields,
        `the plugin's SV_FIELDS (${pluginFields.join(", ")}) differ from the badge-mapped ` +
        `fields (${badgeFields.join(", ")})`);
});

// --- 3. the pure stamping core ---------------------------------------------
test("computeStamp: stamps known fields, ignores unknown, trims, drops empty", () => {
    const { computeStamp } = plugin;
    assert.equal(computeStamp("growth", "seedling"), "seedling");
    assert.equal(computeStamp("status", "  active  "), "active", "trims surrounding space");
    assert.equal(computeStamp("type", "moc"), "moc");
    assert.equal(computeStamp("created", "2026-07-21"), null, "non-vocab field not stamped");
    assert.equal(computeStamp("growth", ""), null, "empty value not stamped");
    assert.equal(computeStamp("growth", "   "), null, "whitespace-only not stamped");
    assert.equal(computeStamp("growth", null), null, "null value not stamped");
});
