# Updating the Vault

This guide covers how to pull in new ShadowVault framework releases — new templates, scripts, docs, dashboards — without touching your notes.

README: [README](../../README.md)

---

## Why this exists

ShadowVault ships as a git repo, but most users aren't comfortable resolving merge conflicts between "framework" files (templates, scripts, docs) and their own vault content living in the same repo. The updater scripts solve this: they know exactly which files belong to the framework (via `framework-manifest.json`, a versioned list of file paths + SHA-256 hashes at the vault root) and touch **only** those. Your Inbox, Permanent Notes, Daily Notes, MOCs — anything not on that list — are never read, modified, or deleted.

---

## TL;DR

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy Bypass -File "99 - Meta/04 - Tooling/update-vault.ps1"
```

**macOS/Linux (bash):**

```bash
bash "99 - Meta/04 - Tooling/update-vault.sh"
```

Close Obsidian first — the script can't tell whether it's running, so it always reminds you and asks for confirmation before writing anything.

The script checks GitHub for the latest release, compares it against your installed manifest, and prints "Already up to date" if there's nothing to do.

---

## Checking what would change first

Run with the dry-run flag to preview the update without writing anything:

```powershell
powershell -ExecutionPolicy Bypass -File "99 - Meta/04 - Tooling/update-vault.ps1" -DryRun
```

```bash
bash "99 - Meta/04 - Tooling/update-vault.sh" --dry-run
```

This prints the same Added / Updated / Backed up / Kept your local version / Deleted report you'd get from a real run, so you can review it before committing to anything.

Other flags (same on both platforms, just different casing):

| PowerShell | bash | Purpose |
|---|---|---|
| `-DryRun` | `--dry-run` | Preview only, no changes written |
| `-Force` | `--force` | Apply even if not newer than installed version |
| `-Yes` | `--yes` | Skip the "close Obsidian" confirmation prompt |
| `-VaultPath <dir>` | `--vault-path <dir>` | Vault root, if not run from inside the vault |
| `-ZipPath <file>` | `--zip-path <file>` | Use a local release zip instead of downloading from GitHub |

---

## What gets updated vs. what's never touched

Every file in the release is classified by `framework-manifest.json` into one of two classes, plus "not in the manifest at all" (your notes):

- **Core files** — templates, Templater scripts, docs, dashboards. If you never touched one, it's silently updated. If you *did* modify it (say, tweaked a template), your version is backed up first, then overwritten with the new release version.
- **Config files** — `.obsidian` settings you're expected to personalize (`app`, `appearance`, `hotkeys`, `community-plugins`, `core-plugins`, `templates` `.json` files, CSS snippets, plugin `data.json` files). If you modified one, **your version is kept** — the script won't clobber your hotkeys or plugin settings. The new framework version is saved into the backup folder under `_new-config/` so you can diff and merge manually if you want the new defaults.
- **Anything not in the manifest** — your notes, attachments, everything under `00 - Inbox/` through `09 - Entities/` that isn't a framework dashboard — is never read, modified, or deleted.
- **Files the framework removed** in a later release are deleted from your vault (backed up first if you'd modified them).

---

## Where backups go, and how to restore

Every run that changes or removes a file writes backups to:

```
99 - Meta/05 - Backups/v<version>-<timestamp>/
```

mirroring the vault's folder structure. A `update-report.md` is written into that same folder (and printed to the console) listing everything Added / Updated / Backed up / Kept your local version / Deleted.

**To undo an unwanted overwrite:** find the file in the backup folder and copy it back to its original location in the vault.

---

## First run on an older install (bootstrap)

If your vault was installed before this update system existed, there's no installed `framework-manifest.json` yet. On that first run, the script can't tell which framework files you've customized, so it plays it safe: **every framework file that differs from the release gets backed up before being replaced.** If you're updating a pre-2.3.0 install, expect a larger-than-usual backup folder on that first run — this is normal and only happens once.

---

## Updating via git

If you installed by cloning the repo and are comfortable resolving conflicts yourself, `git pull` remains a valid alternative to the update script. It doesn't understand the core/config split described above, so any local edits to framework files may produce merge conflicts you'll need to resolve by hand.

---

## Troubleshooting

- **"Already up to date" but you expected changes** — you're on the latest release; check the [CHANGELOG](../../CHANGELOG.md) to confirm what version you're comparing against.
- **"No framework-manifest.json in the release zip"** — the *release being installed* predates the manifest system (≤2.2.0); this mostly happens when pointing `-ZipPath`/`--zip-path` at an old zip. Releases from 2.3.0 onward always ship a manifest. (An old *installed* vault is fine — see the bootstrap section above.)
- **GitHub API rate limit hit** — the script queries the GitHub API to find the latest release; unauthenticated requests are rate-limited per hour. Either wait about an hour and retry, or download the release zip yourself from GitHub and point the script at it with `-ZipPath <file>` / `--zip-path <file>` to skip the API call entirely.
- **Confirmation prompt every run** — the reminder to close Obsidian appears on every real run (the script can't detect Obsidian itself). Pass `-Yes` / `--yes` to skip it once you know the drill.

---

*Dev note: releases are cut with `99 - Meta/04 - Tooling/generate-manifest.ps1`, which regenerates `framework-manifest.json` before packaging a zip. End users don't need to run this.*

*Dev note: the updater is implemented twice by hand — `update-vault.ps1` (PowerShell) and `update-vault.sh` (bash) — and the two must stay behaviorally identical. [ADR 0002](../../docs/adr/0002-two-updater-implementations.md) records why both exist (a distributed framework can't assume pwsh on adopters' macOS/Linux machines); read it before proposing to collapse them. The parity harness (`updaterParity.test.mjs`, run via the `updater-test` skill) proves they agree across the full scenario matrix, so any behavioral drift between the two fails a test rather than shipping silently.*
