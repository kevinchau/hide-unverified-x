#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node scripts/prepare-safari-package.mjs >/dev/null

PROJECT_DIR="safari/Hide Unverified X"
DERIVED_DATA="dist/safari-derived"

(
  cd "$PROJECT_DIR"
  xcodebuild \
    -project "Hide Unverified X.xcodeproj" \
    -scheme "Hide Unverified X" \
    -configuration Release \
    -derivedDataPath "$ROOT/$DERIVED_DATA" \
    build
)

APP_PATH="$DERIVED_DATA/Build/Products/Release/Hide Unverified X.app"
echo "Built Safari host app: $APP_PATH"
echo "Open in Xcode to run on your Mac, then enable the extension in Safari → Settings → Extensions."