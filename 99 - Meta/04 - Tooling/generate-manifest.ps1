<#
.SYNOPSIS
Generates framework-manifest.json at the vault root — the authoritative list of
framework-owned files (with SHA-256 hashes) that update-vault.ps1/.sh may touch.

.DESCRIPTION
Dev-machine-only tool, run as part of cutting a release (see the release checklist
in 99 - Meta/01 - Documentation/UPDATING.md). The include-list below is the single
source of truth for what counts as "framework" vs user content.

File classes:
  core   — framework machinery; the updater backs up user-modified copies, then overwrites.
  config — user-adjustable settings (.obsidian json/css); the updater never overwrites
           a user-modified copy, it keeps the local file and reports it.

.EXAMPLE
powershell -File "99 - Meta/04 - Tooling/generate-manifest.ps1" -Version 2.3.0
#>
[CmdletBinding()]
param(
    # Version to stamp into the manifest. Defaults to the newest dated
    # "## [X.Y.Z]" heading in CHANGELOG.md.
    [string]$Version,
    # Vault root. Defaults to two levels above this script.
    [string]$VaultPath
)

$ErrorActionPreference = 'Stop'

if (-not $VaultPath) {
    $VaultPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}
$VaultPath = (Resolve-Path -LiteralPath $VaultPath).Path

if (-not $Version) {
    $changelog = Join-Path $VaultPath 'CHANGELOG.md'
    if (-not (Test-Path -LiteralPath $changelog)) {
        throw "No -Version given and CHANGELOG.md not found at $changelog"
    }
    foreach ($line in [System.IO.File]::ReadAllLines($changelog)) {
        if ($line -match '^## \[(\d+\.\d+\.\d+)\]') {
            $Version = $Matches[1]
            break
        }
    }
    if (-not $Version) { throw 'Could not find a "## [X.Y.Z]" heading in CHANGELOG.md' }
}
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    throw "Version must be X.Y.Z (got: $Version)"
}

function Get-RelPath([string]$fullPath) {
    return $fullPath.Substring($VaultPath.Length + 1) -replace '\\', '/'
}

# --- Include-list ------------------------------------------------------------
# $entries: relative path (forward slashes) -> class
$entries = @{}

