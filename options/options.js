const storage = globalThis.chrome?.storage?.sync ?? globalThis.browser?.storage?.sync;

const retweetAuthorSelect = document.getElementById("retweetAuthor");
const quoteAuthorSelect = document.getElementById("quoteAuthor");
const whitelistTextarea = document.getElementById("whitelist");
const saveWhitelistButton = document.getElementById("saveWhitelist");
const saveStatus = document.getElementById("saveStatus");

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

function formatWhitelist(handles) {
  return handles.map((handle) => `@${handle}`).join("\n");
}

function setStatus(message) {
  saveStatus.textContent = message;
  if (!message) {
    return;
  }

  window.setTimeout(() => {
    if (saveStatus.textContent === message) {
      saveStatus.textContent = "";
    }
  }, 2000);
}

function saveSelectSetting(key, value) {
  if (!storage) {
    return;
  }

  storage.set({ [key]: value });
}

function saveWhitelist() {
  if (!storage) {
    return;
  }

  const whitelist = normalizeWhitelist(whitelistTextarea.value);
  storage.set({ whitelist }, () => {
    whitelistTextarea.value = formatWhitelist(whitelist);
    setStatus("Whitelist saved");
  });
}

if (storage) {
  storage.get(
    {
      retweetAuthor: "original",
      quoteAuthor: "quoter",
      whitelist: [],
    },
    (result) => {
      retweetAuthorSelect.value =
        result.retweetAuthor === "retweeter" ? "retweeter" : "original";
      quoteAuthorSelect.value =
        result.quoteAuthor === "quoted" ? "quoted" : "quoter";
      whitelistTextarea.value = formatWhitelist(
        Array.isArray(result.whitelist) ? result.whitelist : []
      );
    }
  );

  retweetAuthorSelect.addEventListener("change", () => {
    saveSelectSetting("retweetAuthor", retweetAuthorSelect.value);
    setStatus("Retweet setting saved");
  });

  quoteAuthorSelect.addEventListener("change", () => {
    saveSelectSetting("quoteAuthor", quoteAuthorSelect.value);
    setStatus("Quote setting saved");
  });

  saveWhitelistButton.addEventListener("click", saveWhitelist);
}