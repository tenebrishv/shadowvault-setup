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
 * PLUGIN HEALTH (issue/feature: "add an option to update/add necessary plugins")
 * A settings tab makes the shipped plugin set legible for new adopters and lets
 * them fix the common gaps without leaving the app:
 *   - verify: live status (installed / enabled / loaded) + version for every
 *     entry in PLUGIN_REGISTRY, read from the vault adapter + community-plugins.json
 *   - enable: one-click enable of an installed-but-disabled bundled plugin via
 *     app.plugins.enablePluginAndSave, plus a bulk "Enable all" for the common
 *     case — a fresh unzip where several are off at once
 *   - manual: Media Extended is deliberately NOT redistributed (it ships no
 *     upstream licence — see .gitignore + THIRD-PARTY-NOTICES.md). Obsidian has
 *     no public plugin-install API, so the tab explains the one manual step
 *     instead of pretending it can automate it.
 *   - framework notice: compares the installed framework-manifest.json version
 *     against GitHub's latest release on demand and points at the updater.
 * The registry copy lives here and is pinned to the shipping truth by
 * pluginHealth.test.js (community-plugins.json + .obsidian/plugins + the
 * framework manifest), so a renamed/removed plugin fails a test instead of
 * stranding an adopter with a broken tab.
 *
 * PRESENTATION IS DATA, NOT BRANCHES. Every string and colour the tab shows
 * comes out of a pure function — STATUS_META, statusTone, summarize,
 * healthMessage, describeState, frameworkMessage. The render methods only turn
 * those values into elements. That is what makes the wording and the state
 * machine unit-testable in Node while leaving only DOM assembly uncovered, and
 * it is why adding a status means adding a STATUS_META row rather than hunting
 * for switch statements. styles.css carries the look and uses Obsidian's own CSS
 * variables exclusively, so the tab follows the user's theme and accent colour
 * instead of fighting it.
 *
 * DEPENDENCY NOTE on app.plugins. App.plugins is absent from the public
 * obsidian.d.ts (2026, @internal) yet is the de-facto plugin-management surface
 * every community plugin uses, and the vault's own research relies on it
 * (feature-opportunities-r2-plugins.md §1.3, quoting QuickAdd's documented
 * "Where the API is available" table). It is feature-detected in exactly one
 * place (enableOne) and the tab degrades to read-only guidance if it disappears.
 *
 * DUAL-MODE (like 05 - Views/badge-table/view.js)
 * require('obsidian') throws under `node --test`, so it's guarded to stand-in
 * base classes. That lets propertyIconsEnums.test.js and pluginHealth.test.js
 * require() this file to read SV_FIELDS/PLUGIN_REGISTRY and unit-test the pure
 * core without Obsidian. The class bodies only touch window/document/app inside
 * methods, never at load, so requiring it in Node is side-effect-free.
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
 * dashboards, and everything else are untouched. The settings tab never throws
 * into Obsidian's event loop: reads/writes are wrapped and degrade to text.
 */

