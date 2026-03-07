#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_PATH="$BASE_DIR/platform/safari/xcode/BlockTube for Safari/BlockTube for Safari.xcodeproj"
SCHEME="BlockTube for Safari"
BUILD_DIR="${BUILD_DIR:-$BASE_DIR/platform/safari/build}"
EXTENSION_RESOURCES_DIR="$BASE_DIR/platform/safari/xcode/BlockTube for Safari/BlockTube for Safari Extension/Resources"
LOCAL_CONFIG="$BASE_DIR/platform/safari/xcode/LocalConfig.xcconfig"

if [[ ! -d "$PROJECT_PATH" ]]; then
  echo "Safari Xcode project not found at $PROJECT_PATH" >&2
  echo "Generate it with safari-web-extension-converter first." >&2
  exit 1
fi

XCCONFIG_ARGS=()
if [[ -f "$LOCAL_CONFIG" ]]; then
  XCCONFIG_ARGS=(-xcconfig "$LOCAL_CONFIG")
else
  echo "Note: $LOCAL_CONFIG not found — building without a signing team (extension will be unsigned)." >&2
  echo "Copy platform/safari/xcode/LocalConfig.xcconfig.example to LocalConfig.xcconfig and set your DEVELOPMENT_TEAM." >&2
fi

"$SCRIPT_DIR/stage_extension.sh" safari "$EXTENSION_RESOURCES_DIR"

xcodebuild \
  -project "$PROJECT_PATH" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -derivedDataPath "$BUILD_DIR" \
  "${XCCONFIG_ARGS[@]}" \
  build
