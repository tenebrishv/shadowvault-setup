#!/usr/bin/env bash
#
# Updates this ShadowVault vault to the latest framework release from GitHub,
# touching ONLY the framework-owned files listed in framework-manifest.json --
# never your notes.
#
# Close Obsidian before running. How each file is handled:
#
#   core files    unmodified -> overwritten with the new version.
#                 modified by you -> backed up to "99 - Meta/05 - Backups/", then overwritten.
#   config files  (.obsidian settings) modified by you -> kept as-is; the new
#                 framework version is saved beside the backups for manual diffing.
#   deletions     files the framework removed are deleted (backed up first if you
#                 had modified them).
#
# Full documentation: 99 - Meta/01 - Documentation/UPDATING.md
#
# Usage:
#   bash "99 - Meta/04 - Tooling/update-vault.sh"
#       Check GitHub for a newer release and apply it.
#   bash "99 - Meta/04 - Tooling/update-vault.sh" --dry-run
#       Show what would change without touching anything.
#
# Requires: curl, unzip, and sha256sum (Linux) or shasum (macOS).
# Targets bash 3.2 (macOS default) -- no associative arrays, no mapfile.

set -u

DEFAULT_REPO="tenebrishv/shadowvault-setup"
MANIFEST_NAME="framework-manifest.json"
BACKUP_ROOT="99 - Meta/05 - Backups"
TOOLING_PREFIX="99 - Meta/04 - Tooling/"

print_help() {
  cat <<'EOF'
Usage: update-vault.sh [options]

Options:
  --dry-run             Show what would happen without writing anything.
  --zip-path <file>     Use a local release zip instead of querying/downloading from GitHub.
  --vault-path <dir>    Vault root. Defaults to two levels above this script.
  --force               Apply even if the release version is not newer than the installed one.
  --yes                 Skip the confirmation prompt.
  -h, --help            Show this help and exit.
EOF
}

# --- small utilities -----------------------------------------------------------

die() {
  echo "Error: $*" >&2
  exit 1
}

warn() {
  echo "Warning: $*" >&2
}

assert_safe_path() {
  local p="$1"
  case "$p" in
    "") die "Unsafe path in manifest, refusing: (empty)" ;;
    *..*) die "Unsafe path in manifest, refusing: $p" ;;
    /*) die "Unsafe path in manifest, refusing: $p" ;;
    "\\"*) die "Unsafe path in manifest, refusing: $p" ;;
  esac
  case "$p" in
    [A-Za-z]:*) die "Unsafe path in manifest, refusing: $p" ;;
  esac
}

# Extracts path<TAB>sha256<TAB>class for every file entry in a manifest.
manifest_lines() {
  sed -n 's/.*"path": "\(.*\)", *"sha256": "\([^"]*\)", *"class": "\([^"]*\)".*/\1\t\2\t\3/p' "$1"
}

manifest_version() {
  sed -n 's/^[[:space:]]*"version": "\([^"]*\)".*/\1/p' "$1" | head -1
}

manifest_repo() {
  sed -n 's/^[[:space:]]*"repo": "\([^"]*\)".*/\1/p' "$1" | head -1
}

validate_manifest() {
  local file="$1" version relpath
  version=$(manifest_version "$file")
  if [ -z "$version" ]; then
    die "Not a valid manifest: $file"
  fi
  if ! manifest_lines "$file" | grep -q .; then
    die "Not a valid manifest: $file"
  fi
  while IFS=$'\t' read -r relpath _ _; do
    assert_safe_path "$relpath"
  done < <(manifest_lines "$file")
}

# Exact-match lookup of a path's hash in the INSTALLED manifest (raw grep -F,
# no map building -- paths can contain "(" ")" "&" which would confuse regex).
installed_hash_for() {
  local relpath="$1" line
  line=$(grep -F "\"path\": \"$relpath\"," "$INSTALLED_MANIFEST" 2>/dev/null | head -1)
  [ -z "$line" ] && return 1
  printf '%s\n' "$line" | sed -n 's/.*"sha256": "\([^"]*\)".*/\1/p'
}

path_in_new_manifest() {
  grep -qF "\"path\": \"$1\"," "$NEW_MANIFEST_FILE"
}

hash_file() {
  $HASH_CMD -- "$1" | awk '{print tolower($1)}'
}

# a<=b numerically, component by component (not lexical). Exit 0 = true.
version_le() {
  awk -v a="$1" -v b="$2" '
    BEGIN {
      na = split(a, A, ".");
      nb = split(b, B, ".");
      n = (na > nb) ? na : nb;
      for (i = 1; i <= n; i++) {
        x = (i <= na) ? A[i] + 0 : 0;
        y = (i <= nb) ? B[i] + 0 : 0;
        if (x < y) { exit 0 }
        if (x > y) { exit 1 }
      }
      exit 0
    }'
}

