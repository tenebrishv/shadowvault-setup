/*
 * Parity harness library for the framework updaters (issue #14, ADR 0002).
 *
 * The updater is implemented twice by hand — update-vault.ps1 (PowerShell) and
 * update-vault.sh (bash) — and the two MUST stay behaviorally identical. Nothing
 * enforced that before this harness: every behavior change was a two-file edit
 * where a missed second edit shipped silently. This module lets updaterParity.test.mjs
 * drive BOTH updaters through their CLI against identical local fixtures and diff
 * the OUTCOMES (vault tree, backups, config stash, normalized report, manifest) —
 * never their internals. Two adapters, one interface, identical observable results.
 *
 * Everything here is offline: fixtures are built in the OS temp dir (never inside
 * the repo tree) and releases are local zips fed via -ZipPath/--zip-path, so no
 * GitHub release, network, or Obsidian is involved. It is a dev-machine tool that
 * ships with the tooling but is never run against an adopter's vault.
 *
 * Run it with:  node --test "99 - Meta/04 - Tooling/updaterParity.test.mjs"
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync,
  readdirSync, statSync, rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PS1 = join(HERE, "update-vault.ps1");
export const SH = join(HERE, "update-vault.sh");
export const GENERATE_MANIFEST = join(HERE, "generate-manifest.ps1");

// The one place these constants live for the harness — kept identical to the
// updaters' own BACKUP_ROOT so snapshots find the backup tree.
export const BACKUP_ROOT = "99 - Meta/05 - Backups";
export const MANIFEST_NAME = "framework-manifest.json";

// ---------------------------------------------------------------------------
// Path translation. Windows paths for the PowerShell interpreters, msys paths
// (/c/Users/...) for Git Bash — passing the wrong flavor makes the other side
// fail to resolve the path at all (verified: Expand-Archive rejects /c/... and
// Git Bash mangles C:\...). Defined once so no scenario re-hand-rolls it.
// ---------------------------------------------------------------------------

export function toWin(p) {
  return p.replace(/\//g, "\\");
}

export function toBash(p) {
  return p
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, d) => "/" + d.toLowerCase());
}

// ---------------------------------------------------------------------------
// Environment detection. pwsh (7+) and Git Bash are HARD requirements — parity
// cannot be proven if one side can't run, so a missing one throws rather than
// silently skipping. Windows PowerShell 5.1 (powershell.exe) is OPTIONAL: it
// exists only on Windows and proves the .ps1's 5.1 compatibility. When present
// every scenario runs under it too; when absent (macOS/Linux) it is skipped.
// ---------------------------------------------------------------------------

function canRun(cmd, args) {
  try {
    const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 20000 });
    return r.status === 0 || (r.stdout || "").length > 0;
  } catch {
    return false;
  }
}

// Resolve a Git Bash whose `uname` is MINGW/MSYS — NOT WSL. The issue is
// explicit that the harness must not require WSL; a `bash` on PATH may well be
// WSL (uname -> Linux), which would run the updater in a different filesystem
// namespace and make path fixtures meaningless.
function resolveGitBash() {
  const candidates = [
    "C:/Program Files/Git/bin/bash.exe",
    "C:/Program Files/Git/usr/bin/bash.exe",
    "C:/Program Files (x86)/Git/bin/bash.exe",
    "bash",
  ];
  for (const c of candidates) {
    if (c !== "bash" && !existsSync(c)) continue;
    try {
      const r = spawnSync(c, ["-c", "uname -s"], { encoding: "utf8", timeout: 20000 });
      if (r.status === 0 && /^(MINGW|MSYS|CYGWIN)/.test((r.stdout || "").trim())) {
        return c;
      }
    } catch { /* try next */ }
  }
  return null;
}

