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
const localStorageArea =
  globalThis.chrome?.storage?.local ?? globalThis.browser?.storage?.local;
const sessionStorage =
  globalThis.chrome?.storage?.session ?? globalThis.browser?.storage?.session;
const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
const tabs = globalThis.chrome?.tabs ?? globalThis.browser?.tabs;

const RATE_LIMIT_KEY = "aboutAccountRateLimitedUntil";

const hiddenCountEl = document.getElementById("hiddenCount");
const openOptionsButton = document.getElementById("openOptions");
const countryEmptyCta = document.getElementById("countryEmptyCta");
const openOptionsFromCta = document.getElementById("openOptionsFromCta");
const aboutRateLimitNote = document.getElementById("aboutRateLimitNote");
const placeholdersToggle = document.getElementById("placeholdersToggle");
const displayModeInputs = [...document.querySelectorAll('input[name="displayMode"]')];

const boolInputs = Object.fromEntries(
  BOOL_KEYS.map((key) => [key, document.getElementById(key)])
);

let countryList = [];
let rateLimitedUntil = 0;
let rateLimitTickTimer = null;

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

function formatCountdown(msLeft) {
  const totalSec = Math.max(0, Math.ceil(msLeft / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function renderAboutRateLimitNote() {
  if (!aboutRateLimitNote) {
    return;
  }

  const now = Date.now();
  const active = rateLimitedUntil > now;

  if (!active) {
    aboutRateLimitNote.hidden = true;
    aboutRateLimitNote.textContent = "";
    if (rateLimitTickTimer !== null) {
      window.clearInterval(rateLimitTickTimer);
      rateLimitTickTimer = null;
    }
    return;
  }

  const resetAt = new Date(rateLimitedUntil);
  const countdown = formatCountdown(rateLimitedUntil - now);
  aboutRateLimitNote.hidden = false;
  aboutRateLimitNote.textContent = `About lookups paused until ${resetAt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })} (${countdown} left). Open Advanced settings for full time.`;

  if (rateLimitTickTimer === null) {
    rateLimitTickTimer = window.setInterval(renderAboutRateLimitNote, 1000);
  }
}

function loadAboutRateLimit() {
  if (!localStorageArea) {
    rateLimitedUntil = 0;
    renderAboutRateLimitNote();
    return;
  }

  localStorageArea.get({ [RATE_LIMIT_KEY]: 0 }, (result) => {
    rateLimitedUntil = Number(result?.[RATE_LIMIT_KEY]) || 0;
    renderAboutRateLimitNote();
  });
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

  loadAboutRateLimit();
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
    if (areaName === "session") {
      handleSessionCountChange(changes);
      return;
    }

    if (areaName === "local" && changes[RATE_LIMIT_KEY]) {
      rateLimitedUntil = Number(changes[RATE_LIMIT_KEY].newValue) || 0;
      renderAboutRateLimitNote();
    }
  });
}

openOptionsButton?.addEventListener("click", openOptionsPage);
openOptionsFromCta?.addEventListener("click", openOptionsPage);
