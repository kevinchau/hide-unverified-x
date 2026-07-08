const storage = globalThis.chrome?.storage?.sync ?? globalThis.browser?.storage?.sync;

const retweetAuthorSelect = document.getElementById("retweetAuthor");
const quoteAuthorSelect = document.getElementById("quoteAuthor");
const retweetStatus = document.getElementById("retweetStatus");
const quoteStatus = document.getElementById("quoteStatus");
const whitelistTextarea = document.getElementById("whitelist");
const saveWhitelistButton = document.getElementById("saveWhitelist");
const whitelistFollowingInput = document.getElementById("whitelistFollowing");
const whitelistFollowedByFollowingInput = document.getElementById(
  "whitelistFollowedByFollowing"
);
const saveStatus = document.getElementById("saveStatus");

const countryModeSelect = document.getElementById("countryMode");
const countryMatchFieldsSelect = document.getElementById("countryMatchFields");
const countryListTextarea = document.getElementById("countryList");
const countryUnknownSelect = document.getElementById("countryUnknown");
const saveCountryButton = document.getElementById("saveCountry");
const useSuggestedBlocklistButton = document.getElementById("useSuggestedBlocklist");
const countryStatus = document.getElementById("countryStatus");

const AUTOSAVE_DEBOUNCE_MS = 400;

const SUGGESTED_SPAM_BLOCKLIST =
  globalThis.HUXCountry?.SUGGESTED_SPAM_BLOCKLIST ?? ["southasia", "africa"];

let whitelistAutosaveTimer = null;
let countryAutosaveTimer = null;

