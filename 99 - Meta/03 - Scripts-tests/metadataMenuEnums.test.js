/*
 * Metadata Menu option conformance.
 *
 * The recommended Metadata Menu plugin (docs/adr/0007) puts validated dropdowns
 * on the four closed-vocabulary frontmatter fields — growth, status, type,
 * period — by storing their allowed values as global "Select" preset fields in
 * `.obsidian/plugins/metadata-menu/data.json`. That is a THIRD transcription of
 * vocabularies whose single source of truth is `_frontmatterSchema.js`'s ENUMS
 * (the badge view and the dashboards being the first two, guarded by
 * dashboardEnums.test.js).
 *
 * WHY THIS EXISTS
 * A hand-authored option list drifts exactly the way the badge cascades did:
 * change an enum here and the dropdown keeps offering the dead value with
 * nothing failing. This file makes that impossible — the dropdown options must
 * equal the canonical enum, in order, in both directions. When the vocabulary
 * changes, this test reds until data.json is reconciled, the same as the badge
 * and dashboard guards.
 *
 * Checks the TEXT of the plugin config, not a running plugin — Metadata Menu
 * cannot load outside Obsidian. That is enough: the defect class is a stored
 * option that no longer matches the enum, which is visible in the JSON. Whether
 * the plugin then renders the dropdown is a manual Obsidian check (see the
 * verify skill).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schema = require("./_frontmatterSchema.js");

const DATA_JSON = path.join(
    __dirname, "..", "..", ".obsidian", "plugins", "metadata-menu", "data.json",
);

// Fields that carry a validated dropdown. Not every ENUM field is required to —
// but every one listed here must round-trip exactly against schema.ENUMS.
const VALIDATED_FIELDS = ["growth", "status", "type", "period"];

const settings = JSON.parse(fs.readFileSync(DATA_JSON, "utf8"));

function presetField(name) {
    return (settings.presetFields || []).find(f => f.name === name);
}

// Mirror how the plugin itself reads the list: `Object.values(valuesList)`
// (main.js, getOptionsList). Integer-like keys iterate in ascending numeric
// order, so "1".."n" preserves the progression order the dropdown renders.
function optionValues(field) {
    return Object.values(field.options?.valuesList || {});
}

for (const name of VALIDATED_FIELDS) {
    test(`Metadata Menu: "${name}" is a ValuesList Select preset field`, () => {
        const field = presetField(name);
        assert.ok(field, `data.json has no preset field named "${name}" — the validated ` +
            `dropdown for it is missing`);
        assert.equal(field.type, "Select",
            `preset field "${name}" is type "${field.type}", not "Select" — only Select ` +
            `constrains the value to the option list`);
        assert.equal(field.options?.sourceType, "ValuesList",
            `preset field "${name}" draws its options from "${field.options?.sourceType}", ` +
            `not the inline ValuesList this test can verify against the enum`);
    });

    test(`Metadata Menu: "${name}" options match the canonical enum, in order`, () => {
        const field = presetField(name);
        assert.ok(field, `data.json has no preset field named "${name}"`);
        assert.deepEqual(
            optionValues(field), schema.ENUMS[name],
            `Metadata Menu's "${name}" dropdown options differ from the canonical enum in ` +
            `_frontmatterSchema.js — the dropdown would offer or omit a value the rest of ` +
            `the vault doesn't recognise. Reconcile data.json (order matters: it is the ` +
            `progression the dropdown renders).`,
        );
    });
}
