<#
.SYNOPSIS
Updates this ShadowVault vault to the latest framework release from GitHub,
touching ONLY the framework-owned files listed in framework-manifest.json —
never your notes.

.DESCRIPTION
Close Obsidian before running. How each file is handled:

  core files    unmodified → overwritten with the new version.
                modified by you → backed up to "99 - Meta/05 - Backups/", then overwritten.
  config files  (.obsidian settings) modified by you → kept as-is; the new
                framework version is saved beside the backups for manual diffing.
  deletions     files the framework removed are deleted (backed up first if you
                had modified them).

Full documentation: 99 - Meta/01 - Documentation/UPDATING.md

.EXAMPLE
powershell -File "99 - Meta/04 - Tooling/update-vault.ps1"
Check GitHub for a newer release and apply it.

.EXAMPLE
powershell -File "99 - Meta/04 - Tooling/update-vault.ps1" -DryRun
Show what would change without touching anything.
#>
[CmdletBinding()]
param(
    # Show what would happen without writing anything.
    [switch]$DryRun,
    # Use a local release zip instead of querying/downloading from GitHub.
    [string]$ZipPath,
    # Vault root. Defaults to two levels above this script.
    [string]$VaultPath,
    # Apply even if the release version is not newer than the installed one.
    [switch]$Force,
    # Skip the confirmation prompt.
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'
$DefaultRepo = 'tenebrishv/shadowvault-setup'
$ManifestName = 'framework-manifest.json'
$BackupRoot = '99 - Meta/05 - Backups'
$ToolingPrefix = '99 - Meta/04 - Tooling/'

if (-not $VaultPath) {
    $VaultPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}
$VaultPath = (Resolve-Path -LiteralPath $VaultPath).Path

function To-NativePath([string]$relPath) {
    return Join-Path $VaultPath ($relPath -replace '/', '\')
}

function Get-LocalHash([string]$fullPath) {
    return (Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Assert-SafeRelPath([string]$relPath) {
    if ($relPath -match '^\s*$' -or $relPath -match '\.\.' -or
        $relPath -match '^[/\\]' -or $relPath -match '^[A-Za-z]:') {
        throw "Unsafe path in manifest, refusing: $relPath"
    }
}

function Read-Manifest([string]$jsonPath) {
    $m = Get-Content -LiteralPath $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $m.version -or -not $m.files) { throw "Not a valid manifest: $jsonPath" }
    foreach ($f in $m.files) { Assert-SafeRelPath $f.path }
    return $m
}

# --- Installed state ----------------------------------------------------------
$installedManifestPath = Join-Path $VaultPath $ManifestName
$installed = $null
$installedHashes = @{}
if (Test-Path -LiteralPath $installedManifestPath) {
    $installed = Read-Manifest $installedManifestPath
    foreach ($f in $installed.files) { $installedHashes[$f.path] = $f.sha256 }
    Write-Host "Installed framework version: $($installed.version)"
} else {
    Write-Host 'No framework-manifest.json found - bootstrap mode.' -ForegroundColor Yellow
    Write-Host 'Any existing framework file that differs from the release will be backed up before being replaced.'
}

$repo = $DefaultRepo
if ($installed -and $installed.repo) { $repo = $installed.repo }

# --- Obtain the release zip ----------------------------------------------------
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("shadowvault-update-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    if ($ZipPath) {
        $zipFile = (Resolve-Path -LiteralPath $ZipPath).Path
        Write-Host "Using local zip: $zipFile"
    } else {
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        Write-Host "Checking latest release of $repo ..."
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" `
            -Headers @{ 'User-Agent' = 'shadowvault-updater'; 'Accept' = 'application/vnd.github+json' } -UseBasicParsing
        $tag = $release.tag_name
        $remoteVersion = $tag -replace '^v', ''
        Write-Host "Latest release: $tag"
        if ($installed -and -not $Force) {
            if ([System.Version]$remoteVersion -le [System.Version]$installed.version) {
                Write-Host "Already up to date (installed $($installed.version) >= latest $remoteVersion). Use -Force to reapply." -ForegroundColor Green
                return
            }
        }
        $zipFile = Join-Path $tempDir 'release.zip'
        $zipUrl = "https://github.com/$repo/archive/refs/tags/$tag.zip"
        Write-Host "Downloading $zipUrl ..."
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -Headers @{ 'User-Agent' = 'shadowvault-updater' } -UseBasicParsing
    }

    # --- Extract and read the new manifest -------------------------------------
    $extractDir = Join-Path $tempDir 'extracted'
    Expand-Archive -LiteralPath $zipFile -DestinationPath $extractDir
    # GitHub source zips wrap everything in a "repo-tag/" top-level folder;
    # accept both wrapped and bare layouts.
    $srcRoot = $extractDir
    if (-not (Test-Path -LiteralPath (Join-Path $srcRoot $ManifestName))) {
        $topDirs = @(Get-ChildItem -LiteralPath $extractDir -Directory)
        if ($topDirs.Count -eq 1 -and (Test-Path -LiteralPath (Join-Path $topDirs[0].FullName $ManifestName))) {
            $srcRoot = $topDirs[0].FullName
        } else {
            throw "No $ManifestName in the release zip - this release predates the update system; see UPDATING.md for manual update steps."
        }
    }
    $new = Read-Manifest (Join-Path $srcRoot $ManifestName)
    Write-Host "Release framework version: $($new.version)  ($(@($new.files).Count) framework files)"

    if ($installed -and -not $Force) {
        if ([System.Version]$new.version -le [System.Version]$installed.version) {
            Write-Host "Already up to date (installed $($installed.version) >= release $($new.version)). Use -Force to reapply." -ForegroundColor Green
            return
        }
    }

    if (-not $DryRun -and -not $Yes) {
        Write-Host ''
        Write-Host 'Close Obsidian before continuing - updating files while the vault is open can confuse plugins.' -ForegroundColor Yellow
        $answer = Read-Host "Update vault at `"$VaultPath`" to $($new.version)? [y/N]"
        if ($answer -notmatch '^[Yy]') { Write-Host 'Aborted.'; return }
    }

    # --- Apply the changes --------------------------------------------------------
    # Process tooling scripts (this script included) last, so a failure mid-run
    # can't leave a half-updated updater; the manifest itself is written very last.
    $newFiles = @($new.files | Sort-Object @{ Expression = { $_.path -like "$ToolingPrefix*" } }, path)

    $added = @(); $updated = @(); $backedUp = @(); $keptLocal = @(); $deleted = @(); $unchanged = @()
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupDir = To-NativePath "$BackupRoot/v$($new.version)-$timestamp"

    function Backup-File([string]$relPath, [string]$subDir) {
        $dest = Join-Path $backupDir ($subDir + ($relPath -replace '/', '\'))
        if (-not $DryRun) {
            New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
            Copy-Item -LiteralPath (To-NativePath $relPath) -Destination $dest
        }
    }

    function Install-File([string]$relPath) {
        if (-not $DryRun) {
            $src = Join-Path $srcRoot ($relPath -replace '/', '\')
            $dest = To-NativePath $relPath
            New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
            Copy-Item -LiteralPath $src -Destination $dest -Force
        }
    }

    foreach ($f in $newFiles) {
        $rel = $f.path
        $srcFile = Join-Path $srcRoot ($rel -replace '/', '\')
        if (-not (Test-Path -LiteralPath $srcFile -PathType Leaf)) {
            Write-Warning "Listed in release manifest but missing from zip, skipped: $rel"
            continue
        }
        $localFile = To-NativePath $rel
        if (-not (Test-Path -LiteralPath $localFile -PathType Leaf)) {
            Install-File $rel
            $added += $rel
            continue
        }
        $localHash = Get-LocalHash $localFile
        if ($localHash -eq $f.sha256) {
            $unchanged += $rel
            continue
        }
        $userModified = $true
        if ($installedHashes.ContainsKey($rel) -and $installedHashes[$rel] -eq $localHash) {
            $userModified = $false
        }
        if (-not $userModified) {
            Install-File $rel
            $updated += $rel
        } elseif ($f.class -eq 'config') {
            # Your settings win; stash the new framework version for manual diffing.
            $dest = Join-Path $backupDir ('_new-config\' + ($rel -replace '/', '\'))
            if (-not $DryRun) {
                New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
                Copy-Item -LiteralPath $srcFile -Destination $dest
            }
            $keptLocal += $rel
        } else {
            Backup-File $rel ''
            Install-File $rel
            $updated += $rel
            $backedUp += $rel
        }
    }

    # Framework deletions: in the installed manifest, absent from the new one.
    if ($installed) {
        $newPaths = @{}
        foreach ($f in $new.files) { $newPaths[$f.path] = $true }
        foreach ($f in $installed.files) {
            $rel = $f.path
            if ($newPaths.ContainsKey($rel)) { continue }
            $localFile = To-NativePath $rel
            if (-not (Test-Path -LiteralPath $localFile -PathType Leaf)) { continue }
            if ((Get-LocalHash $localFile) -ne $f.sha256) {
                Backup-File $rel ''
            }
            if (-not $DryRun) { Remove-Item -LiteralPath $localFile }
            $deleted += $rel
        }
    }

    # --- Finalize: install the new manifest last ---------------------------------
    if (-not $DryRun) {
        Copy-Item -LiteralPath (Join-Path $srcRoot $ManifestName) -Destination $installedManifestPath -Force
    }

    # --- Report -------------------------------------------------------------------
    $reportLines = New-Object System.Collections.Generic.List[string]
    $fromVersion = 'none (bootstrap)'
    if ($installed) { $fromVersion = $installed.version }
    $reportLines.Add("# ShadowVault update report")
    $reportLines.Add('')
    $reportLines.Add("- **From:** $fromVersion")
    $reportLines.Add("- **To:** $($new.version)")
    $reportLines.Add("- **Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
    if ($DryRun) { $reportLines.Add('- **DRY RUN - nothing was changed**') }
    $reportLines.Add('')
    $sections = @(
        @('Added', $added), @('Updated', $updated),
        @('Backed up before overwrite', $backedUp),
        @('Kept your local version (config)', $keptLocal),
        @('Deleted (removed from framework)', $deleted)
    )
    foreach ($s in $sections) {
        $title = $s[0]; $items = $s[1]
        $reportLines.Add("## $title ($(@($items).Count))")
        foreach ($i in $items) { $reportLines.Add("- ``$i``") }
        $reportLines.Add('')
    }
    $reportLines.Add("Unchanged: $(@($unchanged).Count) files")
    if ((Test-Path -LiteralPath $backupDir) -and -not $DryRun) {
        $reportLines.Add('')
        $reportLines.Add("Backups for this update: ``$backupDir``")
        [System.IO.File]::WriteAllText((Join-Path $backupDir 'update-report.md'),
            ($reportLines -join "`n") + "`n", (New-Object System.Text.UTF8Encoding($false)))
    }

    Write-Host ''
    Write-Host ($reportLines -join "`n")
    Write-Host ''
    if ($DryRun) {
        Write-Host 'Dry run - nothing was changed.' -ForegroundColor Yellow
    } else {
        Write-Host "Updated to $($new.version)." -ForegroundColor Green
        if (@($keptLocal).Count -gt 0) {
            Write-Host "Note: $(@($keptLocal).Count) config file(s) kept your local version; new framework versions are in the backup folder under _new-config for manual diffing." -ForegroundColor Yellow
        }
    }
} finally {
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
