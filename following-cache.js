(function () {
  "use strict";

  const CACHE_KEY = "followingHandles";
  const MAX_ENTRIES = 20000;
  const PERSIST_DELAY_MS = 2000;

  const following = new Set();
  let onUpdate = null;
  let persistTimer = null;
  let loadComplete = false;
  let loadStarted = false;

  const localStorage =
    globalThis.chrome?.storage?.local ?? globalThis.browser?.storage?.local;

  function schedulePersist() {
    if (!localStorage) {
      return;
    }

    if (persistTimer !== null) {
      clearTimeout(persistTimer);
    }

    persistTimer = setTimeout(() => {
      persistTimer = null;
      localStorage.set({ [CACHE_KEY]: [...following] });
    }, PERSIST_DELAY_MS);
  }

  function finishLoad() {
    loadComplete = true;
    onUpdate?.();
  }

  function load() {
    if (!localStorage || loadComplete || loadStarted) {
      return;
    }

    loadStarted = true;
    localStorage.get({ [CACHE_KEY]: [] }, (result) => {
      const handles = Array.isArray(result[CACHE_KEY]) ? result[CACHE_KEY] : [];
      for (const handle of handles) {
        const normalized = String(handle).trim().toLowerCase();
        if (normalized) {
          following.add(normalized);
        }
      }

      finishLoad();
    });
  }

  function trimCache() {
    if (following.size <= MAX_ENTRIES) {
      return;
    }

    const excess = following.size - MAX_ENTRIES;
    const iterator = following.values();
    for (let i = 0; i < excess; i += 1) {
      const value = iterator.next().value;
      if (value) {
        following.delete(value);
      }
    }
  }

  function addHandles(handles) {
    if (!Array.isArray(handles) || !handles.length) {
      return;
    }

    let changed = false;
    for (const rawHandle of handles) {
      const handle = String(rawHandle).trim().toLowerCase();
      if (!handle || following.has(handle)) {
        continue;
      }

      following.add(handle);
      changed = true;
    }

    if (!changed) {
      return;
    }

    trimCache();
    schedulePersist();
    onUpdate?.();
  }

  function isFollowing(handle) {
    if (!handle) {
      return false;
    }

    return following.has(handle.toLowerCase());
  }

  function setOnUpdate(callback) {
    onUpdate = callback;
    if (loadComplete) {
      onUpdate();
    }
  }

  if (!localStorage) {
    finishLoad();
  } else {
    load();
  }

  globalThis.HUXFollowing = {
    addHandles,
    isFollowing,
    setOnUpdate,
    size: () => following.size,
  };
})();