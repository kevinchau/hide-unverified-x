import fs from "node:fs";
import path from "node:path";

export const COPY_DIRS = ["popup", "options", "icons"];

export const COPY_FILES = [
  "background.js",
  "content.js",
  "content.css",
  "page-interceptor.js",
  "about-account.js",
  "following-cache.js",
  "country-match.js",
  "LICENSE",
];

export function readSourceManifest(root) {
  return JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
}

export function copyExtensionFiles(root, staging) {
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });

  for (const dir of COPY_DIRS) {
    const source = path.join(root, dir);
    if (fs.existsSync(source)) {
      fs.cpSync(source, path.join(staging, dir), { recursive: true });
    }
  }

  for (const file of COPY_FILES) {
    const source = path.join(root, file);
    if (fs.existsSync(source)) {
      fs.cpSync(source, path.join(staging, file));
    }
  }
}

export function prepareChromeManifest(sourceManifest) {
  const manifest = structuredClone(sourceManifest);

  manifest.background = {
    service_worker: "background.js",
  };

  delete manifest.browser_specific_settings;

  return manifest;
}

export function prepareFirefoxManifest(sourceManifest) {
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

export function writeManifest(staging, manifest) {
  fs.writeFileSync(
    path.join(staging, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

export function stageChromePackage(root, staging) {
  const sourceManifest = readSourceManifest(root);
  copyExtensionFiles(root, staging);
  writeManifest(staging, prepareChromeManifest(sourceManifest));
  return sourceManifest.version;
}

export function stageFirefoxPackage(root, staging) {
  const sourceManifest = readSourceManifest(root);
  copyExtensionFiles(root, staging);
  writeManifest(staging, prepareFirefoxManifest(sourceManifest));
  return sourceManifest.version;
}