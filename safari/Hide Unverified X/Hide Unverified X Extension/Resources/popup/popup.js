const settingsSchema = globalThis.HUXSettings;
if (!settingsSchema) {
  throw new Error("HUXSettings missing");
}
const DEFAULT_SETTINGS = settingsSchema.DEFAULT_SETTINGS;
const normalizeStoredSettings = settingsSchema.normalizeStoredSettings;

const BOOL_KEYS = [
  "forYou",
  "following",
  "replies",
  "showPlaceholders",
  "countryForYou",
  "countryReplies",
  "showCountryFlags",
  "badgeBlue",
  "badgeGold",
  "badgeGovernment",
  "whitelistFollowing",
  "whitelistFollowedByFollowing",
];
const storage = globalThis.chrome?.storage?.sync ?? globalThis.browser?.storage?.sync;
const sessionStorage =
  globalThis.chrome?.storage?.session ?? globalThis.browser?.storage?.session;
const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
const tabs = globalThis.chrome?.tabs ?? globalThis.browser?.tabs;

const hiddenCountEl = document.getElementById("hiddenCount");
const openOptionsButton = document.getElementById("openOptions");
const countryEmptyCta = document.getElementById("countryEmptyCta");
const openOptionsFromCta = document.getElementById("openOptionsFromCta");
const placeholdersToggle = document.getElementById("placeholdersToggle");
const displayModeInputs = [...document.querySelectorAll('input[name="displayMode"]')];

const boolInputs = Object.fromEntries(
  BOOL_KEYS.map((key) => [key, document.getElementById(key)])
);

let countryList = [];

function updateHiddenCount(count) {
  const value = Number.isFinite(count) ? count : 0;
  hiddenCountEl.textContent = `${value} filtered`;
}

function showCountUnavailable() {
  hiddenCountEl.textContent = "Open X to see counts";
}

function isXTabUrl(url) {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "x.com" ||
        parsed.hostname === "twitter.com" ||
        parsed.hostname.endsWith(".x.com") ||
        parsed.hostname.endsWith(".twitter.com"))
    );
  } catch {
    return false;
  }
}

function countKey(tabId) {
  return `hiddenCount:${tabId}`;
}

function readHiddenCount() {
  if (!sessionStorage || !tabs) {
    showCountUnavailable();
    return;
  }

  tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    const tab = activeTabs[0];
    const tabId = tab?.id;
    if (!tabId || !isXTabUrl(tab.url)) {
      showCountUnavailable();
      return;
    }

    sessionStorage.get({ [countKey(tabId)]: 0 }, (result) => {
      updateHiddenCount(result[countKey(tabId)] ?? 0);
    });
  });
}

function updateCountryEmptyCta() {
  if (!countryEmptyCta) {
    return;
  }

  const aboutEnabled =
    boolInputs.countryForYou.checked || boolInputs.countryReplies.checked;
  const listEmpty = !Array.isArray(countryList) || countryList.length === 0;
  countryEmptyCta.hidden = !(aboutEnabled && listEmpty);
}

function updatePlaceholdersAvailability() {
  const displayMode =
    displayModeInputs.find((input) => input.checked)?.value ?? "hide";
  const dimSelected = displayMode === "dim";

  if (boolInputs.showPlaceholders) {
    boolInputs.showPlaceholders.disabled = dimSelected;
  }

  if (placeholdersToggle) {
    placeholdersToggle.classList.toggle("is-disabled", dimSelected);
    placeholdersToggle.setAttribute("aria-disabled", dimSelected ? "true" : "false");
  }
}

function saveSettings() {
  if (!storage) {
    return;
  }

  const displayMode =
    displayModeInputs.find((input) => input.checked)?.value ?? "hide";

  storage.set({
    forYou: boolInputs.forYou.checked,
    following: boolInputs.following.checked,
    replies: boolInputs.replies.checked,
    countryForYou: boolInputs.countryForYou.checked,
    countryReplies: boolInputs.countryReplies.checked,
    showCountryFlags: boolInputs.showCountryFlags.checked,
    badgeBlue: boolInputs.badgeBlue.checked,
    badgeGold: boolInputs.badgeGold.checked,
    badgeGovernment: boolInputs.badgeGovernment.checked,
    whitelistFollowing: boolInputs.whitelistFollowing.checked,
    whitelistFollowedByFollowing: boolInputs.whitelistFollowedByFollowing.checked,
    displayMode,
    showPlaceholders: boolInputs.showPlaceholders.checked,
  });

  updateCountryEmptyCta();
  updatePlaceholdersAvailability();
}

function applySettings(values) {
  boolInputs.forYou.checked = values.forYou;
  boolInputs.following.checked = values.following;
  boolInputs.replies.checked = values.replies;
  boolInputs.countryForYou.checked = values.countryForYou === true;
  boolInputs.countryReplies.checked = values.countryReplies === true;
  boolInputs.showCountryFlags.checked = values.showCountryFlags !== false;
  boolInputs.showPlaceholders.checked = values.showPlaceholders;
  boolInputs.badgeBlue.checked = values.badgeBlue !== false;
  boolInputs.badgeGold.checked = values.badgeGold !== false;
  boolInputs.badgeGovernment.checked = values.badgeGovernment === true;
  boolInputs.whitelistFollowing.checked = values.whitelistFollowing === true;
  boolInputs.whitelistFollowedByFollowing.checked =
    values.whitelistFollowedByFollowing === true;

  for (const input of displayModeInputs) {
    input.checked = input.value === values.displayMode;
  }

  updateCountryEmptyCta();
  updatePlaceholdersAvailability();
}

function openOptionsPage() {
  runtime?.openOptionsPage?.();
}

if (storage) {
  storage.get(
    {
      enabled: true,
      ...DEFAULT_SETTINGS,
    },
    (result) => {
      countryList = settingsSchema.normalizeCountryList(result.countryList);
      applySettings(normalizeStoredSettings(result));
    }
  );

  for (const key of BOOL_KEYS) {
    boolInputs[key].addEventListener("change", saveSettings);
  }

  for (const input of displayModeInputs) {
    input.addEventListener("change", saveSettings);
  }

  const settingsOnChanged =
    globalThis.chrome?.storage?.onChanged ??
    globalThis.browser?.storage?.onChanged;
  settingsOnChanged?.addListener((changes, areaName) => {
    if (areaName !== "sync" && areaName !== "local") {
      return;
    }

    if (changes.countryList) {
      const next = changes.countryList.newValue;
      countryList = Array.isArray(next) ? next : [];
      updateCountryEmptyCta();
    }
  });
}

readHiddenCount();

function handleSessionCountChange(changes) {
  if (!tabs) {
    return;
  }

  tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    const tab = activeTabs[0];
    const tabId = tab?.id;
    if (!tabId || !isXTabUrl(tab.url) || !changes[countKey(tabId)]) {
      return;
    }

    updateHiddenCount(changes[countKey(tabId)].newValue ?? 0);
  });
}

// Prefer chrome.storage.onChanged (covers session area). Fall back to
// sessionStorage.onChanged only if a browser exposes that path.
const storageOnChanged =
  globalThis.chrome?.storage?.onChanged ??
  globalThis.browser?.storage?.onChanged ??
  sessionStorage?.onChanged;

if (storageOnChanged) {
  storageOnChanged.addListener((changes, areaName) => {
    if (areaName !== "session") {
      return;
    }

    handleSessionCountChange(changes);
  });
}

openOptionsButton?.addEventListener("click", openOptionsPage);
openOptionsFromCta?.addEventListener("click", openOptionsPage);
