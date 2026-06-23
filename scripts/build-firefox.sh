#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node scripts/prepare-firefox-package.mjs dist/sideload/firefox >/dev/null

VERSION="$(node -p "JSON.parse(require('node:fs').readFileSync('manifest.json','utf8')).version")"
STAGING="dist/sideload/firefox"
mkdir -p dist

ZIP_NAME="hide-unverified-x-${VERSION}-firefox.zip"
XPI_NAME="hide-unverified-x-${VERSION}.xpi"

(
  cd "$STAGING"
  zip -r -X "../../${ZIP_NAME}" . -x "*.DS_Store"
)

cp "dist/${ZIP_NAME}" "dist/${XPI_NAME}"

node scripts/sync-updates-json.mjs "dist/${XPI_NAME}"

echo "Built Firefox zip:  dist/${ZIP_NAME}"
echo "Built Firefox xpi:  dist/${XPI_NAME}"
echo "Sideload folder:    dist/sideload/firefox"