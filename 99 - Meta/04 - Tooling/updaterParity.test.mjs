/*
 * Parity + contract matrix for the two framework updaters (issue #14, ADR 0002).
 *
 *   node --test "99 - Meta/04 - Tooling/updaterParity.test.mjs"
 *
 * Each scenario runs BOTH updaters (update-vault.ps1 under pwsh — and Windows
 * PowerShell 5.1 when present — and update-vault.sh under Git Bash) against
 * IDENTICAL local fixtures, then asserts two things:
 *   1. PARITY  — every implementation produced the same observable outcome
 *      (vault tree, backups, config stash, normalized report, written manifest).
 *   2. ABSOLUTE — that shared outcome is the RIGHT one for the scenario (the
 *      modified core file really was backed up, the deleted file really is gone,
 *      a dry run really wrote nothing, ...).
 * Parity alone could pass on two identically-wrong updaters; the absolute checks
 * close that. See the harness library for how outcomes are captured/normalized.
 *
 * Plus one contract test: the REAL generate-manifest.ps1 output is fed to the
 * REAL update-vault.sh manifest parser and every entry must round-trip.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import {
  detectEnv, implementations, makeScratch, cleanup,
  buildVault, buildEmptyVault, editFile, buildReleaseZip,
  runUpdater, snapshotVault, toBash, toWin, sha256,
  GENERATE_MANIFEST, SH, MANIFEST_NAME,
} from "./updaterParityHarness.mjs";

let SCRATCH;
before(() => { detectEnv(); SCRATCH = makeScratch(); });
after(() => { if (SCRATCH) cleanup(SCRATCH); });

// --- shared fixture content -------------------------------------------------
// A small framework file set spanning every branch of the merge: two classes
// (core/config), a tooling-prefixed file (processed last), a removable file
// (deletion), and a path with spaces/parens/ampersand (stresses the bash
// grep -F path matching).
function baseFiles({ coreV = "v1", hotkeys = '{"k":1}\n', withRemovable = true } = {}) {
  const files = [
    { path: "99 - Meta/00 - Templates/(TEMPLATE) Core.md", class: "core", content: `# Core template ${coreV}\n` },
    { path: "99 - Meta/00 - Templates/(TEMPLATE) A & B (x).md", class: "core", content: "amp & paren (stable)\n" },
    { path: "08 - Nexus/Dashboard.md", class: "core", content: "dashboard\n" },
    { path: ".obsidian/app.json", class: "config", content: '{"a":1}\n' },
    { path: ".obsidian/hotkeys.json", class: "config", content: hotkeys },
    { path: "99 - Meta/04 - Tooling/dummy-tool.txt", class: "core", content: "tool stable\n" },
  ];
  if (withRemovable) {
    files.push({ path: "99 - Meta/00 - Templates/(TEMPLATE) Removable.md", class: "core", content: "removable\n" });
  }
  return files;
}

const CORE = "99 - Meta/00 - Templates/(TEMPLATE) Core.md";
const REMOVABLE = "99 - Meta/00 - Templates/(TEMPLATE) Removable.md";
const HOTKEYS = ".obsidian/hotkeys.json";
let scenarioSeq = 0;

// Runs one scenario under every implementation on identical fresh vault copies,
// asserts cross-implementation parity, and returns the reference snapshot plus
// the per-implementation vault dirs (for a literal diff -r where wanted).
function runScenario(name, { buildInto, zip, dryRun = false, force = false, expectStatus = 0 }) {
  const dir = join(SCRATCH, `s${scenarioSeq++}-${name}`);
  mkdirSync(dir, { recursive: true });
  const impls = implementations();
  const runs = [];
  for (const impl of impls) {
    const vault = join(dir, impl.name.replace(/[^\w.]+/g, "_"));
    mkdirSync(vault, { recursive: true });
    buildInto(vault);
    const res = runUpdater(impl, { vault, zip, dryRun, force });
    assert.equal(res.status, expectStatus,
      `${name}: ${impl.name} exited ${res.status}\nstderr:\n${res.stderr}\nstdout:\n${res.stdout}`);
    runs.push({ impl, vault, res, snap: snapshotVault(vault, res.stdout) });
  }
  // Parity: every implementation matches the first on every observable field.
  const ref = runs[0];
  for (const r of runs.slice(1)) {
    for (const field of ["tree", "backups", "stashedConfig", "writtenReport", "reportedBlock", "manifestVersion"]) {
      assert.deepEqual(r.snap[field], ref.snap[field],
        `${name}: ${r.impl.name} diverges from ${ref.impl.name} on "${field}"`);
    }
  }
  return { ref: ref.snap, runs };
}

// ---------------------------------------------------------------------------
// Scenario matrix (issue #14 story 4).
// ---------------------------------------------------------------------------

test("bootstrap: empty vault + release -> everything added, no backups", () => {
  const release = baseFiles({ coreV: "v2" });
  const zip = buildReleaseZip(SCRATCH, "2.1.0", release);
  const { ref, runs } = runScenario("bootstrap", { buildInto: buildEmptyVault, zip });

  assert.equal(ref.manifestVersion, "2.1.0");
  assert.deepEqual(ref.backups, {}, "bootstrap must create no backups");
  // Every framework file plus the manifest is present.
  for (const f of release) assert.ok(ref.tree[f.path], `missing ${f.path}`);
  assert.ok(ref.tree[MANIFEST_NAME]);
  assert.match(ref.reportedBlock, /## Added \(7\)/);

  // Story 6: literal diff -r between the pwsh and bash bootstrap results.
  const ps = runs.find((r) => r.impl.kind === "ps");
  const bash = runs.find((r) => r.impl.kind === "bash");
  const d = spawnSync(bash.impl.exe, ["-c", `diff -r "${toBash(ps.vault)}" "${toBash(bash.vault)}"`], { encoding: "utf8" });
  assert.equal(d.stdout.trim(), "", `pwsh vs bash bootstrap trees differ:\n${d.stdout}`);
  assert.equal(d.status, 0);
});

test("clean update: unmodified core changed + a file deleted, no backups", () => {
  const zip = buildReleaseZip(SCRATCH, "2.1.0", baseFiles({ coreV: "v2", withRemovable: false }));
  const { ref } = runScenario("clean-update", {
    buildInto: (v) => buildVault(v, "2.0.0", baseFiles({ coreV: "v1" })),
    zip,
  });
  assert.equal(ref.manifestVersion, "2.1.0");
  assert.deepEqual(ref.backups, {}, "nothing was user-modified -> no backups");
  assert.equal(ref.tree[REMOVABLE], undefined, "removed-from-framework file must be deleted");
  assert.match(ref.reportedBlock, /## Updated \(1\)/);
  assert.match(ref.reportedBlock, /## Deleted \(removed from framework\) \(1\)/);
  assert.match(ref.reportedBlock, /Core\.md/);
});

test("user-modified core: backed up AND overwritten", () => {
  const release = baseFiles({ coreV: "v2" });
  const zip = buildReleaseZip(SCRATCH, "2.1.0", release);
  const { ref } = runScenario("modified-core", {
    buildInto: (v) => {
      buildVault(v, "2.0.0", baseFiles({ coreV: "v1" }));
      editFile(v, CORE, "# Core template USER EDIT\n"); // user diverges from installed
    },
    zip,
  });
  // Backed up copy holds the USER's version; disk now holds the RELEASE version.
  const backupKeys = Object.keys(ref.backups).filter((k) => k.endsWith("Core.md"));
  assert.equal(backupKeys.length, 1, "user-modified core must be backed up exactly once");
  const releaseCoreHash = snapHashOf(release, CORE);
  assert.equal(ref.tree[CORE], releaseCoreHash, "disk core must be the release version");
  assert.match(ref.reportedBlock, /## Updated \(1\)/);
  assert.match(ref.reportedBlock, /## Backed up before overwrite \(1\)/);
});

test("user-modified config: kept local, new version stashed under _new-config", () => {
  const release = baseFiles({ coreV: "v1", hotkeys: '{"k":2}\n' });
  const zip = buildReleaseZip(SCRATCH, "2.1.0", release);
  const userHotkeys = '{"USER":true}\n';
  const { ref } = runScenario("modified-config", {
    buildInto: (v) => {
      buildVault(v, "2.0.0", baseFiles({ coreV: "v1", hotkeys: '{"k":1}\n' }));
      editFile(v, HOTKEYS, userHotkeys); // user diverges on a config file
    },
    zip,
  });
  assert.equal(ref.tree[HOTKEYS], hashStr(userHotkeys), "config file must keep the user's version on disk");
  assert.equal(ref.stashedConfig.length, 1, "release config must be stashed under _new-config");
  const stashKey = ref.stashedConfig[0];
  assert.equal(ref.backups[stashKey], hashStr('{"k":2}\n'), "stash must hold the release version");
  assert.match(ref.reportedBlock, /## Kept your local version \(config\) \(1\)/);
});

test("older release without --force: skipped, zero writes", () => {
  const zip = buildReleaseZip(SCRATCH, "1.0.0", baseFiles({ coreV: "v0" }));
  const { ref, runs } = runScenario("older-skip", {
    buildInto: (v) => buildVault(v, "2.0.0", baseFiles({ coreV: "v2" })),
    zip,
  });
  assert.equal(ref.manifestVersion, "2.0.0", "installed version must be untouched");
  assert.deepEqual(ref.backups, {});
  assert.equal(ref.reportedBlock, null, "a skip writes no report");
  for (const r of runs) assert.match(r.res.stdout, /Already up to date/);
});

test("older release WITH --force: applied (downgrade)", () => {
  const zip = buildReleaseZip(SCRATCH, "1.0.0", baseFiles({ coreV: "v0" }));
  const { ref } = runScenario("force-downgrade", {
    buildInto: (v) => buildVault(v, "2.0.0", baseFiles({ coreV: "v2" })),
    zip,
    force: true,
  });
  assert.equal(ref.manifestVersion, "1.0.0", "forced downgrade must rewrite the manifest");
  assert.equal(ref.tree[CORE], hashStr("# Core template v0\n"), "core must be the (older) release version");
  assert.deepEqual(ref.backups, {}, "unmodified files are overwritten without backup");
});

test("dry run: reports the change but writes nothing", () => {
  const zip = buildReleaseZip(SCRATCH, "2.1.0", baseFiles({ coreV: "v2" }));
  const userCore = "# Core template USER EDIT\n";
  const { ref } = runScenario("dry-run", {
    buildInto: (v) => {
      buildVault(v, "2.0.0", baseFiles({ coreV: "v1" }));
      editFile(v, CORE, userCore);
    },
    zip,
    dryRun: true,
  });
  assert.equal(ref.manifestVersion, "2.0.0", "dry run must not advance the installed version");
  assert.equal(ref.tree[CORE], hashStr(userCore), "dry run must leave the user's file untouched");
  assert.deepEqual(ref.backups, {}, "dry run must create no backup dir");
  assert.match(ref.reportedBlock, /DRY RUN - nothing was changed/);
  assert.match(ref.reportedBlock, /## Backed up before overwrite \(1\)/);
});

test("re-run of the same release: idempotent, second run is a no-op", () => {
  const release = baseFiles({ coreV: "v2" });
  const zip = buildReleaseZip(SCRATCH, "2.1.0", release);
  const impls = implementations();
  const dir = join(SCRATCH, `s${scenarioSeq++}-rerun`);
  for (const impl of impls) {
    const vault = join(dir, impl.name.replace(/[^\w.]+/g, "_"));
    mkdirSync(vault, { recursive: true });
    buildVault(vault, "2.0.0", baseFiles({ coreV: "v1" }));
    const first = runUpdater(impl, { vault, zip });
    assert.equal(first.status, 0, `${impl.name} first run failed:\n${first.stderr}`);
    const afterFirst = snapshotVault(vault, first.stdout);
    const second = runUpdater(impl, { vault, zip });
    assert.equal(second.status, 0);
    assert.match(second.stdout, /Already up to date/, `${impl.name}: second run should be a no-op`);
    const afterSecond = snapshotVault(vault, second.stdout);
    assert.deepEqual(afterSecond.tree, afterFirst.tree, `${impl.name}: second run mutated the vault`);
  }
});

// ---------------------------------------------------------------------------
// Manifest-format contract (issue #14 story 5): the REAL generator's output,
// fed to the REAL bash parser, round-trips every entry (path, sha256, class).
// ---------------------------------------------------------------------------

test("manifest format contract: generate-manifest.ps1 output round-trips through update-vault.sh parser", () => {
  const { pwsh } = detectEnv();
  const bash = implementations().find((i) => i.kind === "bash").exe;
  const mini = join(SCRATCH, `contract-vault`);
  // A tree that hits the generator's include-list across both classes, with a
  // spaces/paren/ampersand path to stress the sed-based parser.
  writeFileDeep(join(mini, "99 - Meta/00 - Templates/(TEMPLATE) Contract & Test.md"), "x\n");
  writeFileDeep(join(mini, "08 - Nexus/Board.md"), "y\n");
  writeFileDeep(join(mini, "README.md"), "readme\n");
  writeFileDeep(join(mini, "CHANGELOG.md"), "## [3.4.5]\n");
  writeFileDeep(join(mini, "LICENSE"), "lic\n");
  writeFileDeep(join(mini, ".obsidian/app.json"), '{"a":1}\n');
  writeFileDeep(join(mini, "07 - Attachments/.gitkeep"), "");

  const gen = spawnSync(pwsh,
    ["-NoProfile", "-NonInteractive", "-File", toWin(GENERATE_MANIFEST), "-VaultPath", toWin(mini), "-Version", "3.4.5"],
    { encoding: "utf8" });
  assert.equal(gen.status, 0, `generator failed:\n${gen.stderr}`);
  const manifestPath = join(mini, MANIFEST_NAME);
  assert.ok(existsSync(manifestPath), "generator did not write a manifest");

  // Canonical entries via a tolerant JSON parse of the generator's output.
  const fromJson = JSON.parse(readFileSync(manifestPath, "utf8")).files
    .map((f) => `${f.path}\t${f.sha256}\t${f.class}`)
    .sort();

  // The REAL parser: source update-vault.sh (its main() is guarded, so sourcing
  // only defines functions) and call manifest_lines on the same file.
  const parsed = spawnSync(bash,
    ["-c", `source "${toBash(SH)}"; manifest_lines "${toBash(manifestPath)}"`],
    { encoding: "utf8" });
  assert.equal(parsed.status, 0, `bash parser failed:\n${parsed.stderr}`);
  const fromBash = parsed.stdout.replace(/\r\n/g, "\n").split("\n").filter(Boolean).sort();

  assert.ok(fromJson.length >= 6, `expected several entries, got ${fromJson.length}`);
  assert.deepEqual(fromBash, fromJson, "bash parser did not round-trip the generator's manifest entries");
});

// --- tiny helpers -----------------------------------------------------------
function hashStr(s) {
  return sha256(Buffer.from(s));
}
function snapHashOf(files, path) {
  return sha256(Buffer.from(files.find((x) => x.path === path).content));
}
function writeFileDeep(fullPath, content) {
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, content);
}
