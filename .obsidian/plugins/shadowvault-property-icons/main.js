'use strict';

/*
 * shadowvault-property-icons — first-party plugin (issue #35, ADR 0009).
 *
 * WHAT IT DOES (and nothing else)
 * The Properties panel exposes each row's FIELD to CSS (data-property-key) but
 * not its VALUE — the value is the text content of a contenteditable div, and
 * CSS has no text-content selector. So per-value emoji (🌱 seedling vs 🌲
 * evergreen) in the panel needs a sliver of JS. This plugin is that sliver: for
 * the three closed-vocabulary rows (growth/status/type) it reads the value text
 * and stamps it back as data-sv-value on the row. frontmatter-display.css then
 * paints the emoji via [data-property-key][data-sv-value] rules.
 *
 * IT HOLDS NO VOCABULARY. It knows the three field KEYS, nothing about their
 * values — it stamps whatever text it reads. The CSS is the sole value→emoji
 * filter (a bad value stamps but matches no rule, showing raw text, exactly
 * like badge-table's unmapped fallback). That keeps the emoji map single-sourced
 * to the CSS, which propertyIconsEnums.test.js guards against the badge SSOT.
 *
 * DUAL-MODE (like 05 - Views/badge-table/view.js)
 * require('obsidian') throws under `node --test`, so it's guarded to a stand-in
 * base class. That lets propertyIconsEnums.test.js require() this file to read
 * SV_FIELDS and unit-test computeStamp without Obsidian. The class body only
 * touches window/document inside methods, never at load, so requiring it in Node
 * is side-effect-free.
 *
 * WHY EVENT-DRIVEN, NO MutationObserver
 * The stamp needs (re)applying at exactly the moments Obsidian already fires
 * events for: a panel appears (file-open / active-leaf-change / layout-change)
 * or a value changes (metadataCache "changed", which fires AFTER the frontmatter
 * is reparsed). That covers the cases without a MutationObserver's cost — no
 * keystroke debounce, and no feedback loop from our own attribute write. If a
 * future Obsidian is found to recreate the panel with no event (dropping the
 * stamp), add a scoped observer then — see ADR 0009.
 *
 * FAIL-SAFE
 * Every stamp pass is wrapped: a renamed selector yields zero matches and does
 * nothing. Rows fall back to Obsidian's native rendering; per-field icons,
 * dashboards, and everything else are untouched.
 */

let Plugin;
try {
	({ Plugin } = require('obsidian'));
} catch (_) {
	// Node (propertyIconsEnums.test.js): no 'obsidian' module. Stand-in base so
	// the file loads and its test seams are readable outside Obsidian.
	Plugin = class {};
}

// The only vocabulary knowledge in the plugin: which rows to stamp. Kept in
// lock-step with the CSS keyed-rule set and the badge SSOT by
// propertyIconsEnums.test.js.
const SV_FIELDS = ['growth', 'status', 'type'];

// Pure core (unit-tested): field key + raw value text -> attribute value | null.
// null means "don't stamp" (unknown field, or empty/whitespace value).
function computeStamp(key, valueText) {
	if (!SV_FIELDS.includes(key)) return null;
	const value = (valueText == null ? '' : String(valueText)).trim();
	return value === '' ? null : value;
}

class ShadowVaultPropertyIcons extends Plugin {
	onload() {
		this._loaded = true;
		this._rafId = 0;

		const schedule = () => this.scheduleStamp();
		this.registerEvent(this.app.workspace.on('file-open', schedule));
		this.registerEvent(this.app.workspace.on('active-leaf-change', schedule));
		this.registerEvent(this.app.workspace.on('layout-change', schedule));
		this.registerEvent(this.app.metadataCache.on('changed', schedule));

		this.app.workspace.onLayoutReady(schedule);
	}

	onunload() {
		this._loaded = false;
		if (this._rafId) window.cancelAnimationFrame(this._rafId);
		// Don't leave stale attributes behind for the CSS to paint from.
		for (const row of document.querySelectorAll('.metadata-property[data-sv-value]')) {
			row.removeAttribute('data-sv-value');
		}
	}

	// Coalesce bursts of events into a single stamp on the next frame, by which
	// point Obsidian has rendered/updated the panel DOM.
	scheduleStamp() {
		if (!this._loaded) return;
		if (this._rafId) window.cancelAnimationFrame(this._rafId);
		this._rafId = window.requestAnimationFrame(() => {
			this._rafId = 0;
			this.stampVisibleProperties();
		});
	}

	stampVisibleProperties() {
		try {
			const rows = document.querySelectorAll('.metadata-property[data-property-key]');
			for (const row of rows) {
				const key = row.getAttribute('data-property-key');
				const valueEl = row.querySelector('.metadata-property-value');
				const stamp = computeStamp(key, valueEl ? valueEl.textContent : '');
				if (stamp === null) {
					if (row.hasAttribute('data-sv-value')) row.removeAttribute('data-sv-value');
				} else if (row.getAttribute('data-sv-value') !== stamp) {
					row.setAttribute('data-sv-value', stamp);
				}
			}
		} catch (_) {
			// Decorative layer: never throw into Obsidian's event loop over a
			// selector Obsidian may have renamed. Silent no-op == raw text.
		}
	}
}

module.exports = ShadowVaultPropertyIcons;
// Test seams — ignored by Obsidian (it instantiates the class), read by the
// node conformance/unit test.
module.exports.computeStamp = computeStamp;
module.exports.SV_FIELDS = SV_FIELDS;
