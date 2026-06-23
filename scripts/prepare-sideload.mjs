#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  stageChromePackage,
  stageFirefoxPackage,
} from "./package-shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chromeStaging = path.join(root, "dist", "sideload", "chrome");
const firefoxStaging = path.join(root, "dist", "sideload", "firefox");

const version = stageChromePackage(root, chromeStaging);
stageFirefoxPackage(root, firefoxStaging);

console.log("");
console.log("Sideload folders ready:");
console.log(`  Chrome:  dist/sideload/chrome   (v${version})`);
console.log(`  Firefox: dist/sideload/firefox  (v${version})`);
console.log("");
console.log("See README → Sideload for install steps.");