install_file() {
  local relpath="$1" src dest
  src="$SRC_ROOT/$relpath"
  dest="$VAULT_PATH/$relpath"
  if [ "$DRY_RUN" -eq 0 ]; then
    mkdir -p -- "$(dirname -- "$dest")"
    cp -- "$src" "$dest"
  fi
}

backup_local_file() {
  local relpath="$1" dest
  dest="$BACKUP_DIR/$relpath"
  if [ "$DRY_RUN" -eq 0 ]; then
    mkdir -p -- "$(dirname -- "$dest")"
    cp -- "$VAULT_PATH/$relpath" "$dest"
  fi
}

stash_new_config() {
  local relpath="$1" dest
  dest="$BACKUP_DIR/_new-config/$relpath"
  if [ "$DRY_RUN" -eq 0 ]; then
    mkdir -p -- "$(dirname -- "$dest")"
    cp -- "$SRC_ROOT/$relpath" "$dest"
  fi
}

print_section() {
  local title="$1" list="$2" count item
  count=$(printf '%s' "$list" | grep -c '.')
  REPORT="${REPORT}## ${title} (${count})"$'\n'
  if [ -n "$list" ]; then
    while IFS= read -r item; do
      [ -n "$item" ] && REPORT="${REPORT}- \`${item}\`"$'\n'
    done <<EOF2
$list
EOF2
  fi
  REPORT="${REPORT}"$'\n'
}

