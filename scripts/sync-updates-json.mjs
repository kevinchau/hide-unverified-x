#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIREFOX_ADDON_ID,
  firefoxReleaseXpiUrl,
  readSourceManifest,
} from "./package-shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const xpiPath = process.argv[2];

if (!xpiPath) {
  console.error("Usage: node scripts/sync-updates-json.mjs <path-to-xpi>");
  process.exit(1);
}

const resolvedXpi = path.resolve(xpiPath);
if (!fs.existsSync(resolvedXpi)) {
  console.error(`XPI not found: ${resolvedXpi}`);
  process.exit(1);
}

const { version } = readSourceManifest(root);
const hash = crypto
  .createHash("sha256")
  .update(fs.readFileSync(resolvedXpi))
  .digest("hex");

const updates = {
  addons: {
    [FIREFOX_ADDON_ID]: {
      updates: [
        {
          version,
          update_link: firefoxReleaseXpiUrl(version),
          update_hash: `sha256:${hash}`,
        },
      ],
    },
  },
};

const outPath = path.join(root, "updates.json");
fs.writeFileSync(outPath, `${JSON.stringify(updates, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outPath)} for v${version}`);