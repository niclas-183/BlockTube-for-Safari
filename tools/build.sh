#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BROWSER="${1:-}"
VERSION="${2:-$(cat "$BASE_DIR/VERSION")}"
DEST="$BASE_DIR/dist/$BROWSER"

if [[ -z "$BROWSER" ]]; then
  echo "Usage: $0 <chrome|firefox|firefox_selfhosted> [version]" >&2
  exit 1
fi

case "$BROWSER" in
  chrome|firefox|firefox_selfhosted)
    ;;
  *)
    echo "Unsupported browser: $BROWSER" >&2
    exit 1
    ;;
esac

echo "Building $BROWSER to $DEST"
"$SCRIPT_DIR/stage_extension.sh" "$BROWSER" "$DEST" "$VERSION"

(
  cd "$DEST"
  zip "$DEST/blocktube_${BROWSER}_v${VERSION}.zip" -qr ./*
)
