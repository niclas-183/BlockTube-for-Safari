#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TARGET_PLATFORM="${1:-}"
DEST="${2:-$BASE_DIR/dist/$TARGET_PLATFORM}"
VERSION="${3:-$(cat "$BASE_DIR/VERSION")}"

if [[ -z "$TARGET_PLATFORM" ]]; then
  echo "Usage: $0 <chrome|firefox|firefox_selfhosted|safari> [destination] [version]" >&2
  exit 1
fi

MANIFEST_PATH="$BASE_DIR/platform/$TARGET_PLATFORM/manifest.json"

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "Unknown platform: $TARGET_PLATFORM" >&2
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"

cp -R "$BASE_DIR/src" "$DEST"
cp -R "$BASE_DIR/assets" "$DEST"
cp "$BASE_DIR/LICENSE" "$DEST"
cp "$BASE_DIR/VERSION" "$DEST"
cp "$MANIFEST_PATH" "$DEST/manifest.json"

python3 - "$DEST/manifest.json" "$DEST/src/ui/options.html" "$VERSION" <<'PY'
from pathlib import Path
import sys

manifest_path = Path(sys.argv[1])
options_path = Path(sys.argv[2])
version = sys.argv[3]

for path in (manifest_path, options_path):
    path.write_text(path.read_text().replace("{EXT_VERSION}", version))
PY