let Plugin, PluginSettingTab, Notice, requestUrl;
let HAS_OBSIDIAN = false;
try {
	({ Plugin, PluginSettingTab, Notice, requestUrl } = require('obsidian'));
	HAS_OBSIDIAN = true;
} catch (_) {
	// Node (propertyIconsEnums.test.js / pluginHealth.test.js): no 'obsidian'
	// module. Stand-ins so the file loads and its test seams are readable
	// outside Obsidian. The settings tab is never constructed under Node.
	Plugin = class {};
	PluginSettingTab = class {};
	Notice = null;
	requestUrl = null;
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

// --- plugin health: the registry ------------------------------------------------

// The shipped plugin set, grouped by how it gets onto an adopter's disk:
//   required — the two plugins nothing works without (PLUGINS.md "Required")
//   bundled  — ships under .obsidian/plugins/ and is enabled on unzip
//   optIn    — a bundled plugin the framework deliberately leaves disabled by
//              default (Obsidian Git: device-level git setup, its data.json is
//              not shipped). The tab shows it but never counts it as a problem.
//   manual   — not redistributable (no upstream licence); the adopter installs it
// pluginHealth.test.js pins this list to community-plugins.json, the bundled
// directories, and framework-manifest.json.
const PLUGIN_REGISTRY = [
	{ id: 'templater-obsidian', name: 'Templater', tier: 'required' },
	{ id: 'dataview', name: 'Dataview', tier: 'required' },
	{ id: 'file-explorer-note-count', name: 'File Explorer Note Count', tier: 'bundled' },
	{ id: 'folder-links', name: 'Folder Links', tier: 'bundled' },
	{ id: 'metadata-menu', name: 'Metadata Menu', tier: 'bundled' },
	{ id: 'nldates-redux', name: 'Natural Language Dates', tier: 'bundled' },
	{ id: 'obsidian-excalidraw-plugin', name: 'Excalidraw', tier: 'bundled' },
	{ id: 'obsidian-git', name: 'Obsidian Git', tier: 'bundled', optIn: true },
	{ id: 'obsidian-icon-folder', name: 'Iconize', tier: 'bundled' },
	{ id: 'obsidian-link-converter', name: 'Link Converter', tier: 'bundled' },
	{ id: 'obsidian-style-settings', name: 'Style Settings', tier: 'bundled' },
	{ id: 'pane-relief', name: 'Pane Relief', tier: 'bundled' },
	{ id: 'review-obsidian', name: 'Review', tier: 'bundled' },
	{ id: 'shadowvault-property-icons', name: 'ShadowVault Property Icons', tier: 'bundled' },
	{ id: 'supercharged-links-obsidian', name: 'Supercharged Links', tier: 'bundled' },
	{ id: 'tag-wrangler', name: 'Tag Wrangler', tier: 'bundled' },
	{ id: 'url-into-selection', name: 'Paste URL into Selection', tier: 'bundled' },
	{ id: 'media-extended', name: 'Media Extended', tier: 'manual' },
];

const STATUS_ACTIVE = 'active';
const STATUS_DISABLED = 'disabled';
const STATUS_UNLOADED = 'unloaded';
const STATUS_MISSING = 'missing';

// Single source for how a status presents: its label, its colour tone (which
// drives the [data-sv-tone] rules in styles.css) and the glyph on its pill.
// A table rather than three switches, so pluginHealth.test.js can assert every
// status has a complete presentation instead of a missing case surfacing as a
// blank pill in front of an adopter.
const STATUS_META = {
	[STATUS_ACTIVE]: { label: 'Active', tone: 'ok', glyph: '✓' },
	[STATUS_DISABLED]: { label: 'Installed but disabled', tone: 'warn', glyph: '!' },
	[STATUS_UNLOADED]: { label: 'Enabled but failed to load', tone: 'error', glyph: '×' },
	[STATUS_MISSING]: { label: 'Not installed', tone: 'error', glyph: '×' },
};

// Pure core (unit-tested): installed/enabled/loaded booleans -> a status word.
function resolveStatus({ installed, enabled, loaded }) {
	if (!installed) return STATUS_MISSING;
	if (!enabled) return STATUS_DISABLED;
	if (!loaded) return STATUS_UNLOADED;
	return STATUS_ACTIVE;
}

function statusLabel(status) {
	const meta = STATUS_META[status];
	return meta ? meta.label : STATUS_META[STATUS_MISSING].label;
}

// Colour tone for one row. A `manual` plugin that isn't installed is a note, not
// a fault — the vault cannot legally ship it — so it never gets a red pill.
function statusTone(status, tier) {
	if (tier === 'manual' && status !== STATUS_ACTIVE) return 'neutral';
	const meta = STATUS_META[status];
	return meta ? meta.tone : 'error';
}

function statusGlyph(status, tier) {
	if (tier === 'manual' && status !== STATUS_ACTIVE) return '↓';
	const meta = STATUS_META[status];
	return meta ? meta.glyph : STATUS_META[STATUS_MISSING].glyph;
}

// --- plugin health: pure state + wording -----------------------------------------

// Pure core (unit-tested): numeric semver compare, GitHub-style "v" prefix
// tolerated. Mirrors the updaters' component-wise comparison (version_le).
function isVersionNewer(latest, installed) {
	const toParts = (v) => String(v == null ? '' : v)
		.replace(/^v/, '')
		.split('.')
		.map((p) => parseInt(p, 10) || 0);
	const a = toParts(latest);
	const b = toParts(installed);
	const n = Math.max(a.length, b.length);
	for (let i = 0; i < n; i++) {
		const x = a[i] ?? 0;
		const y = b[i] ?? 0;
		if (x > y) return true;
		if (x < y) return false;
	}
	return false;
}

// Pure-ish core (unit-tested with a fake app): resolve one registry entry's
// live state. `app` needs vault.adapter.{exists,read} and plugins.getPlugin.
// Never throws — every read is guarded and degrades to the conservative state.
async function collectPluginState(app, entry) {
	const adapter = app && app.vault && app.vault.adapter;
	const manifestPath = `.obsidian/plugins/${entry.id}/manifest.json`;

	let installed = false;
	if (adapter && typeof adapter.exists === 'function') {
		try {
			installed = await adapter.exists(manifestPath);
		} catch (_) {
			installed = false;
		}
	}

	let version = null;
	if (installed && adapter && typeof adapter.read === 'function') {
		try {
			const meta = JSON.parse(await adapter.read(manifestPath));
			version = meta && meta.version ? meta.version : null;
		} catch (_) {
			version = null;
		}
	}

	let enabled = false;
	if (adapter && typeof adapter.read === 'function') {
		try {
			const list = JSON.parse(await adapter.read('.obsidian/community-plugins.json'));
			enabled = Array.isArray(list) && list.includes(entry.id);
		} catch (_) {
			enabled = false;
		}
	}

	const mgr = app && app.plugins;
	const loaded = !!mgr && typeof mgr.getPlugin === 'function' && mgr.getPlugin(entry.id) != null;

	return {
		id: entry.id,
		name: entry.name,
		tier: entry.tier,
		optIn: !!entry.optIn,
		version,
		status: resolveStatus({ installed, enabled, loaded }),
	};
}

// Pure core (unit-tested): the whole state list -> the numbers the header reads
// from. `tracked` deliberately excludes opt-in plugins: Obsidian Git shipping
// switched off is the intended default, and counting it would make a perfectly
// healthy vault report 16/17 forever.
function summarize(states) {
	const shipped = states.filter((s) => s.tier !== 'manual');
	const tracked = shipped.filter((s) => !s.optIn);
	const problems = tracked.filter((s) => s.status !== STATUS_ACTIVE);
	const fixable = problems.filter((s) => s.status === STATUS_DISABLED);
	return {
		shipped: shipped.length,
		tracked: tracked.length,
		active: tracked.length - problems.length,
		problems,
		fixable,
		ok: problems.length === 0,
	};
}

// Pure core (unit-tested): summary -> the banner's headline. `tone` colours the
// banner; a broken REQUIRED plugin is red because the vault genuinely does not
// work, while a switched-off recommended one is amber.
function healthMessage(summary) {
	if (summary.ok) {
		return {
			tone: 'ok',
			glyph: '✓',
			title: 'Everything checks out',
			detail: `All ${summary.tracked} required and recommended plugins are installed, enabled and running.`,
		};
	}
	const n = summary.problems.length;
	const fixable = summary.fixable.length;
	let detail;
	if (fixable === n) {
		detail = n === 1
			? 'It is installed but switched off — you can enable it from here.'
			: 'They are installed but switched off — you can enable them from here.';
	} else if (fixable > 0) {
		detail = `${fixable} can be switched on from here; the rest need a framework update or a manual install.`;
	} else {
		detail = 'They need a framework update or a manual install — see the note on each one.';
	}
	const tone = summary.problems.some((s) => s.tier === 'required') ? 'error' : 'warn';
	return {
		tone,
		glyph: tone === 'error' ? '×' : '!',
		title: n === 1 ? '1 plugin needs attention' : `${n} plugins need attention`,
		detail,
	};
}

// Pure core (unit-tested): one state -> the explanatory line under its name.
// Returns '' when the status pill already says everything worth saying, which
// keeps a healthy list quiet instead of repeating "Active" eighteen times.
function describeState(state) {
	if (state.tier === 'manual') {
		return state.status === STATUS_ACTIVE
			? 'Installed by you. The vault ships its settings but not its code.'
			: 'Not redistributed — it ships no upstream licence. Install it from Settings → Community plugins → Browse → "Media Extended".';
	}
	switch (state.status) {
		case STATUS_DISABLED:
			return state.optIn
				? 'Optional. Ships switched off because git needs per-device setup — enable it if you want version history.'
				: 'Shipped with the vault but switched off. Enable it to restore the workflow that depends on it.';
		case STATUS_UNLOADED:
			return 'Listed as enabled but it did not load. Check Settings → Community plugins, or restart Obsidian.';
		case STATUS_MISSING:
			return 'Expected to ship with the vault but missing from .obsidian/plugins. Run the framework updater — see UPDATING.md.';
		default:
			return '';
	}
}

// Pure-ish core (unit-tested with a fake app + mocked requestUrl): compare the
// installed framework version against GitHub's latest release. requestUrlFn is
// the obsidian requestUrl (injected so the Node harness can mock it).
// Returns { installed, latest, update, error } where error is null | 'no-manifest' | 'network'.
async function checkFrameworkUpdate(app, requestUrlFn) {
	let manifest = null;
	try {
		manifest = JSON.parse(await app.vault.adapter.read('framework-manifest.json'));
	} catch (_) {
		manifest = null;
	}
	const installed = manifest && manifest.version ? manifest.version : null;
	if (!manifest) return { installed, latest: null, update: false, error: 'no-manifest' };
	if (typeof requestUrlFn !== 'function') return { installed, latest: null, update: false, error: 'network' };
	const repo = manifest.repo || 'tenebrishv/shadowvault-setup';
	try {
		const res = await requestUrlFn({
			url: `https://api.github.com/repos/${repo}/releases/latest`,
			headers: {
				'User-Agent': 'shadowvault-property-icons',
				'Accept': 'application/vnd.github+json',
			},
		});
		const body = JSON.parse(res.text);
		const latest = String(body.tag_name || '').replace(/^v/, '');
		return { installed, latest, update: latest ? isVersionNewer(latest, installed) : false, error: null };
	} catch (_) {
		return { installed, latest: null, update: false, error: 'network' };
	}
}

// Pure core (unit-tested): a checkFrameworkUpdate result -> what the card shows.
function frameworkMessage(result) {
	if (!result || result.error === 'no-manifest') {
		return {
			tone: 'neutral',
			title: 'No manifest found',
			detail: 'There is no framework-manifest.json in this vault, so this looks like a git checkout rather than a release install. See UPDATING.md.',
		};
	}
	if (result.error === 'network') {
		return {
			tone: 'neutral',
			title: `Version ${result.installed || 'unknown'}`,
			detail: 'Could not reach GitHub to check for a newer release. Try again later, or see UPDATING.md.',
		};
	}
	if (result.update) {
		return {
			tone: 'warn',
			title: `Version ${result.latest} available`,
			detail: `You are on ${result.installed}. Close Obsidian, then run update-vault.ps1 (Windows) or update-vault.sh (macOS/Linux) — see UPDATING.md.`,
		};
	}
	return {
		tone: 'ok',
		title: `Version ${result.installed}`,
		detail: 'Up to date — no newer release published on GitHub.',
	};
}

// --- settings tab ----------------------------------------------------------------

// Rendering only. Everything it prints comes from the pure functions above, so
// this class holds layout and event wiring and no product decisions.
class ShadowVaultSettingsTab extends PluginSettingTab {
	async display() {
		const { containerEl } = this;
		containerEl.empty();

		const root = containerEl.createDiv({ cls: 'sv-health' });
		root.createEl('h2', { cls: 'sv-health__title', text: 'ShadowVault' });
		root.createEl('p', {
			cls: 'sv-health__lede',
			text: 'Plugin health keeps the plugin set this vault ships with in working order. Nothing here touches your notes.',
		});

		// display() is async (it reads the vault), so paint a placeholder rather
		// than leaving the pane blank on a slow disk.
		const body = root.createDiv({ cls: 'sv-health__body' });
		body.createDiv({ cls: 'sv-loading', text: 'Reading plugin state…' });

		const states = await this.collectStates();
		body.empty();

		this.renderBanner(body, summarize(states));
		this.renderSection(body, {
			title: 'Required',
			blurb: 'The vault does not function without these.',
			states: states.filter((s) => s.tier === 'required'),
		});
		this.renderSection(body, {
			title: 'Recommended',
			blurb: 'Bundled with the vault and enabled by default.',
			states: states.filter((s) => s.tier === 'bundled'),
			collapsible: true,
		});
		this.renderSection(body, {
			title: 'Install yourself',
			blurb: 'Not redistributable, so the vault ships its settings but not its code.',
			states: states.filter((s) => s.tier === 'manual'),
		});
		this.renderFramework(body);
	}

	// One unreadable entry must never blank the whole tab.
	collectStates() {
		return Promise.all(PLUGIN_REGISTRY.map(async (entry) => {
			try {
				return await collectPluginState(this.app, entry);
			} catch (_) {
				return {
					id: entry.id, name: entry.name, tier: entry.tier,
					optIn: !!entry.optIn, version: null, status: STATUS_MISSING,
				};
			}
		}));
	}

	renderBanner(parent, summary) {
		const message = healthMessage(summary);
		const banner = parent.createDiv({ cls: 'sv-banner', attr: { 'data-sv-tone': message.tone } });

		banner.createDiv({ cls: 'sv-banner__glyph', text: message.glyph });

		const text = banner.createDiv({ cls: 'sv-banner__text' });
		text.createDiv({ cls: 'sv-banner__title', text: message.title });
		text.createDiv({ cls: 'sv-banner__detail', text: message.detail });

		const meter = text.createDiv({ cls: 'sv-meter', attr: { 'data-sv-tone': message.tone } });
		const pct = summary.tracked > 0 ? Math.round((summary.active / summary.tracked) * 100) : 0;
		meter.createDiv({ cls: 'sv-meter__fill' }).style.width = `${pct}%`;
		text.createDiv({ cls: 'sv-meter__caption', text: `${summary.active} of ${summary.tracked} active` });

		const actions = banner.createDiv({ cls: 'sv-banner__actions' });
		// Only worth a bulk button when it beats pressing Enable twice.
		if (summary.fixable.length > 1) {
			this.button(actions, `Enable all (${summary.fixable.length})`, 'mod-cta',
				() => this.enableAll(summary.fixable));
		}
		this.button(actions, 'Refresh', '', () => this.display());
	}

	// `collapsible` folds the long recommended list away by default — the two
	// required plugins and the one manual install are what a new adopter needs
	// in front of them.
	renderSection(parent, { title, blurb, states, collapsible = false }) {
		if (states.length === 0) return;
		const attention = states.filter((s) => s.status !== STATUS_ACTIVE && !s.optIn).length;

		const section = parent.createEl(collapsible ? 'details' : 'div', { cls: 'sv-section' });
		// A folded section that hides a problem is worse than a long list.
		if (collapsible && attention > 0) section.setAttr('open', '');

		const head = collapsible
			? section.createEl('summary', { cls: 'sv-section__head' })
			: section.createDiv({ cls: 'sv-section__head' });
		head.createSpan({ cls: 'sv-section__title', text: title });
		head.createSpan({
			cls: 'sv-section__count',
			attr: { 'data-sv-tone': attention === 0 ? 'ok' : 'warn' },
			text: attention === 0 ? `${states.length} · all active` : `${attention} of ${states.length} need attention`,
		});

		const inner = section.createDiv({ cls: 'sv-section__inner' });
		inner.createDiv({ cls: 'sv-section__blurb', text: blurb });
		const list = inner.createDiv({ cls: 'sv-list' });
		for (const state of states) this.renderCard(list, state);
	}

	renderCard(parent, state) {
		const card = parent.createDiv({
			cls: 'sv-card',
			attr: { 'data-sv-tone': statusTone(state.status, state.tier) },
		});

		card.createDiv({ cls: 'sv-card__pill', text: statusGlyph(state.status, state.tier) });

		const main = card.createDiv({ cls: 'sv-card__main' });
		const heading = main.createDiv({ cls: 'sv-card__heading' });
		heading.createSpan({ cls: 'sv-card__name', text: state.name });
		if (state.optIn) heading.createSpan({ cls: 'sv-tag', text: 'optional' });
		heading.createSpan({
			cls: 'sv-card__status',
			text: state.version ? `${statusLabel(state.status)} · v${state.version}` : statusLabel(state.status),
		});

		const note = describeState(state);
		if (note) main.createDiv({ cls: 'sv-card__note', text: note });

		// Obsidian exposes no plugin-INSTALL API, so the only action offered is
		// the one that can actually be carried out: flipping an installed
		// plugin on. Everything else is a sentence telling the adopter what to do.
		if (state.tier !== 'manual' && state.status === STATUS_DISABLED) {
			this.button(card.createDiv({ cls: 'sv-card__action' }), 'Enable',
				state.optIn ? '' : 'mod-cta', () => this.enable(state));
		}
	}

	renderFramework(parent) {
		const section = parent.createDiv({ cls: 'sv-section' });
		section.createDiv({ cls: 'sv-section__head' })
			.createSpan({ cls: 'sv-section__title', text: 'Framework' });

		const inner = section.createDiv({ cls: 'sv-section__inner' });
		inner.createDiv({
			cls: 'sv-section__blurb',
			text: 'Templates, scripts and documentation. The updater runs outside Obsidian, so this only tells you when to run it.',
		});

		const card = inner.createDiv({ cls: 'sv-card', attr: { 'data-sv-tone': 'neutral' } });
		card.createDiv({ cls: 'sv-card__pill', text: '↑' });
		const main = card.createDiv({ cls: 'sv-card__main' });
		const heading = main.createDiv({ cls: 'sv-card__heading' });
		heading.createSpan({ cls: 'sv-card__name', text: 'ShadowVault framework' });
		const status = heading.createSpan({ cls: 'sv-card__status', text: 'Not checked yet' });
		const note = main.createDiv({ cls: 'sv-card__note', text: 'Checking asks GitHub for the latest published release.' });

		const btn = this.button(card.createDiv({ cls: 'sv-card__action' }), 'Check for updates', '', async () => {
			btn.disabled = true;
			btn.textContent = 'Checking…';
			const message = frameworkMessage(await checkFrameworkUpdate(this.app, requestUrl));
			card.setAttr('data-sv-tone', message.tone);
			status.textContent = message.title;
			note.textContent = message.detail;
			btn.disabled = false;
			btn.textContent = 'Check again';
		});
	}

	button(parent, text, cls, onClick) {
		const btn = parent.createEl('button', { text, cls: cls || undefined });
		btn.addEventListener('click', onClick);
		return btn;
	}

	async enable(state) {
		const ok = await this.enableOne(state);
		this.notice(ok
			? `Enabled ${state.name}.`
			: `Could not enable ${state.name} — enable it from Settings → Community plugins.`);
		await this.display();
	}

	// Sequential, not Promise.all: each call writes community-plugins.json, and
	// racing them risks one clobbering another's write of the same file.
	async enableAll(states) {
		const failed = [];
		for (const state of states) {
			if (!(await this.enableOne(state))) failed.push(state.name);
		}
		const done = states.length - failed.length;
		this.notice(failed.length === 0
			? `Enabled ${done} plugin${done === 1 ? '' : 's'}.`
			: `Enabled ${done} of ${states.length}. Enable the rest from Settings → Community plugins: ${failed.join(', ')}.`);
		await this.display();
	}

	// The one privileged call, and the only place app.plugins is touched. It is
	// @internal, so a future Obsidian could drop it: feature-detect, return
	// false, and let the caller say so in words rather than throw.
	async enableOne(state) {
		const mgr = this.app && this.app.plugins;
		if (!mgr || typeof mgr.enablePluginAndSave !== 'function') return false;
		try {
			await mgr.enablePluginAndSave(state.id);
			return true;
		} catch (_) {
			return false;
		}
	}

	notice(text) {
		if (Notice) new Notice(text);
	}
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

		if (HAS_OBSIDIAN) {
			this.addSettingTab(new ShadowVaultSettingsTab(this.app, this));
		}
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
// node conformance/unit tests.
module.exports.computeStamp = computeStamp;
module.exports.SV_FIELDS = SV_FIELDS;
module.exports.PLUGIN_REGISTRY = PLUGIN_REGISTRY;
module.exports.STATUS_ACTIVE = STATUS_ACTIVE;
module.exports.STATUS_DISABLED = STATUS_DISABLED;
module.exports.STATUS_UNLOADED = STATUS_UNLOADED;
module.exports.STATUS_MISSING = STATUS_MISSING;
module.exports.STATUS_META = STATUS_META;
module.exports.resolveStatus = resolveStatus;
module.exports.statusLabel = statusLabel;
module.exports.statusTone = statusTone;
module.exports.statusGlyph = statusGlyph;
module.exports.isVersionNewer = isVersionNewer;
module.exports.collectPluginState = collectPluginState;
module.exports.summarize = summarize;
module.exports.healthMessage = healthMessage;
module.exports.describeState = describeState;
module.exports.checkFrameworkUpdate = checkFrameworkUpdate;
module.exports.frameworkMessage = frameworkMessage;