main() {
  local DRY_RUN=0 ZIP_PATH="" VAULT_PATH="" FORCE=0 YES=0

  # --- arg parsing ------------------------------------------------------------
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --dry-run) DRY_RUN=1; shift ;;
      --zip-path)
        [ "$#" -lt 2 ] && die "--zip-path requires a value"
        ZIP_PATH="$2"; shift 2 ;;
      --vault-path)
        [ "$#" -lt 2 ] && die "--vault-path requires a value"
        VAULT_PATH="$2"; shift 2 ;;
      --force) FORCE=1; shift ;;
      --yes) YES=1; shift ;;
      -h|--help) print_help; return 0 ;;
      *) echo "Unknown argument: $1" >&2; print_help >&2; return 1 ;;
    esac
  done

  # --- dependency detection ----------------------------------------------------
  if command -v sha256sum >/dev/null 2>&1; then
    HASH_CMD="sha256sum"
  elif command -v shasum >/dev/null 2>&1; then
    HASH_CMD="shasum -a 256"
  else
    die "Need either sha256sum or shasum (-a 256) on PATH."
  fi
  command -v curl >/dev/null 2>&1 || die "curl is required."
  command -v unzip >/dev/null 2>&1 || die "unzip is required."

  # --- vault path ---------------------------------------------------------------
  if [ -z "$VAULT_PATH" ]; then
    VAULT_PATH=$(cd "$(dirname "$0")/../.." && pwd) || die "cannot resolve default vault path"
  else
    local resolved_vault_path
    resolved_vault_path=$(cd "$VAULT_PATH" 2>/dev/null && pwd) || die "vault path not found: $VAULT_PATH"
    VAULT_PATH="$resolved_vault_path"
  fi

  INSTALLED_MANIFEST="$VAULT_PATH/$MANIFEST_NAME"

  # --- installed state -----------------------------------------------------------
  local installed_version="" installed_repo=""
  if [ -f "$INSTALLED_MANIFEST" ]; then
    validate_manifest "$INSTALLED_MANIFEST"
    installed_version=$(manifest_version "$INSTALLED_MANIFEST")
    installed_repo=$(manifest_repo "$INSTALLED_MANIFEST")
    echo "Installed framework version: $installed_version"
  else
    echo "No framework-manifest.json found - bootstrap mode."
    echo "Any existing framework file that differs from the release will be backed up before being replaced."
  fi

  local repo="$DEFAULT_REPO"
  [ -n "$installed_version" ] && [ -n "$installed_repo" ] && repo="$installed_repo"

  # --- temp workspace -------------------------------------------------------------
  # Not `local`: the EXIT trap fires after main() returns, once this local
  # scope would already be gone, so it needs a global to still see it.
  TMPDIR_WORK=$(mktemp -d) || die "mktemp failed"
  trap 'rm -rf "$TMPDIR_WORK"' EXIT

  # --- obtain the release zip ------------------------------------------------------
  local zip_file=""
  if [ -n "$ZIP_PATH" ]; then
    [ -f "$ZIP_PATH" ] || die "zip file not found: $ZIP_PATH"
    local zip_dir
    zip_dir=$(cd "$(dirname "$ZIP_PATH")" && pwd) || die "cannot resolve zip path: $ZIP_PATH"
    zip_file="$zip_dir/$(basename "$ZIP_PATH")"
    echo "Using local zip: $zip_file"
  else
    echo "Checking latest release of $repo ..."
    local api_response tag remote_version
    api_response=$(curl -fsSL -H "User-Agent: shadowvault-updater" -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/$repo/releases/latest") || die "failed to query latest release for $repo"
    tag=$(printf '%s' "$api_response" | grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
    [ -z "$tag" ] && die "could not determine latest release tag from GitHub API response"
    remote_version="${tag#v}"
    echo "Latest release: $tag"
    if [ -n "$installed_version" ] && [ "$FORCE" -eq 0 ]; then
      if version_le "$remote_version" "$installed_version"; then
        echo "Already up to date (installed $installed_version >= latest $remote_version). Use --force to reapply."
        return 0
      fi
    fi
    zip_file="$TMPDIR_WORK/release.zip"
    local zip_url="https://github.com/$repo/archive/refs/tags/$tag.zip"
    echo "Downloading $zip_url ..."
    curl -fsSL -H "User-Agent: shadowvault-updater" -o "$zip_file" "$zip_url" || die "failed to download $zip_url"
  fi

  # --- extract and read the new manifest ---------------------------------------
  local extract_dir="$TMPDIR_WORK/extracted"
  mkdir -p "$extract_dir"
  unzip -q "$zip_file" -d "$extract_dir" || die "failed to extract $zip_file"

  # GitHub source zips wrap everything in a "repo-tag/" top-level folder;
  # accept both wrapped and bare layouts.
  SRC_ROOT="$extract_dir"
  if [ ! -f "$SRC_ROOT/$MANIFEST_NAME" ]; then
    local ndirs onlydir
    ndirs=$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
    if [ "$ndirs" -eq 1 ]; then
      onlydir=$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d)
      [ -f "$onlydir/$MANIFEST_NAME" ] && SRC_ROOT="$onlydir"
    fi
  fi
  if [ ! -f "$SRC_ROOT/$MANIFEST_NAME" ]; then
    die "No $MANIFEST_NAME in the release zip - this release predates the update system; see UPDATING.md for manual update steps."
  fi

  NEW_MANIFEST_FILE="$SRC_ROOT/$MANIFEST_NAME"
  validate_manifest "$NEW_MANIFEST_FILE"
  local new_version new_file_count
  new_version=$(manifest_version "$NEW_MANIFEST_FILE")
  new_file_count=$(manifest_lines "$NEW_MANIFEST_FILE" | grep -c '.')
  echo "Release framework version: $new_version  ($new_file_count framework files)"

  if [ -n "$installed_version" ] && [ "$FORCE" -eq 0 ]; then
    if version_le "$new_version" "$installed_version"; then
      echo "Already up to date (installed $installed_version >= release $new_version). Use --force to reapply."
      return 0
    fi
  fi

  if [ "$DRY_RUN" -eq 0 ] && [ "$YES" -eq 0 ]; then
    echo ""
    echo "Close Obsidian before continuing - updating files while the vault is open can confuse plugins."
    local answer=""
    read -r -p "Update vault at \"$VAULT_PATH\" to ${new_version}? [y/N] " answer
    case "$answer" in
      [Yy]*) ;;
      *) echo "Aborted."; return 0 ;;
    esac
  fi

  # --- apply the changes ------------------------------------------------------------
  # Process tooling scripts (this script included) last, so a failure mid-run
  # can't leave a half-updated updater; the manifest itself is written very last.
  local timestamp
  timestamp=$(date +%Y%m%d-%H%M%S)
  BACKUP_DIR="$VAULT_PATH/$BACKUP_ROOT/v${new_version}-${timestamp}"

  local ADDED="" UPDATED="" BACKEDUP="" KEPTLOCAL="" DELETED="" UNCHANGED_COUNT=0

  local NEW_SORTED="$TMPDIR_WORK/new_sorted.tsv"
  : > "$NEW_SORTED"
  while IFS=$'\t' read -r p h c; do
    case "$p" in
      "$TOOLING_PREFIX"*) printf '1\t%s\t%s\t%s\n' "$p" "$h" "$c" ;;
      *) printf '0\t%s\t%s\t%s\n' "$p" "$h" "$c" ;;
    esac
  done < <(manifest_lines "$NEW_MANIFEST_FILE") | sort -t $'\t' -k1,1n -k2,2 > "$NEW_SORTED"

  local relpath newhash newclass sortkey srcfile localfile localhash insthash user_modified
  while IFS=$'\t' read -r sortkey relpath newhash newclass; do
    srcfile="$SRC_ROOT/$relpath"
    if [ ! -f "$srcfile" ]; then
      warn "Listed in release manifest but missing from zip, skipped: $relpath"
      continue
    fi
    localfile="$VAULT_PATH/$relpath"
    if [ ! -f "$localfile" ]; then
      install_file "$relpath"
      ADDED="${ADDED}${relpath}"$'\n'
      continue
    fi
    localhash=$(hash_file "$localfile")
    if [ "$localhash" = "$newhash" ]; then
      UNCHANGED_COUNT=$((UNCHANGED_COUNT + 1))
      continue
    fi
    user_modified=1
    if [ -n "$installed_version" ]; then
      insthash=$(installed_hash_for "$relpath") || insthash=""
      if [ -n "$insthash" ] && [ "$insthash" = "$localhash" ]; then
        user_modified=0
      fi
    fi
    if [ "$user_modified" -eq 0 ]; then
      install_file "$relpath"
      UPDATED="${UPDATED}${relpath}"$'\n'
    elif [ "$newclass" = "config" ]; then
      # Your settings win; stash the new framework version for manual diffing.
      stash_new_config "$relpath"
      KEPTLOCAL="${KEPTLOCAL}${relpath}"$'\n'
    else
      backup_local_file "$relpath"
      install_file "$relpath"
      UPDATED="${UPDATED}${relpath}"$'\n'
      BACKEDUP="${BACKEDUP}${relpath}"$'\n'
    fi
  done < "$NEW_SORTED"

  # Framework deletions: in the installed manifest, absent from the new one.
  if [ -n "$installed_version" ]; then
    local oldhash oldclass
    while IFS=$'\t' read -r relpath oldhash oldclass; do
      if path_in_new_manifest "$relpath"; then
        continue
      fi
      localfile="$VAULT_PATH/$relpath"
      if [ ! -f "$localfile" ]; then
        continue
      fi
      localhash=$(hash_file "$localfile")
      if [ "$localhash" != "$oldhash" ]; then
        backup_local_file "$relpath"
      fi
      if [ "$DRY_RUN" -eq 0 ]; then
        rm -f -- "$localfile"
      fi
      DELETED="${DELETED}${relpath}"$'\n'
    done < <(manifest_lines "$INSTALLED_MANIFEST")
  fi

  # --- finalize: install the new manifest last -----------------------------------
  if [ "$DRY_RUN" -eq 0 ]; then
    cp -- "$NEW_MANIFEST_FILE" "$INSTALLED_MANIFEST"
  fi

  # --- report -----------------------------------------------------------------------
  local from_version="none (bootstrap)"
  [ -n "$installed_version" ] && from_version="$installed_version"

  REPORT=""
  REPORT="${REPORT}# ShadowVault update report"$'\n'
  REPORT="${REPORT}"$'\n'
  REPORT="${REPORT}- **From:** ${from_version}"$'\n'
  REPORT="${REPORT}- **To:** ${new_version}"$'\n'
  REPORT="${REPORT}- **Date:** $(date '+%Y-%m-%d %H:%M')"$'\n'
  if [ "$DRY_RUN" -eq 1 ]; then
    REPORT="${REPORT}- **DRY RUN - nothing was changed**"$'\n'
  fi
  REPORT="${REPORT}"$'\n'

  print_section "Added" "$ADDED"
  print_section "Updated" "$UPDATED"
  print_section "Backed up before overwrite" "$BACKEDUP"
  print_section "Kept your local version (config)" "$KEPTLOCAL"
  print_section "Deleted (removed from framework)" "$DELETED"

  REPORT="${REPORT}Unchanged: ${UNCHANGED_COUNT} files"$'\n'

  if [ "$DRY_RUN" -eq 0 ] && [ -d "$BACKUP_DIR" ]; then
    REPORT="${REPORT}"$'\n'
    REPORT="${REPORT}Backups for this update: \`${BACKUP_DIR}\`"$'\n'
    printf '%s' "$REPORT" > "$BACKUP_DIR/update-report.md"
  fi

  printf '\n%s\n\n' "$REPORT"
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "Dry run - nothing was changed."
  else
    echo "Updated to ${new_version}."
    local kept_count
    kept_count=$(printf '%s' "$KEPTLOCAL" | grep -c '.')
    if [ "$kept_count" -gt 0 ]; then
      echo "Note: ${kept_count} config file(s) kept your local version; new framework versions are in the backup folder under _new-config for manual diffing."
    fi
  fi
}

main "$@"
