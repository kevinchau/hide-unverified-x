const storage = globalThis.chrome?.storage?.sync ?? globalThis.browser?.storage?.sync;

const retweetAuthorSelect = document.getElementById("retweetAuthor");
const quoteAuthorSelect = document.getElementById("quoteAuthor");
const whitelistTextarea = document.getElementById("whitelist");
const saveWhitelistButton = document.getElementById("saveWhitelist");
const whitelistFollowingInput = document.getElementById("whitelistFollowing");
const saveStatus = document.getElementById("saveStatus");

const countryModeSelect = document.getElementById("countryMode");
const countryMatchFieldsSelect = document.getElementById("countryMatchFields");
const countryListTextarea = document.getElementById("countryList");
const countryUnknownSelect = document.getElementById("countryUnknown");
const saveCountryButton = document.getElementById("saveCountry");
const useSuggestedBlocklistButton = document.getElementById("useSuggestedBlocklist");
const countryStatus = document.getElementById("countryStatus");

const SUGGESTED_SPAM_BLOCKLIST =
  globalThis.HUXCountry?.SUGGESTED_SPAM_BLOCKLIST ?? ["southasia", "africa"];

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

function saveWhitelist() {
  if (!storage) {
    return;
  }

  const whitelist = normalizeWhitelist(whitelistTextarea.value);
  storage.set({ whitelist }, () => {
    whitelistTextarea.value = formatWhitelist(whitelist);
    setStatus(saveStatus, "Whitelist saved");
  });
}

function saveCountrySettings() {
  if (!storage) {
    return;
  }

  const countryList = normalizeCountryList(countryListTextarea.value);
  storage.set(
    {
      countryMode: countryModeSelect.value,
      countryMatchFields: countryMatchFieldsSelect.value,
      countryList,
      countryUnknown: countryUnknownSelect.value,
    },
    () => {
      countryListTextarea.value = formatCountryList(countryList);
      setStatus(countryStatus, "About-account settings saved");
    }
  );
}

if (storage) {
  storage.get(
    {
      retweetAuthor: "original",
      quoteAuthor: "quoter",
      whitelist: [],
      whitelistFollowing: false,
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
      saveStatus,
      "Retweet setting saved"
    );
  });

  quoteAuthorSelect.addEventListener("change", () => {
    saveSelectSetting(
      "quoteAuthor",
      quoteAuthorSelect.value,
      saveStatus,
      "Quote setting saved"
    );
  });

  countryModeSelect.addEventListener("change", saveCountrySettings);
  countryMatchFieldsSelect.addEventListener("change", saveCountrySettings);
  countryUnknownSelect.addEventListener("change", saveCountrySettings);

  useSuggestedBlocklistButton?.addEventListener("click", () => {
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

  saveWhitelistButton.addEventListener("click", saveWhitelist);
  saveCountryButton.addEventListener("click", saveCountrySettings);
}