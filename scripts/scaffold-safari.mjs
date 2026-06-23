#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chromeDir = path.join(root, "chrome");
const safariDir = path.join(root, "safari");
const appName = "Hide Unverified X";
const bundleId = "com.kevinchau.hide-unverified-x";

if (!fs.existsSync(chromeDir)) {
  console.error("Missing chrome/ folder. Run: npm run prepare:chrome");
  process.exit(1);
}

fs.rmSync(safariDir, { recursive: true, force: true });
fs.mkdirSync(safariDir, { recursive: true });

const result = spawnSync(
  "xcrun",
  [
    "safari-web-extension-converter",
    chromeDir,
    "--project-location",
    safariDir,
    "--app-name",
    appName,
    "--bundle-identifier",
    bundleId,
    "--swift",
    "--macos-only",
    "--copy-resources",
    "--no-open",
    "--no-prompt",
    "--force",
  ],
  { stdio: "inherit" }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const projectRoot = path.join(safariDir, appName);
const pbxproj = path.join(projectRoot, `${appName}.xcodeproj`, "project.pbxproj");
const viewController = path.join(projectRoot, appName, "ViewController.swift");

for (const [file, replacements] of [
  [
    pbxproj,
    [
      ['com.kevinchau.hide-unverified-x.Extension', "com.kevinchau.hide-unverified-x.extension"],
      ['com.kevinchau.Hide-Unverified-X', bundleId],
    ],
  ],
  [
    viewController,
    [['com.kevinchau.hide-unverified-x.Extension', "com.kevinchau.hide-unverified-x.extension"]],
  ],
]) {
  if (fs.existsSync(file)) {
    let contents = fs.readFileSync(file, "utf8");
    for (const [from, to] of replacements) {
      contents = contents.replaceAll(from, to);
    }
    fs.writeFileSync(file, contents);
  }
}

console.log("");
console.log("Safari Xcode project scaffolded under safari/");
console.log("Next: npm run prepare:safari  (sync extension resources)");