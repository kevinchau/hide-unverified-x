const storage = globalThis.chrome?.storage?.sync ?? globalThis.browser?.storage?.sync;

const retweetAuthorSelect = document.getElementById("retweetAuthor");
const quoteAuthorSelect = document.getElementById("quoteAuthor");
const whitelistTextarea = document.getElementById("whitelist");
const saveWhitelistButton = document.getElementById("saveWhitelist");
const saveStatus = document.getElementById("saveStatus");

const countryModeSelect = document.getElementById("countryMode");
const countryListTextarea = document.getElementById("countryList");
const countryUnknownSelect = document.getElementById("countryUnknown");
const saveCountryButton = document.getElementById("saveCountry");
const countryStatus = document.getElementById("countryStatus");

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
      countryList,
      countryUnknown: countryUnknownSelect.value,
    },
    () => {
      countryListTextarea.value = formatCountryList(countryList);
      setStatus(countryStatus, "Country settings saved");
    }
  );
}

if (storage) {
  storage.get(
    {
      retweetAuthor: "original",
      quoteAuthor: "quoter",
      whitelist: [],
      countryMode: "blocklist",
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
      countryModeSelect.value =
        result.countryMode === "allowlist" ? "allowlist" : "blocklist";
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
  countryUnknownSelect.addEventListener("change", saveCountrySettings);

  saveWhitelistButton.addEventListener("click", saveWhitelist);
  saveCountryButton.addEventListener("click", saveCountrySettings);
}