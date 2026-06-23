#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node scripts/prepare-chrome-package.mjs

VERSION="$(node -p "JSON.parse(require('node:fs').readFileSync('manifest.json','utf8')).version")"
mkdir -p dist

ZIP_NAME="hide-unverified-x-${VERSION}-chrome.zip"

(
  cd dist/chrome-src
  zip -r -X "../${ZIP_NAME}" . -x "*.DS_Store"
)

echo ""
echo "Built Chrome Web Store package:"
echo "  dist/${ZIP_NAME}"
echo ""
echo "Next: upload to the Chrome Web Store Developer Dashboard (see README)."