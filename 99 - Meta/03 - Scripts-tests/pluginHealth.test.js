// SPDX-License-Identifier: AGPL-3.0-only
/*
 * Plugin-health conformance + pure logic tests (first-party
 * shadowvault-property-icons "Plugin health" settings tab).
 *
 * PLUGIN_REGISTRY in the plugin's main.js is the in-plugin copy of the plugin
 * set PLUGINS.md describes. This file pins it against the three ground-truth
 * artefacts that actually ship:
 *
 *   - .obsidian/community-plugins.json   the enabled set
 *   - .obsidian/plugins/<id>/manifest.json  the bundled set
 *   - framework-manifest.json            the redistributed set (class core)
 *
 * so a renamed/removed/re-tiered plugin fails a test instead of stranding a new
 * adopter with a broken health tab.
 *
 * Media Extended is special-cased: it is the ONLY 'manual' entry, and the
 * redistribution invariant is that its CODE (main.js/manifest.json/styles.css)
 * is absent from the framework manifest — it ships no upstream licence (see
 * .gitignore and THIRD-PARTY-NOTICES.md); only its settings file (config) is
 * distributed so it picks up the vault's configuration once installed.
 *
 * The rest of the file exercises the pure functions the tab is built from. The
 * tab renders nothing it did not get from one of them — status word, colour
 * tone, banner headline, per-row explanation, framework verdict — so asserting
 * them here covers the tab's wording and its state machine, leaving only DOM
 * assembly to the manual Obsidian pass.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const plugin = require("../../.obsidian/plugins/shadowvault-property-icons/main.js");

const COMMUNITY_PLUGINS = path.join(__dirname, "..", "..", ".obsidian", "community-plugins.json");
const PLUGINS_DIR = path.join(__dirname, "..", "..", ".obsidian", "plugins");
const MANIFEST_PATH = path.join(__dirname, "..", "..", "framework-manifest.json");

const {
	resolveStatus, statusLabel, statusTone, statusGlyph, isVersionNewer,
	collectPluginState, summarize, healthMessage, describeState,
	checkFrameworkUpdate, frameworkMessage,
} = plugin;

const ALL_STATUSES = [plugin.STATUS_ACTIVE, plugin.STATUS_DISABLED, plugin.STATUS_UNLOADED, plugin.STATUS_MISSING];

// Shorthand for building the state objects the render layer consumes.
const state = (over = {}) => ({
	id: "x", name: "X", tier: "bundled", optIn: false, version: null,
	status: plugin.STATUS_ACTIVE, ...over,
});

// --- registry vs. the shipping truth -----------------------------------------

test("registry: ids are unique and tiers are valid; media-extended is the only manual entry", () => {
	const ids = plugin.PLUGIN_REGISTRY.map((r) => r.id);
	assert.equal(new Set(ids).size, ids.length, "duplicate plugin id in PLUGIN_REGISTRY");
	for (const entry of plugin.PLUGIN_REGISTRY) {
		assert.ok(["required", "bundled", "manual"].includes(entry.tier), `${entry.id}: bad tier ${entry.tier}`);
		assert.ok(entry.name && typeof entry.name === "string", `${entry.id}: missing name`);
		if (entry.optIn) assert.equal(entry.tier, "bundled", `${entry.id}: optIn is only meaningful on bundled plugins`);
	}
	const manual = plugin.PLUGIN_REGISTRY.filter((r) => r.tier === "manual");
	assert.deepEqual(manual.map((r) => r.id), ["media-extended"],
		"the only manual entry must be media-extended — the one plugin ShadowVault cannot redistribute (no upstream licence)");
});

test("registry: required and enabled-by-default bundled plugins are on and enabled; opt-in ones stay off", () => {
	const enabled = JSON.parse(fs.readFileSync(COMMUNITY_PLUGINS, "utf8"));
	const shipped = plugin.PLUGIN_REGISTRY.filter((r) => r.tier !== "manual");
	const optIn = plugin.PLUGIN_REGISTRY.filter((r) => r.optIn);
	assert.deepEqual(optIn.map((r) => r.id), ["obsidian-git"],
		"Obsidian Git is the one bundled plugin the framework deliberately ships disabled (device-level git setup)");
	for (const entry of shipped) {
		assert.ok(fs.existsSync(path.join(PLUGINS_DIR, entry.id, "manifest.json")),
			`${entry.id} is not bundled under .obsidian/plugins/`);
		if (entry.optIn) {
			assert.ok(!enabled.includes(entry.id),
				`${entry.id} is opt-in but is enabled in the shipped community-plugins.json — drop the optIn flag or the default changed`);
		} else {
			assert.ok(enabled.includes(entry.id),
				`${entry.id} is not enabled in community-plugins.json — a fresh adopter would have it off`);
		}
	}
});

test("registry: shipped plugins redistribute in framework-manifest.json; media-extended code never does", () => {
	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
	const paths = new Set(manifest.files.map((f) => f.path));
	const shipped = plugin.PLUGIN_REGISTRY.filter((r) => r.tier !== "manual");
	for (const entry of shipped) {
		assert.ok(paths.has(`.obsidian/plugins/${entry.id}/manifest.json`),
			`${entry.id}/manifest.json is not listed in framework-manifest.json — it would not ship to adopters`);
	}
	for (const file of ["main.js", "manifest.json", "styles.css"]) {
		assert.ok(!paths.has(`.obsidian/plugins/media-extended/${file}`),
			`media-extended/${file} must never be redistributed (no upstream licence)`);
	}
});

// --- pure state mapping ---------------------------------------------------------

test("resolveStatus maps the installed/enabled/loaded matrix", () => {
	const cases = [
		[{ installed: true, enabled: true, loaded: true }, plugin.STATUS_ACTIVE],
		[{ installed: true, enabled: false, loaded: false }, plugin.STATUS_DISABLED],
		[{ installed: true, enabled: true, loaded: false }, plugin.STATUS_UNLOADED],
		[{ installed: false, enabled: false, loaded: false }, plugin.STATUS_MISSING],
		[{ installed: false, enabled: true, loaded: false }, plugin.STATUS_MISSING],
		[{ installed: true, enabled: false, loaded: true }, plugin.STATUS_DISABLED],
	];
	for (const [input, expected] of cases) {
		assert.equal(resolveStatus(input), expected, JSON.stringify(input));
	}
	assert.equal(resolveStatus({}), plugin.STATUS_MISSING, "empty input is the conservative state");
});

test("statusLabel renders a human label for every status", () => {
	assert.equal(statusLabel(plugin.STATUS_ACTIVE), "Active");
	assert.equal(statusLabel(plugin.STATUS_DISABLED), "Installed but disabled");
	assert.equal(statusLabel(plugin.STATUS_UNLOADED), "Enabled but failed to load");
	assert.equal(statusLabel(plugin.STATUS_MISSING), "Not installed");
});

// The tab paints from STATUS_META alone, so a status added without a full row
// would render a blank pill in front of an adopter. Fail here instead.
test("STATUS_META covers every status with a label, a tone and a glyph", () => {
	assert.deepEqual(Object.keys(plugin.STATUS_META).sort(), [...ALL_STATUSES].sort());
	for (const status of ALL_STATUSES) {
		const meta = plugin.STATUS_META[status];
		assert.ok(meta.label, `${status}: no label`);
		assert.ok(["ok", "warn", "error", "neutral"].includes(meta.tone), `${status}: bad tone ${meta.tone}`);
		assert.ok(meta.glyph, `${status}: no glyph`);
	}
});

test("statusTone colours by status, but never faults a plugin the vault cannot ship", () => {
	assert.equal(statusTone(plugin.STATUS_ACTIVE, "required"), "ok");
	assert.equal(statusTone(plugin.STATUS_DISABLED, "bundled"), "warn");
	assert.equal(statusTone(plugin.STATUS_UNLOADED, "required"), "error");
	assert.equal(statusTone(plugin.STATUS_MISSING, "bundled"), "error");

	// Media Extended is not redistributable — absent is the expected state, not a fault.
	assert.equal(statusTone(plugin.STATUS_MISSING, "manual"), "neutral");
	assert.equal(statusGlyph(plugin.STATUS_MISSING, "manual"), "↓", "manual rows invite an install, not an alarm");
	assert.equal(statusTone(plugin.STATUS_ACTIVE, "manual"), "ok", "once installed it is as green as anything else");

	assert.equal(statusTone("nonsense", "bundled"), "error", "an unknown status is treated as broken, not as fine");
	assert.equal(statusLabel("nonsense"), "Not installed");
});

// --- summary + wording ------------------------------------------------------------

test("summarize counts the shipped set and excludes opt-in plugins from the score", () => {
	const clean = summarize([
		state({ tier: "required" }),
		state({ tier: "bundled" }),
		state({ tier: "bundled", optIn: true, status: plugin.STATUS_DISABLED }),
		state({ tier: "manual", status: plugin.STATUS_MISSING }),
	]);
	assert.equal(clean.tracked, 2, "opt-in and manual entries are not scored");
	assert.equal(clean.shipped, 3, "shipped still counts the opt-in plugin");
	assert.equal(clean.active, 2);
	assert.equal(clean.ok, true, "a disabled opt-in plugin is the shipped default, not a problem");
	assert.deepEqual(clean.problems, []);

	const broken = summarize([
		state({ id: "a", tier: "required", status: plugin.STATUS_DISABLED }),
		state({ id: "b", tier: "bundled", status: plugin.STATUS_MISSING }),
		state({ id: "c", tier: "bundled" }),
	]);
	assert.equal(broken.ok, false);
	assert.deepEqual(broken.problems.map((s) => s.id), ["a", "b"]);
	assert.deepEqual(broken.fixable.map((s) => s.id), ["a"], "only a disabled plugin can be fixed from the tab");
	assert.equal(broken.active, 1);
});

test("summarize survives an empty vault without dividing by zero", () => {
	const empty = summarize([]);
	assert.equal(empty.tracked, 0);
	assert.equal(empty.active, 0);
	assert.equal(empty.ok, true);
});

test("healthMessage escalates to error only when a required plugin is down", () => {
	const ok = healthMessage(summarize([state({ tier: "required" })]));
	assert.equal(ok.tone, "ok");
	assert.match(ok.detail, /All 1 required and recommended/);

	const warn = healthMessage(summarize([state({ tier: "bundled", status: plugin.STATUS_DISABLED })]));
	assert.equal(warn.tone, "warn", "a switched-off recommended plugin is amber, not red");
	assert.equal(warn.title, "1 plugin needs attention", "singular when there is one");

	const error = healthMessage(summarize([state({ tier: "required", status: plugin.STATUS_MISSING })]));
	assert.equal(error.tone, "error", "the vault genuinely does not work without a required plugin");

	const many = healthMessage(summarize([
		state({ id: "a", tier: "bundled", status: plugin.STATUS_DISABLED }),
		state({ id: "b", tier: "bundled", status: plugin.STATUS_DISABLED }),
	]));
	assert.equal(many.title, "2 plugins need attention");
	assert.match(many.detail, /enable them from here/, "all-fixable says so plainly");

	const mixed = healthMessage(summarize([
		state({ id: "a", tier: "bundled", status: plugin.STATUS_DISABLED }),
		state({ id: "b", tier: "bundled", status: plugin.STATUS_MISSING }),
	]));
	assert.match(mixed.detail, /1 can be switched on from here/);

	const none = healthMessage(summarize([state({ tier: "bundled", status: plugin.STATUS_MISSING })]));
	assert.match(none.detail, /framework update or a manual install/,
		"nothing the button can fix must not offer the button's promise");
});

test("describeState explains every actionable state and stays quiet when active", () => {
	assert.equal(describeState(state({ status: plugin.STATUS_ACTIVE })), "",
		"a healthy row repeats nothing — the pill already said Active");

	assert.match(describeState(state({ status: plugin.STATUS_DISABLED })), /switched off/);
	assert.match(describeState(state({ status: plugin.STATUS_DISABLED, optIn: true })), /Optional/);
	assert.match(describeState(state({ status: plugin.STATUS_UNLOADED })), /did not load/);
	assert.match(describeState(state({ status: plugin.STATUS_MISSING })), /UPDATING\.md/,
		"a missing shipped plugin points at the updater, the only thing that restores it");

	const manual = describeState(state({ tier: "manual", status: plugin.STATUS_MISSING }));
	assert.match(manual, /no upstream licence/, "says WHY it is absent, so it does not read as a bug");
	assert.match(manual, /Community plugins/, "and how to get it");
	assert.match(describeState(state({ tier: "manual", status: plugin.STATUS_ACTIVE })), /Installed by you/);

	// Whatever the state, the tab never promises an install it cannot perform.
	for (const status of ALL_STATUSES) {
		for (const tier of ["required", "bundled", "manual"]) {
			assert.equal(typeof describeState(state({ status, tier })), "string", `${tier}/${status}`);
		}
	}
});

// --- version comparison ----------------------------------------------------------

test("isVersionNewer compares numerically, not lexically", () => {
	assert.equal(isVersionNewer("2.17.0", "2.16.0"), true);
	assert.equal(isVersionNewer("2.16.1", "2.16.0"), true);
	assert.equal(isVersionNewer("10.0.0", "9.0.0"), true, "multi-digit majors compare numerically");
	assert.equal(isVersionNewer("2.10.0", "2.9.9"), true, "minor 10 > minor 9");
	assert.equal(isVersionNewer("2.16.0", "2.16.0"), false);
	assert.equal(isVersionNewer("2.15.1", "2.16.0"), false);
	assert.equal(isVersionNewer("2.16.0", "2.16.0.1"), false, "extra patch on the installed side wins");
	assert.equal(isVersionNewer("v2.17.0", "2.16.0"), true, "strips the v prefix GitHub tags carry");
	assert.equal(isVersionNewer("", "1.0.0"), false);
	assert.equal(isVersionNewer(null, "1.0.0"), false);
});

// --- state gathering against a fake app -----------------------------------------

// Minimal fake app: adapter.exists sees `present` plugin ids, adapter.read
// serves community-plugins.json + a synthetic manifest per plugin, plugins
// loads the ids in `loaded`.
function makeApp({ present = [], community = [], loaded = [] } = {}) {
	const manifestPaths = new Set(present.map((id) => `.obsidian/plugins/${id}/manifest.json`));
	return {
		vault: {
			adapter: {
				async exists(p) { return manifestPaths.has(p); },
				async read(p) {
					if (p === ".obsidian/community-plugins.json") return JSON.stringify(community);
					const id = p.split("/")[2];
					return JSON.stringify({ id, version: "9.9.9" });
				},
			},
		},
		plugins: { getPlugin: (id) => (loaded.includes(id) ? {} : null) },
	};
}

test("collectPluginState derives status and version from the app", async () => {
	const entry = { id: "templater-obsidian", name: "Templater", tier: "required" };

	const active = await collectPluginState(makeApp({
		present: ["templater-obsidian"], community: ["templater-obsidian"], loaded: ["templater-obsidian"],
	}), entry);
	assert.equal(active.status, plugin.STATUS_ACTIVE);
	assert.equal(active.version, "9.9.9");
	assert.equal(active.optIn, false);

	const optIn = await collectPluginState(makeApp({
		present: ["obsidian-git"], community: [], loaded: [],
	}), { id: "obsidian-git", name: "Obsidian Git", tier: "bundled", optIn: true });
	assert.equal(optIn.status, plugin.STATUS_DISABLED);
	assert.equal(optIn.optIn, true, "optIn rides through so the tab can skip it in the problem count");

	const disabled = await collectPluginState(makeApp({
		present: ["templater-obsidian"], community: [], loaded: [],
	}), entry);
	assert.equal(disabled.status, plugin.STATUS_DISABLED, "installed but not in community-plugins.json");

	const unloaded = await collectPluginState(makeApp({
		present: ["templater-obsidian"], community: ["templater-obsidian"], loaded: [],
	}), entry);
	assert.equal(unloaded.status, plugin.STATUS_UNLOADED, "listed but its main.js failed to load");

	const missing = await collectPluginState(makeApp({
		present: [], community: ["templater-obsidian"], loaded: [],
	}), entry);
	assert.equal(missing.status, plugin.STATUS_MISSING, "listed in community-plugins.json but not on disk");
});

test("collectPluginState degrades to conservative state when the app surface is missing", async () => {
	const state = await collectPluginState({ vault: {} }, { id: "x", name: "X", tier: "required" });
	assert.equal(state.status, plugin.STATUS_MISSING);
	assert.equal(state.version, null);
});

test("checkFrameworkUpdate compares installed vs GitHub latest and degrades cleanly", async () => {
	const manifestApp = async (version) => ({
		vault: { adapter: { async read(p) {
			if (p === "framework-manifest.json") return JSON.stringify({ repo: "tenebrishv/shadowvault-setup", version });
			throw new Error("missing file");
		} } },
	});
	const requestUrl = async () => ({ text: JSON.stringify({ tag_name: "v2.17.0" }) });

	const older = await manifestApp("2.16.0");
	assert.deepEqual(await checkFrameworkUpdate(older, requestUrl),
		{ installed: "2.16.0", latest: "2.17.0", update: true, error: null });

	const current = await manifestApp("2.17.0");
	assert.deepEqual(await checkFrameworkUpdate(current, requestUrl),
		{ installed: "2.17.0", latest: "2.17.0", update: false, error: null });

	const noManifest = { vault: { adapter: { async read() { throw new Error("missing file"); } } } };
	assert.equal((await checkFrameworkUpdate(noManifest, requestUrl)).error, "no-manifest");

	assert.equal((await checkFrameworkUpdate(older, async () => { throw new Error("offline"); })).error, "network");
	assert.equal((await checkFrameworkUpdate(older, null)).error, "network");
});

test("frameworkMessage words each verdict and never mistakes 'offline' for 'up to date'", () => {
	const update = frameworkMessage({ installed: "2.16.0", latest: "2.17.0", update: true, error: null });
	assert.equal(update.tone, "warn");
	assert.match(update.title, /2\.17\.0/);
	assert.match(update.detail, /update-vault\.ps1/, "names the script the adopter has to run");

	const current = frameworkMessage({ installed: "2.17.0", latest: "2.17.0", update: false, error: null });
	assert.equal(current.tone, "ok");
	assert.match(current.detail, /Up to date/);

	// The dangerous confusion: a failed check must not read as a clean bill of health.
	const offline = frameworkMessage({ installed: "2.16.0", latest: null, update: false, error: "network" });
	assert.equal(offline.tone, "neutral");
	assert.match(offline.detail, /Could not reach GitHub/);
	assert.doesNotMatch(offline.detail, /Up to date/);

	const noManifest = frameworkMessage({ installed: null, latest: null, update: false, error: "no-manifest" });
	assert.equal(noManifest.tone, "neutral");
	assert.match(noManifest.detail, /git checkout/);

	assert.equal(frameworkMessage(undefined).tone, "neutral", "a missing result degrades, never throws");
	assert.match(frameworkMessage({ installed: null, latest: null, update: false, error: "network" }).title, /unknown/);
});
