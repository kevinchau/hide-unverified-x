#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node scripts/prepare-firefox-package.mjs

VERSION="$(node -p "JSON.parse(require('node:fs').readFileSync('manifest.json','utf8')).version")"
mkdir -p dist

ZIP_NAME="hide-unverified-x-${VERSION}-firefox.zip"
XPI_NAME="hide-unverified-x-${VERSION}.xpi"

(
  cd dist/firefox-src
  zip -r -X "../${ZIP_NAME}" . -x "*.DS_Store"
)

cp "dist/${ZIP_NAME}" "dist/${XPI_NAME}"

echo ""
echo "Built unsigned Firefox packages:"
echo "  dist/${ZIP_NAME}  (upload to AMO)"
echo "  dist/${XPI_NAME}  (same contents, .xpi extension)"
echo ""
echo "Next: submit for Mozilla signing (see README Firefox signing section)."