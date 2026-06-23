#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { stageFirefoxPackage } from "./package-shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging =
  process.argv[2] ??
  path.join(root, "dist", "sideload", "firefox");

const version = stageFirefoxPackage(root, staging);

console.log(`Staged Firefox package at ${path.relative(root, staging)} (v${version})`);