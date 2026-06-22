const STORAGE_KEY = "enabled";
const toggle = document.getElementById("enabled");
const storage = globalThis.chrome?.storage?.sync ?? globalThis.browser?.storage?.sync;

if (storage) {
  storage.get({ [STORAGE_KEY]: true }, (result) => {
    toggle.checked = result[STORAGE_KEY];
  });

  toggle.addEventListener("change", () => {
    storage.set({ [STORAGE_KEY]: toggle.checked });
  });
}