#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging = path.join(root, "dist", "firefox-src");

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

function prepareFirefoxManifest(sourceManifest) {
  const manifest = structuredClone(sourceManifest);

  manifest.background = {
    scripts: ["background.js"],
  };

  manifest.browser_specific_settings = {
    gecko: {
      id:
        sourceManifest.browser_specific_settings?.gecko?.id ??
        "hide-unverified-x@kevinchau.github",
      strict_min_version: "140.0",
      data_collection_permissions: {
        required: ["none"],
      },
    },
  };

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
const firefoxManifest = prepareFirefoxManifest(sourceManifest);

fs.writeFileSync(
  path.join(staging, "manifest.json"),
  `${JSON.stringify(firefoxManifest, null, 2)}\n`
);

console.log(
  `Staged Firefox package at dist/firefox-src (v${firefoxManifest.version})`
);