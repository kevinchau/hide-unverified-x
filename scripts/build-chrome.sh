#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node scripts/prepare-sideload.mjs >/dev/null

VERSION="$(node -p "JSON.parse(require('node:fs').readFileSync('manifest.json','utf8')).version")"
STAGING="dist/sideload/chrome"
mkdir -p dist

ZIP_NAME="hide-unverified-x-${VERSION}-chrome.zip"

(
  cd "$STAGING"
  zip -r -X "../../${ZIP_NAME}" . -x "*.DS_Store"
)

echo "Built Chrome zip: dist/${ZIP_NAME}"
echo "Sideload folder:  dist/sideload/chrome"