#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { stageChromePackage } from "./package-shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging =
  process.argv[2] ??
  path.join(root, "dist", "sideload", "chrome");

const version = stageChromePackage(root, staging);

console.log(`Staged Chrome package at ${path.relative(root, staging)} (v${version})`);