function Add-Entry([string]$relPath, [string]$class) {
    $full = Join-Path $VaultPath ($relPath -replace '/', '\')
    if (Test-Path -LiteralPath $full -PathType Leaf) {
        $entries[$relPath] = $class
    } else {
        Write-Warning "Include-list path missing on disk, skipped: $relPath"
    }
}

function Add-Tree([string]$relDir, [string]$class, [string[]]$excludePrefixes) {
    $full = Join-Path $VaultPath ($relDir -replace '/', '\')
    if (-not (Test-Path -LiteralPath $full -PathType Container)) {
        Write-Warning "Include-list folder missing on disk, skipped: $relDir"
        return
    }
    Get-ChildItem -LiteralPath $full -Recurse -File -Force | ForEach-Object {
        $rel = Get-RelPath $_.FullName
        foreach ($prefix in $excludePrefixes) {
            if ($rel -like "$prefix*") { return }
        }
        $entries[$rel] = $class
    }
}

# Framework trees (05 - Backups holds per-vault update backups, never shipped)
Add-Tree '99 - Meta' 'core' @('99 - Meta/05 - Backups/')
Add-Tree '08 - Nexus' 'core' @()

# Curated MOC dashboards (the rest of 04 - MOCS is user content)
Add-Entry '04 - MOCS/Home.md' 'core'
Add-Entry '04 - MOCS/Entities.md' 'core'

# Root docs
Add-Entry 'README.md' 'core'
Add-Entry 'CHANGELOG.md' 'core'
Add-Entry 'LICENSE' 'core'

# Folder scaffolding: every .gitkeep in the vault (content folders ship empty)
Get-ChildItem -LiteralPath $VaultPath -Recurse -File -Force -Filter '.gitkeep' |
    Where-Object { $_.FullName -notmatch '\\\.git\\' } |
    ForEach-Object { $entries[(Get-RelPath $_.FullName)] = 'core' }

# .obsidian: explicit whitelist. Plugin code is core; settings are config.
# Never shipped: workspace*.json, graph.json (view state), obsidian-git/data.json
# (device auth/state) — all gitignored for the same reason.
foreach ($name in @('app.json', 'appearance.json', 'community-plugins.json',
                    'core-plugins.json', 'hotkeys.json', 'templates.json')) {
    Add-Entry ".obsidian/$name" 'config'
}
$snippetsDir = Join-Path $VaultPath '.obsidian\snippets'
if (Test-Path -LiteralPath $snippetsDir) {
    Get-ChildItem -LiteralPath $snippetsDir -File -Filter '*.css' |
        ForEach-Object { $entries[(Get-RelPath $_.FullName)] = 'config' }
}
$pluginsDir = Join-Path $VaultPath '.obsidian\plugins'
if (Test-Path -LiteralPath $pluginsDir) {
    Get-ChildItem -LiteralPath $pluginsDir -Directory | ForEach-Object {
        $pluginName = $_.Name
        foreach ($name in @('main.js', 'manifest.json', 'styles.css')) {
            $f = Join-Path $_.FullName $name
            if (Test-Path -LiteralPath $f -PathType Leaf) {
                $entries[".obsidian/plugins/$pluginName/$name"] = 'core'
            }
        }
        if ($pluginName -ne 'obsidian-git') {
            $f = Join-Path $_.FullName 'data.json'
            if (Test-Path -LiteralPath $f -PathType Leaf) {
                $entries[".obsidian/plugins/$pluginName/data.json"] = 'config'
            }
        }
    }
}

# The manifest never lists itself; the updater always replaces it last.
$entries.Remove('framework-manifest.json') | Out-Null

# --- Drift check against git (dev repo only) ---------------------------------
$gitDir = Join-Path $VaultPath '.git'
if ((Test-Path -LiteralPath $gitDir) -and (Get-Command git -ErrorAction SilentlyContinue)) {
    $tracked = @(git -C $VaultPath ls-files)
    # Tracked files intentionally not distributed to vaults:
    $repoOnly = @('.gitignore', '.gitattributes', '.github/')
    foreach ($t in $tracked) {
        if ($entries.ContainsKey($t)) { continue }
        $isRepoOnly = $false
        foreach ($r in $repoOnly) {
            if ($t -eq $r -or $t -like "$r*") { $isRepoOnly = $true; break }
        }
        if (-not $isRepoOnly) {
            Write-Warning "Tracked but NOT in manifest (framework drift?): $t"
        }
    }
    $trackedSet = @{}
    foreach ($t in $tracked) { $trackedSet[$t] = $true }
    foreach ($p in $entries.Keys) {
        if (-not $trackedSet.ContainsKey($p)) {
            Write-Warning "In manifest but NOT tracked by git (commit it before releasing): $p"
        }
    }
}

# --- Hash and write -----------------------------------------------------------
$sorted = $entries.Keys | Sort-Object { $_ } -Culture ''  # ordinal-ish stable sort
$sorted = [string[]]$sorted
[Array]::Sort($sorted, [System.StringComparer]::Ordinal)

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('{')
$lines.Add('  "name": "shadowvault",')
$lines.Add('  "repo": "tenebrishv/shadowvault-setup",')
$lines.Add("  `"version`": `"$Version`",")
$generated = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$lines.Add("  `"generated`": `"$generated`",")
$lines.Add('  "files": [')
for ($i = 0; $i -lt $sorted.Count; $i++) {
    $rel = $sorted[$i]
    $full = Join-Path $VaultPath ($rel -replace '/', '\')
    $hash = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant()
    $comma = ','
    if ($i -eq $sorted.Count - 1) { $comma = '' }
    # One entry per line, fixed key order — update-vault.sh parses this without jq.
    $lines.Add("    { `"path`": `"$rel`", `"sha256`": `"$hash`", `"class`": `"$($entries[$rel])`" }$comma")
}
$lines.Add('  ]')
$lines.Add('}')

$outPath = Join-Path $VaultPath 'framework-manifest.json'
[System.IO.File]::WriteAllText($outPath, ($lines -join "`n") + "`n",
    (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Wrote $outPath"
Write-Host ("  version: {0}   files: {1}  ({2} core, {3} config)" -f $Version, $sorted.Count,
    (@($entries.Values | Where-Object { $_ -eq 'core' })).Count,
    (@($entries.Values | Where-Object { $_ -eq 'config' })).Count)
