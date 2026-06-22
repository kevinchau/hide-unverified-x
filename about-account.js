(function () {
  "use strict";

  const BEARER =
    "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
  const FALLBACK_QUERY_ID = "zs_jFPFT78rBpXv9Z3U2YQ";
  const CACHE_KEY = "aboutAccountCache";
  const MIN_INTERVAL_MS = 1500;
  const MAX_CACHE_ENTRIES = 5000;

  let queryId = FALLBACK_QUERY_ID;
  let onUpdate = null;
  let persistTimer = null;
  let lastFetchAt = 0;
  let draining = false;

  const memoryCache = new Map();
  const queued = new Set();
  const queue = [];

  const localStorage =
    globalThis.chrome?.storage?.local ?? globalThis.browser?.storage?.local;

  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function emptyEntry() {
    return {
      status: "resolved",
      basedIn: "",
      connectedVia: "",
      accurate: true,
      empty: true,
      fetchedAt: Date.now(),
    };
  }

  function parseAboutResponse(payload) {
    const result =
      payload?.data?.user_result_by_screen_name?.result ||
      payload?.data?.user_result?.result ||
      payload?.data?.user?.result ||
      null;

    if (!result) {
      return null;
    }

    const about = result.about_profile || result.aboutProfile || null;
    if (!about) {
      return emptyEntry();
    }

    const basedIn = about.account_based_in || about.accountBasedIn || "";
    const connectedVia = about.source || "";

    return {
      status: "resolved",
      basedIn,
      connectedVia,
      accurate: about.location_accurate !== false,
      empty: !basedIn && !connectedVia,
      fetchedAt: Date.now(),
    };
  }

  function schedulePersist() {
    if (!localStorage) {
      return;
    }

    if (persistTimer !== null) {
      clearTimeout(persistTimer);
    }

    persistTimer = setTimeout(() => {
      persistTimer = null;
      const aboutAccountCache = Object.fromEntries(memoryCache.entries());
      localStorage.set({ [CACHE_KEY]: aboutAccountCache });
    }, 500);
  }

  function setEntry(handle, entry) {
    const key = handle.toLowerCase();
    memoryCache.set(key, entry);
    schedulePersist();
    onUpdate?.();
  }

  function setQueryId(nextQueryId) {
    if (!nextQueryId || nextQueryId === queryId) {
      return;
    }

    queryId = nextQueryId;
  }

  function get(handle) {
    if (!handle) {
      return null;
    }

    return memoryCache.get(handle.toLowerCase()) ?? null;
  }

  function enqueue(handle) {
    if (!handle) {
      return;
    }

    const key = handle.toLowerCase();
    const existing = memoryCache.get(key);
    if (existing?.status === "resolved") {
      return;
    }

    if (queued.has(key)) {
      return;
    }

    memoryCache.set(key, { status: "pending" });
    queued.add(key);
    queue.push(key);
    drainQueue();
  }

  async function fetchAboutAccount(handle) {
    const variables = { screenName: handle };
    const url =
      `https://x.com/i/api/graphql/${queryId}/AboutAccountQuery?variables=` +
      encodeURIComponent(JSON.stringify(variables));

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        authorization: BEARER,
        "x-csrf-token": getCsrfToken(),
        "x-twitter-active-user": "yes",
        "x-twitter-auth-type": "OAuth2Session",
        accept: "*/*",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return parseAboutResponse(await response.json());
  }

  async function drainQueue() {
    if (draining) {
      return;
    }

    draining = true;

    while (queue.length > 0) {
      const waitFor = MIN_INTERVAL_MS - (Date.now() - lastFetchAt);
      if (waitFor > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitFor));
      }

      const handle = queue.shift();
      if (!handle) {
        continue;
      }

      queued.delete(handle);
      lastFetchAt = Date.now();

      try {
        const entry = await fetchAboutAccount(handle);
        setEntry(handle, entry ?? emptyEntry());
      } catch {
        setEntry(handle, emptyEntry());
      }
    }

    draining = false;
  }

  function upsertFromInterceptor(handle, basedIn, connectedVia, accurate) {
    if (!handle) {
      return;
    }

    const entry = {
      status: "resolved",
      basedIn: basedIn || "",
      connectedVia: connectedVia || "",
      accurate: accurate !== false,
      empty: !basedIn && !connectedVia,
      fetchedAt: Date.now(),
    };

    const key = handle.toLowerCase();
    queued.delete(key);
    const index = queue.indexOf(key);
    if (index >= 0) {
      queue.splice(index, 1);
    }

    setEntry(handle, entry);
  }

  function init(callback) {
    onUpdate = callback;

    if (!localStorage) {
      return;
    }

    localStorage.get({ [CACHE_KEY]: {} }, (result) => {
      const cache = result[CACHE_KEY] ?? {};
      const entries = Object.entries(cache).slice(-MAX_CACHE_ENTRIES);

      for (const [handle, entry] of entries) {
        if (entry?.status === "resolved") {
          memoryCache.set(handle.toLowerCase(), entry);
        }
      }

      onUpdate?.();
    });
  }

  globalThis.HUXAbout = {
    init,
    setQueryId,
    get,
    enqueue,
    upsertFromInterceptor,
  };
})();