let cachedEnv = null;
export function detectEnv() {
  if (cachedEnv) return cachedEnv;
  const pwsh = canRun("pwsh", ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.Major"]) ? "pwsh" : null;
  if (!pwsh) {
    throw new Error("pwsh (PowerShell 7+) not found on PATH — required to run update-vault.ps1.");
  }
  const bash = resolveGitBash();
  if (!bash) {
    throw new Error(
      "Git Bash not found (a non-WSL bash whose `uname` is MINGW/MSYS). " +
      "The parity harness must not run the bash updater under WSL — install Git for Windows."
    );
  }
  const powershell51 = process.platform === "win32" &&
    canRun("powershell.exe", ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.Major"])
    ? "powershell.exe" : null;
  cachedEnv = { pwsh, bash, powershell51 };
  return cachedEnv;
}

// The list of PowerShell/bash implementations to run a scenario under. pwsh and
// bash always; powershell.exe (5.1) additionally when available.
export function implementations() {
  const env = detectEnv();
  const impls = [
    { name: "pwsh", kind: "ps", exe: env.pwsh },
    { name: "bash", kind: "bash", exe: env.bash },
  ];
  if (env.powershell51) {
    impls.push({ name: "powershell.exe (5.1)", kind: "ps", exe: env.powershell51 });
  }
  return impls;
}

// ---------------------------------------------------------------------------
// SHA-256 + the store-only zip writer.
//
// There is no `zip` on the dev machine and Compress-Archive on Windows
// PowerShell 5.1 has a well-known interop bug (it can store backslash path
// separators that `unzip` then treats as literal filename characters). A tiny
// store-only (compression method 0) writer sidesteps both: it is dependency
// free and guarantees forward-slash entry names that BOTH Expand-Archive and
// `unzip` read identically (proven before this shipped).
// ---------------------------------------------------------------------------

export function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// entries: [{ name: "wrapped/forward/slash/path", data: Buffer }]
export function makeZip(entries) {
  const local = [];
  const central = [];
  let offset = 0;
  const DOSTIME = 0, DOSDATE = 0x21; // 1980-01-01, deterministic
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(0, 8);            // method 0 = store
    lh.writeUInt16LE(DOSTIME, 10);
    lh.writeUInt16LE(DOSDATE, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(e.data.length, 18);
    lh.writeUInt32LE(e.data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    local.push(lh, name, e.data);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);           // method 0 = store
    cd.writeUInt16LE(DOSTIME, 12);
    cd.writeUInt16LE(DOSDATE, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(e.data.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);
    offset += lh.length + name.length + e.data.length;
  }
  const cdStart = offset;
  const cdSize = central.reduce((n, b) => n + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  return Buffer.concat([...local, ...central, eocd]);
}

// ---------------------------------------------------------------------------
// Manifest emission — byte-format identical to generate-manifest.ps1: one file
// entry per line, fixed key order (path, sha256, class), entries sorted ordinal
// by path, LF endings + trailing newline. update-vault.sh parses this with sed
// (no jq), so the format is a load-bearing contract; the harness's fixtures must
// honor it exactly. (The REAL generator is contract-tested separately against
// the REAL bash parser — see the manifest-format-contract scenario.)
//
//   files: [{ path, class, content: Buffer|string }]
// ---------------------------------------------------------------------------

export function buildManifest(version, files) {
  const entries = files
    .map((f) => ({
      path: f.path,
      sha256: sha256(Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content)),
      class: f.class,
    }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const lines = [
    "{",
    '  "name": "shadowvault",',
    '  "repo": "tenebrishv/shadowvault-setup",',
    `  "version": "${version}",`,
    '  "generated": "2020-01-01T00:00:00Z",',
    '  "files": [',
  ];
  entries.forEach((e, i) => {
    const comma = i === entries.length - 1 ? "" : ",";
    lines.push(`    { "path": "${e.path}", "sha256": "${e.sha256}", "class": "${e.class}" }${comma}`);
  });
  lines.push("  ]", "}");
  return { json: lines.join("\n") + "\n", entries };
}

// ---------------------------------------------------------------------------
// Fixture builders (OS temp dir only — never the repo tree).
// ---------------------------------------------------------------------------

export function makeScratch(prefix = "sv-parity-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeFileDeep(fullPath, content) {
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

// Writes an INSTALLED vault: every file at its pristine content plus a
// framework-manifest.json recording those pristine hashes. User modifications
// are applied AFTER this (via editFile) so the updater sees disk-hash != the
// manifest hash and treats them as user-modified.
export function buildVault(dir, version, files) {
  for (const f of files) {
    writeFileDeep(join(dir, f.path), f.content);
  }
  const { json } = buildManifest(version, files);
  writeFileSync(join(dir, MANIFEST_NAME), json);
}

// An empty vault dir (bootstrap fixture): no manifest, no files.
export function buildEmptyVault(dir) {
  mkdirSync(dir, { recursive: true });
}

export function editFile(dir, relPath, content) {
  writeFileDeep(join(dir, relPath), content);
}

// Builds a local release zip in `scratch` mimicking a GitHub source zipball:
// a single wrapped top-level dir (shadowvault-setup-<version>/) containing the
// framework files plus a manifest. Returns the zip path.
export function buildReleaseZip(scratch, version, files) {
  const wrap = `shadowvault-setup-${version}/`;
  const { json } = buildManifest(version, files);
  const entries = files.map((f) => ({
    name: wrap + f.path,
    data: Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content),
  }));
  entries.push({ name: wrap + MANIFEST_NAME, data: Buffer.from(json) });
  const zipPath = join(scratch, `release-${version}-${Math.random().toString(36).slice(2, 8)}.zip`);
  writeFileSync(zipPath, makeZip(entries));
  return zipPath;
}

// ---------------------------------------------------------------------------
// Running an updater through its CLI. Same logical options, two flag dialects.
// Always passes the "skip confirmation" flag for real runs so no stdin is
// needed; dry-run doesn't prompt.
// ---------------------------------------------------------------------------

export function runUpdater(impl, { vault, zip, dryRun = false, force = false }) {
  let exe, args;
  if (impl.kind === "ps") {
    exe = impl.exe;
    args = ["-NoProfile", "-NonInteractive", "-File", toWin(PS1),
            "-VaultPath", toWin(vault), "-ZipPath", toWin(zip), "-Yes"];
    if (dryRun) args.push("-DryRun");
    if (force) args.push("-Force");
  } else {
    exe = impl.exe;
    args = [toBash(SH), "--vault-path", toBash(vault), "--zip-path", toBash(zip), "--yes"];
    if (dryRun) args.push("--dry-run");
    if (force) args.push("--force");
  }
  const r = spawnSync(exe, args, { encoding: "utf8", timeout: 120000 });
  return {
    status: r.status,
    stdout: (r.stdout || "").replace(/\r\n/g, "\n"),
    stderr: (r.stderr || "").replace(/\r\n/g, "\n"),
  };
}

// ---------------------------------------------------------------------------
// Snapshotting an outcome. Everything the two implementations must agree on is
// captured here, with platform-specific noise normalized once (per issue #14
// story 7): path separators, line endings, the backup dir's timestamp, and the
// absolute paths / date in the report.
// ---------------------------------------------------------------------------

function walkFiles(root, prefix = "") {
  const out = [];
  for (const name of readdirSync(join(root, prefix))) {
    const rel = prefix ? prefix + "/" + name : name;
    const st = statSync(join(root, rel));
    if (st.isDirectory()) out.push(...walkFiles(root, rel));
    else out.push(rel);
  }
  return out;
}

// Collapse the "v<version>-<YYYYMMDD-HHMMSS>" backup dir component to a stable
// token so two runs seconds apart compare equal.
function normalizeBackupRel(rel) {
  return rel.replace(
    /^(99 - Meta\/05 - Backups\/v[0-9.]+)-\d{8}-\d{6}\//,
    "$1-TS/"
  );
}

// Normalize a report body to just the meaningful content: strip the date, the
// absolute backups path, and sort the file list within each "## Section" block
// (the two updaters emit sections in different member orders — PS sorts
// culture-aware, bash sorts in its locale — which is cosmetic, not behavioral).
export function normalizeReport(text) {
  if (text == null) return null;
  const lines = text.replace(/\r\n/g, "\n").split("\n").map((l) => l.replace(/\s+$/, ""));
  const out = [];
  let sectionItems = null;
  const flush = () => {
    if (sectionItems) {
      sectionItems.sort();
      out.push(...sectionItems);
      sectionItems = null;
    }
  };
  for (const line of lines) {
    if (/^- \*\*Date:\*\* /.test(line)) { flush(); out.push("- **Date:** <DATE>"); continue; }
    if (/^Backups for this update: /.test(line)) { flush(); out.push("Backups for this update: <DIR>"); continue; }
    if (/^## /.test(line)) { flush(); out.push(line); sectionItems = []; continue; }
    if (sectionItems && /^- `/.test(line)) { sectionItems.push(line); continue; }
    flush();
    out.push(line);
  }
  flush();
  return out.join("\n").replace(/\n+$/, "");
}

// Pull the report block out of stdout (present for real/dry runs; absent for
// "already up to date" / aborted runs, where this returns null).
export function extractReport(stdout) {
  const lines = stdout.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((l) => l.startsWith("# ShadowVault update report"));
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i >= start && /^Unchanged: \d+ files/.test(l));
  if (end === -1) return null;
  // Include an optional trailing "Backups for this update:" line.
  if (lines[end + 2] && lines[end + 2].startsWith("Backups for this update:")) end += 2;
  return lines.slice(start, end + 1).join("\n");
}

// The full outcome of a run: the vault tree (framework files, hashed), the
// backup tree (timestamp normalized), the config stash, the written report, and
// the installed manifest version — everything the two updaters must match on.
export function snapshotVault(dir, stdout) {
  const tree = {};
  const backups = {};
  let writtenReport = null;
  for (const rel of walkFiles(dir)) {
    if (rel.startsWith(BACKUP_ROOT + "/")) {
      const nrel = normalizeBackupRel(rel);
      if (nrel.endsWith("/update-report.md")) {
        writtenReport = normalizeReport(readFileSync(join(dir, rel), "utf8"));
      } else {
        backups[nrel] = sha256(readFileSync(join(dir, rel)));
      }
    } else {
      tree[rel] = sha256(readFileSync(join(dir, rel)));
    }
  }
  let manifestVersion = null;
  const mpath = join(dir, MANIFEST_NAME);
  if (existsSync(mpath)) {
    const m = readFileSync(mpath, "utf8").match(/"version":\s*"([^"]+)"/);
    if (m) manifestVersion = m[1];
  }
  return {
    tree,
    backups,
    stashedConfig: Object.keys(backups).filter((k) => k.includes("/_new-config/")).sort(),
    writtenReport,
    reportedBlock: normalizeReport(extractReport(stdout)),
    manifestVersion,
  };
}

export function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}
