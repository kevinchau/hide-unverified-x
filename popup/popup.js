const SETTINGS = [
  { key: "forYou", inputId: "forYou" },
  { key: "following", inputId: "following" },
  { key: "replies", inputId: "replies" },
];

const DEFAULTS = {
  forYou: true,
  following: true,
  replies: true,
};

const storage = globalThis.chrome?.storage?.sync ?? globalThis.browser?.storage?.sync;
const inputs = Object.fromEntries(
  SETTINGS.map(({ key, inputId }) => [key, document.getElementById(inputId)])
);

function normalizeStoredSettings(result) {
  const hasNewSettings = SETTINGS.some(({ key }) => typeof result[key] === "boolean");

  if (hasNewSettings) {
    return {
      forYou: result.forYou ?? DEFAULTS.forYou,
      following: result.following ?? DEFAULTS.following,
      replies: result.replies ?? DEFAULTS.replies,
    };
  }

  if (typeof result.enabled === "boolean") {
    return {
      forYou: result.enabled,
      following: result.enabled,
      replies: result.enabled,
    };
  }

  return { ...DEFAULTS };
}

function saveSettings() {
  if (!storage) {
    return;
  }

  const next = {};
  for (const { key } of SETTINGS) {
    next[key] = inputs[key].checked;
  }

  storage.set(next);
}

if (storage) {
  storage.get({ enabled: true, ...DEFAULTS }, (result) => {
    const values = normalizeStoredSettings(result);
    for (const { key } of SETTINGS) {
      inputs[key].checked = values[key];
    }
  });

  for (const { key } of SETTINGS) {
    inputs[key].addEventListener("change", saveSettings);
  }
}