function normalizeWhitelist(text) {
  return [
    ...new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/^@/, "").toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function normalizeCountryList(text) {
  return text
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatWhitelist(handles) {
  return handles.map((handle) => `@${handle}`).join("\n");
}

function formatCountryList(entries) {
  return entries.join("\n");
}

function setStatus(element, message) {
  if (!element) {
    return;
  }

  element.textContent = message;
  if (!message) {
    return;
  }

  window.setTimeout(() => {
    if (element.textContent === message) {
      element.textContent = "";
    }
  }, 2000);
}

function saveSelectSetting(key, value, statusElement, message) {
  if (!storage) {
    return;
  }

  storage.set({ [key]: value }, () => {
    setStatus(statusElement, message);
  });
}

function saveWhitelist(options = {}) {
  if (!storage) {
    return;
  }

  const { reformat = true, statusMessage = "Whitelist saved" } = options;
  const whitelist = normalizeWhitelist(whitelistTextarea.value);
  storage.set({ whitelist }, () => {
    if (reformat) {
      whitelistTextarea.value = formatWhitelist(whitelist);
    }
    setStatus(saveStatus, statusMessage);
  });
}

function saveCountrySettings(options = {}) {
  if (!storage) {
    return;
  }

  const {
    reformat = true,
    statusMessage = "About-account settings saved",
  } = options;
  const countryList = normalizeCountryList(countryListTextarea.value);
  storage.set(
    {
      countryMode: countryModeSelect.value,
      countryMatchFields: countryMatchFieldsSelect.value,
      countryList,
      countryUnknown: countryUnknownSelect.value,
    },
    () => {
      if (reformat) {
        countryListTextarea.value = formatCountryList(countryList);
      }
      setStatus(countryStatus, statusMessage);
    }
  );
}

function clearWhitelistAutosave() {
  if (whitelistAutosaveTimer !== null) {
    window.clearTimeout(whitelistAutosaveTimer);
    whitelistAutosaveTimer = null;
  }
}

function clearCountryAutosave() {
  if (countryAutosaveTimer !== null) {
    window.clearTimeout(countryAutosaveTimer);
    countryAutosaveTimer = null;
  }
}

function scheduleWhitelistAutosave() {
  clearWhitelistAutosave();
  whitelistAutosaveTimer = window.setTimeout(() => {
    whitelistAutosaveTimer = null;
    saveWhitelist({ reformat: false, statusMessage: "Whitelist saved" });
  }, AUTOSAVE_DEBOUNCE_MS);
}

function scheduleCountryAutosave() {
  clearCountryAutosave();
  countryAutosaveTimer = window.setTimeout(() => {
    countryAutosaveTimer = null;
    saveCountrySettings({
      reformat: false,
      statusMessage: "About-account settings saved",
    });
  }, AUTOSAVE_DEBOUNCE_MS);
}

function flushWhitelistAutosave() {
  if (whitelistAutosaveTimer === null) {
    return;
  }

  clearWhitelistAutosave();
  saveWhitelist({ reformat: false, statusMessage: "Whitelist saved" });
}

function flushCountryAutosave() {
  if (countryAutosaveTimer === null) {
    return;
  }

  clearCountryAutosave();
  saveCountrySettings({
    reformat: false,
    statusMessage: "About-account settings saved",
  });
}

if (storage) {
  storage.get(
    {
      retweetAuthor: "original",
      quoteAuthor: "quoter",
      whitelist: [],
      whitelistFollowing: false,
      whitelistFollowedByFollowing: false,
      countryMode: "blocklist",
      countryMatchFields: "both",
      countryList: [],
      countryUnknown: "show",
    },
    (result) => {
      retweetAuthorSelect.value =
        result.retweetAuthor === "retweeter" ? "retweeter" : "original";
      quoteAuthorSelect.value =
        result.quoteAuthor === "quoted" ? "quoted" : "quoter";
      whitelistTextarea.value = formatWhitelist(
        Array.isArray(result.whitelist) ? result.whitelist : []
      );
      whitelistFollowingInput.checked = result.whitelistFollowing === true;
      whitelistFollowedByFollowingInput.checked =
        result.whitelistFollowedByFollowing === true;
      countryModeSelect.value =
        result.countryMode === "allowlist" ? "allowlist" : "blocklist";
      countryMatchFieldsSelect.value =
        result.countryMatchFields === "basedIn" ||
        result.countryMatchFields === "connectedVia"
          ? result.countryMatchFields
          : "both";
      countryListTextarea.value = formatCountryList(
        Array.isArray(result.countryList) ? result.countryList : []
      );
      countryUnknownSelect.value =
        result.countryUnknown === "hide" ? "hide" : "show";
    }
  );

  retweetAuthorSelect.addEventListener("change", () => {
    saveSelectSetting(
      "retweetAuthor",
      retweetAuthorSelect.value,
      retweetStatus,
      "Retweet setting saved"
    );
  });

  quoteAuthorSelect.addEventListener("change", () => {
    saveSelectSetting(
      "quoteAuthor",
      quoteAuthorSelect.value,
      quoteStatus,
      "Quote setting saved"
    );
  });

  countryModeSelect.addEventListener("change", () => {
    clearCountryAutosave();
    saveCountrySettings();
  });
  countryMatchFieldsSelect.addEventListener("change", () => {
    clearCountryAutosave();
    saveCountrySettings();
  });
  countryUnknownSelect.addEventListener("change", () => {
    clearCountryAutosave();
    saveCountrySettings();
  });

  countryListTextarea.addEventListener("input", scheduleCountryAutosave);
  countryListTextarea.addEventListener("blur", flushCountryAutosave);

  whitelistTextarea.addEventListener("input", scheduleWhitelistAutosave);
  whitelistTextarea.addEventListener("blur", flushWhitelistAutosave);

  useSuggestedBlocklistButton?.addEventListener("click", () => {
    const existing = countryListTextarea.value.trim();
    if (existing) {
      const confirmed = window.confirm(
        "Replace your current country/region list with the suggested spam blocklist?"
      );
      if (!confirmed) {
        return;
      }
    }

    clearCountryAutosave();
    countryListTextarea.value = formatCountryList(SUGGESTED_SPAM_BLOCKLIST);
    countryModeSelect.value = "blocklist";
    countryMatchFieldsSelect.value = "both";
    countryUnknownSelect.value = "show";
    saveCountrySettings();
  });

  whitelistFollowingInput?.addEventListener("change", () => {
    saveSelectSetting(
      "whitelistFollowing",
      whitelistFollowingInput.checked,
      saveStatus,
      "Follow whitelist saved"
    );
  });

  whitelistFollowedByFollowingInput?.addEventListener("change", () => {
    saveSelectSetting(
      "whitelistFollowedByFollowing",
      whitelistFollowedByFollowingInput.checked,
      saveStatus,
      "Social follow whitelist saved"
    );
  });

  saveWhitelistButton.addEventListener("click", () => {
    clearWhitelistAutosave();
    saveWhitelist({ reformat: true, statusMessage: "Whitelist saved" });
  });
  saveCountryButton.addEventListener("click", () => {
    clearCountryAutosave();
    saveCountrySettings({
      reformat: true,
      statusMessage: "About-account settings saved",
    });
  });
}
