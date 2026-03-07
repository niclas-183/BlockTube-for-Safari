#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_ICON="${1:-$BASE_DIR/assets/icons/128.png}"
PROJECT_DIR="${2:-$BASE_DIR/platform/safari/xcode/BlockTube for Safari/BlockTube for Safari}"
APP_ICONSET_DIR="$PROJECT_DIR/Assets.xcassets/AppIcon.appiconset"
LARGE_ICONSET_DIR="$PROJECT_DIR/Assets.xcassets/LargeIcon.imageset"

if [[ ! -f "$SOURCE_ICON" ]]; then
  echo "Source icon not found: $SOURCE_ICON" >&2
  exit 1
fi

generate_png() {
  local size="$1"
  local destination="$2"
  sips -z "$size" "$size" "$SOURCE_ICON" --out "$destination" >/dev/null
}

generate_png 16 "$APP_ICONSET_DIR/mac-icon-16@1x.png"
generate_png 32 "$APP_ICONSET_DIR/mac-icon-16@2x.png"
generate_png 32 "$APP_ICONSET_DIR/mac-icon-32@1x.png"
generate_png 64 "$APP_ICONSET_DIR/mac-icon-32@2x.png"
generate_png 128 "$APP_ICONSET_DIR/mac-icon-128@1x.png"
generate_png 256 "$APP_ICONSET_DIR/mac-icon-128@2x.png"
generate_png 256 "$APP_ICONSET_DIR/mac-icon-256@1x.png"
generate_png 512 "$APP_ICONSET_DIR/mac-icon-256@2x.png"
generate_png 512 "$APP_ICONSET_DIR/mac-icon-512@1x.png"
generate_png 1024 "$APP_ICONSET_DIR/mac-icon-512@2x.png"

generate_png 128 "$LARGE_ICONSET_DIR/large-icon.png"
generate_png 256 "$LARGE_ICONSET_DIR/large-icon@2x.png"
generate_png 384 "$LARGE_ICONSET_DIR/large-icon@3x.png"
generate_png 128 "$PROJECT_DIR/Resources/Icon.png"
