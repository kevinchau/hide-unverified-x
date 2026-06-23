import fs from "node:fs";
import path from "node:path";

// Stable Firefox add-on ID for AMO. Must stay constant after first successful publish.
// UUID format avoids collisions with other extensions on addons.mozilla.org.
export const FIREFOX_ADDON_ID = "{b4e8a1c2-3f5d-4e7a-9b0c-1d2e3f4a5b6c}";

export const GITHUB_REPO = "kevinchau/hide-unverified-x";
export const GITHUB_DEFAULT_BRANCH = "main";
export const FIREFOX_UPDATE_MANIFEST_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_DEFAULT_BRANCH}/updates.json`;
export const SAFARI_RESOURCES_DIR = path.join(
  "safari",
  "Hide Unverified X",
  "Hide Unverified X Extension",
  "Resources"
);

export function firefoxReleaseXpiUrl(version) {
  return `https://github.com/${GITHUB_REPO}/releases/download/v${version}/hide-unverified-x-${version}.xpi`;
}

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

export function prepareSafariManifest(sourceManifest) {
  const manifest = prepareChromeManifest(sourceManifest);

  // Safari Web Extensions do not support open_in_tab on options_ui.
  if (manifest.options_ui) {
    delete manifest.options_ui.open_in_tab;
  }

  return manifest;
}

export function prepareFirefoxManifest(sourceManifest) {
  const manifest = structuredClone(sourceManifest);

  manifest.background = {
    scripts: ["background.js"],
  };

  manifest.browser_specific_settings = {
    gecko: {
      id: FIREFOX_ADDON_ID,
      strict_min_version: "140.0",
      update_url: FIREFOX_UPDATE_MANIFEST_URL,
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

export function stageSafariPackage(root, staging) {
  const sourceManifest = readSourceManifest(root);
  copyExtensionFiles(root, staging);
  writeManifest(staging, prepareSafariManifest(sourceManifest));
  return sourceManifest.version;
}