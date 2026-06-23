#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { SAFARI_RESOURCES_DIR, stageSafariPackage } from "./package-shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging =
  process.argv[2] ?? path.join(root, SAFARI_RESOURCES_DIR);

const version = stageSafariPackage(root, staging);

console.log(`Staged Safari extension at ${path.relative(root, staging)} (v${version})`);