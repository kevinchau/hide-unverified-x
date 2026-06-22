const DEFAULTS = {
  forYou: true,
  following: true,
  replies: true,
  badgeType: "blue",
  displayMode: "hide",
  showPlaceholders: true,
};

const BOOL_KEYS = ["forYou", "following", "replies", "showPlaceholders"];
const storage = globalThis.chrome?.storage?.sync ?? globalThis.browser?.storage?.sync;
const sessionStorage =
  globalThis.chrome?.storage?.session ?? globalThis.browser?.storage?.session;
const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
const tabs = globalThis.chrome?.tabs ?? globalThis.browser?.tabs;

const hiddenCountEl = document.getElementById("hiddenCount");
const badgeTypeSelect = document.getElementById("badgeType");
const openOptionsButton = document.getElementById("openOptions");
const displayModeInputs = [...document.querySelectorAll('input[name="displayMode"]')];

const boolInputs = Object.fromEntries(
  BOOL_KEYS.map((key) => [key, document.getElementById(key)])
);

function normalizeStoredSettings(result) {
  const hasContextSettings = ["forYou", "following", "replies"].some(
    (key) => typeof result[key] === "boolean"
  );

  if (hasContextSettings) {
    return {
      forYou: result.forYou ?? DEFAULTS.forYou,
      following: result.following ?? DEFAULTS.following,
      replies: result.replies ?? DEFAULTS.replies,
      badgeType: result.badgeType === "any" ? "any" : "blue",
      displayMode: result.displayMode === "dim" ? "dim" : "hide",
      showPlaceholders:
        typeof result.showPlaceholders === "boolean"
          ? result.showPlaceholders
          : DEFAULTS.showPlaceholders,
    };
  }

  if (typeof result.enabled === "boolean") {
    return {
      ...DEFAULTS,
      forYou: result.enabled,
      following: result.enabled,
      replies: result.enabled,
    };
  }

  return { ...DEFAULTS };
}

function updateHiddenCount(count) {
  const value = Number.isFinite(count) ? count : 0;
  hiddenCountEl.textContent = `${value} hidden`;
}

function countKey(tabId) {
  return `hiddenCount:${tabId}`;
}

function readHiddenCount() {
  if (!sessionStorage || !tabs) {
    updateHiddenCount(0);
    return;
  }

  tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    const tabId = activeTabs[0]?.id;
    if (!tabId) {
      updateHiddenCount(0);
      return;
    }

    sessionStorage.get({ [countKey(tabId)]: 0 }, (result) => {
      updateHiddenCount(result[countKey(tabId)] ?? 0);
    });
  });
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
    badgeType: badgeTypeSelect.value,
    displayMode,
    showPlaceholders: boolInputs.showPlaceholders.checked,
  });
}

function applySettings(values) {
  boolInputs.forYou.checked = values.forYou;
  boolInputs.following.checked = values.following;
  boolInputs.replies.checked = values.replies;
  boolInputs.showPlaceholders.checked = values.showPlaceholders;
  badgeTypeSelect.value = values.badgeType;

  for (const input of displayModeInputs) {
    input.checked = input.value === values.displayMode;
  }
}

if (storage) {
  storage.get({ enabled: true, ...DEFAULTS }, (result) => {
    applySettings(normalizeStoredSettings(result));
  });

  for (const key of BOOL_KEYS) {
    boolInputs[key].addEventListener("change", saveSettings);
  }

  badgeTypeSelect.addEventListener("change", saveSettings);

  for (const input of displayModeInputs) {
    input.addEventListener("change", saveSettings);
  }
}

readHiddenCount();

if (sessionStorage?.onChanged && tabs) {
  sessionStorage.onChanged.addListener((changes, area) => {
    if (area !== "session") {
      return;
    }

    tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      const tabId = activeTabs[0]?.id;
      if (!tabId || !changes[countKey(tabId)]) {
        return;
      }

      updateHiddenCount(changes[countKey(tabId)].newValue ?? 0);
    });
  });
}

openOptionsButton?.addEventListener("click", () => {
  runtime?.openOptionsPage?.();
});