#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging = path.join(root, "dist", "chrome-src");

const COPY_DIRS = ["popup", "options", "icons"];
const COPY_FILES = [
  "background.js",
  "content.js",
  "content.css",
  "page-interceptor.js",
  "about-account.js",
  "following-cache.js",
  "country-match.js",
  "LICENSE",
];

function copyPath(source, destination) {
  fs.cpSync(source, destination, { recursive: true });
}

function prepareChromeManifest(sourceManifest) {
  const manifest = structuredClone(sourceManifest);

  manifest.background = {
    service_worker: "background.js",
  };

  delete manifest.browser_specific_settings;

  return manifest;
}

fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });

for (const dir of COPY_DIRS) {
  copyPath(path.join(root, dir), path.join(staging, dir));
}

for (const file of COPY_FILES) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) {
    continue;
  }

  copyPath(source, path.join(staging, file));
}

const sourceManifest = JSON.parse(
  fs.readFileSync(path.join(root, "manifest.json"), "utf8")
);
const chromeManifest = prepareChromeManifest(sourceManifest);

fs.writeFileSync(
  path.join(staging, "manifest.json"),
  `${JSON.stringify(chromeManifest, null, 2)}\n`
);

console.log(
  `Staged Chrome package at dist/chrome-src (v${chromeManifest.version})`
);