(function () {
  "use strict";

  const MESSAGE_SOURCE = "hide-unverified-x";
  const FETCH_ABOUT_TYPE = "hux-fetch-about";
  const FALLBACK_QUERY_ID = "zs_jFPFT78rBpXv9Z3U2YQ";
  const CACHE_KEY = "aboutAccountCache";
  const RATE_LIMIT_KEY = "aboutAccountRateLimitedUntil";
  /**
   * Same AboutAccountQuery queue as the original country filter.
   * Strictly paced: X rate-limits this endpoint hard (breaks native
   * "About this account" UI for the whole session when abused).
   */
  const MAX_CONCURRENT = 1;
  const MIN_INTERVAL_MS = 1500;
  const MAX_CACHE_ENTRIES = 5000;
  const EMPTY_RETRY_MS = 60 * 60 * 1000;
  const ERROR_RETRY_MS = 2 * 60_000;
  /** Stop all About GraphQL for this long after HTTP 429 (persisted). */
  const RATE_LIMIT_BACKOFF_MS = 30 * 60_000;
  const REQUEST_TIMEOUT_MS = 12_000;

  let queryId = FALLBACK_QUERY_ID;
  let onUpdate = null;
  let persistTimer = null;
  let updateFrame = null;
  let pumpTimer = null;
  let inFlight = 0;
  let lastStartAt = 0;
  let rateLimitedUntil = 0;

  const memoryCache = new Map();
  const queued = new Set();
  /** @type {string[]} */
  const queue = [];
  const pendingTimers = new Map();

  const localStorage =
    globalThis.chrome?.storage?.local ?? globalThis.browser?.storage?.local;

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

  function errorEntry() {
    return {
      status: "error",
      basedIn: "",
      connectedVia: "",
      accurate: true,
      empty: false,
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
      localStorage.set({
        [CACHE_KEY]: aboutAccountCache,
        [RATE_LIMIT_KEY]: rateLimitedUntil > Date.now() ? rateLimitedUntil : 0,
      });
    }, 500);
  }

  function persistRateLimitNow() {
    if (!localStorage) {
      return;
    }

    localStorage.set({
      [RATE_LIMIT_KEY]: rateLimitedUntil > Date.now() ? rateLimitedUntil : 0,
    });
  }

  function isRateLimited() {
    return Date.now() < rateLimitedUntil;
  }

  /**
   * Drop everything waiting so we do not keep hitting X while limited.
   * In-flight requests may still finish; new ones will not start.
   */
  function clearQueue() {
    queue.length = 0;
    queued.clear();
    if (pumpTimer !== null) {
      clearTimeout(pumpTimer);
      pumpTimer = null;
    }
  }

  function applyRateLimit(durationMs = RATE_LIMIT_BACKOFF_MS) {
    rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + durationMs);
    clearQueue();
    persistRateLimitNow();
  }

  function notifyUpdate() {
    if (!onUpdate) {
      return;
    }

    // Coalesce rapid concurrent resolutions into one reprocess pass.
    if (updateFrame !== null) {
      return;
    }

    updateFrame = requestAnimationFrame(() => {
      updateFrame = null;
      onUpdate?.();
    });
  }

  function trimMemoryCache() {
    if (memoryCache.size <= MAX_CACHE_ENTRIES) {
      return;
    }

    const entries = [...memoryCache.entries()].sort(
      (left, right) => (left[1].fetchedAt ?? 0) - (right[1].fetchedAt ?? 0)
    );
    const excess = memoryCache.size - MAX_CACHE_ENTRIES;

    for (let i = 0; i < excess; i += 1) {
      memoryCache.delete(entries[i][0]);
    }
  }

  function shouldRetryEntry(entry) {
    if (!entry) {
      return false;
    }

    const age = Date.now() - (entry.fetchedAt ?? 0);

    if (entry.status === "error") {
      return age > ERROR_RETRY_MS;
    }

    if (entry.status === "resolved" && entry.empty) {
      return age > EMPTY_RETRY_MS;
    }

    return false;
  }

  function clearPendingTimer(handle) {
    const key = handle.toLowerCase();
    const timer = pendingTimers.get(key);
    if (timer != null) {
      clearTimeout(timer);
      pendingTimers.delete(key);
    }
  }

  function releaseInFlight(handle) {
    const key = handle.toLowerCase();
    // Only count down if we still had a pending timer (request we launched).
    if (pendingTimers.has(key)) {
      clearPendingTimer(key);
      inFlight = Math.max(0, inFlight - 1);
      return;
    }

    clearPendingTimer(key);
  }

  function setEntry(handle, entry) {
    const key = handle.toLowerCase();
    const existing = memoryCache.get(key);

    // Completing a pending request frees a concurrency slot.
    if (existing?.status === "pending") {
      releaseInFlight(key);
    } else {
      clearPendingTimer(key);
    }

    // Prefer not to overwrite fresher resolved data (e.g. interceptor race).
    if (
      existing?.status === "resolved" &&
      (existing.fetchedAt ?? 0) > (entry?.fetchedAt ?? 0)
    ) {
      pumpQueue();
      return;
    }

    // Prefer resolved data over a concurrent error response.
    if (existing?.status === "resolved" && entry?.status === "error") {
      pumpQueue();
      return;
    }

    memoryCache.set(key, entry);
    trimMemoryCache();
    schedulePersist();
    notifyUpdate();
    pumpQueue();
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

  function removeQueuedHandle(key) {
    queued.delete(key);
    const index = queue.indexOf(key);
    if (index >= 0) {
      queue.splice(index, 1);
    }
  }

  /**
   * @param {string} handle
   * @param {{ priority?: boolean }} [options] priority=true inserts at front
   */
  function enqueue(handle, options = {}) {
    if (!handle) {
      return;
    }

    // Do not pile on while X is rate-limiting AboutAccountQuery.
    if (isRateLimited()) {
      return;
    }

    const key = handle.toLowerCase();
    const existing = memoryCache.get(key);

    // Skip only if pending, or resolved and not yet due for empty-retry.
    // Error entries re-queue after ERROR_RETRY_MS via shouldRetryEntry.
    if (existing?.status === "pending" || queued.has(key)) {
      // Already queued — bump to front if high priority.
      if (options.priority && queued.has(key)) {
        const index = queue.indexOf(key);
        if (index > 0) {
          queue.splice(index, 1);
          queue.unshift(key);
        }
      }
      return;
    }

    if (existing?.status === "resolved" && !shouldRetryEntry(existing)) {
      return;
    }

    if (existing?.status === "error" && !shouldRetryEntry(existing)) {
      return;
    }

    memoryCache.set(key, { status: "pending" });
    queued.add(key);
    if (options.priority) {
      queue.unshift(key);
    } else {
      queue.push(key);
    }
    pumpQueue();
  }

  function armPendingTimeout(handle) {
    const key = handle.toLowerCase();
    clearPendingTimer(key);
    pendingTimers.set(
      key,
      setTimeout(() => {
        pendingTimers.delete(key);
        inFlight = Math.max(0, inFlight - 1);
        const entry = memoryCache.get(key);
        if (entry?.status === "pending") {
          // setEntry will pumpQueue; avoid double-decrement of inFlight
          memoryCache.set(key, errorEntry());
          schedulePersist();
          notifyUpdate();
          pumpQueue();
        } else {
          pumpQueue();
        }
      }, REQUEST_TIMEOUT_MS)
    );
  }

  /**
   * Ask the MAIN-world interceptor to fetch About this account with the real
   * X session cookies. Response arrives via hux-about-account postMessage.
   */
  function requestMainWorldFetch(handle) {
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: FETCH_ABOUT_TYPE,
        handle,
        queryId,
      },
      window.location.origin
    );
  }

  function schedulePump(delayMs) {
    if (pumpTimer !== null) {
      return;
    }

    pumpTimer = setTimeout(() => {
      pumpTimer = null;
      pumpQueue();
    }, Math.max(0, delayMs));
  }

  function pumpQueue() {
    if (queue.length === 0 || inFlight >= MAX_CONCURRENT) {
      return;
    }

    const now = Date.now();

    // Global pause after HTTP 429 so we do not keep hammering X.
    if (now < rateLimitedUntil) {
      schedulePump(rateLimitedUntil - now);
      return;
    }

    const waitFor = MIN_INTERVAL_MS - (now - lastStartAt);
    if (waitFor > 0) {
      schedulePump(waitFor);
      return;
    }

    const handle = queue.shift();
    if (!handle) {
      return;
    }

    queued.delete(handle);
    inFlight += 1;
    lastStartAt = Date.now();

    // Keep status pending until MAIN world responds (or timeout).
    memoryCache.set(handle, { status: "pending" });
    armPendingTimeout(handle);
    requestMainWorldFetch(handle);

    // Schedule the next start if more work remains.
    if (queue.length > 0 && inFlight < MAX_CONCURRENT) {
      schedulePump(MIN_INTERVAL_MS);
    }
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
    removeQueuedHandle(key);
    setEntry(handle, entry);
  }

  function markErrorFromInterceptor(handle, options = {}) {
    if (!handle) {
      return;
    }

    if (options.rateLimited) {
      applyRateLimit(RATE_LIMIT_BACKOFF_MS);
    }

    const key = handle.toLowerCase();
    removeQueuedHandle(key);
    setEntry(key, errorEntry());
  }

  function init(callback) {
    onUpdate = callback;

    if (!localStorage) {
      return;
    }

    localStorage.get(
      { [CACHE_KEY]: {}, [RATE_LIMIT_KEY]: 0 },
      (result) => {
        const storedLimit = Number(result[RATE_LIMIT_KEY]) || 0;
        if (storedLimit > Date.now()) {
          rateLimitedUntil = storedLimit;
          clearQueue();
        }

        const cache = result[CACHE_KEY] ?? {};
        const entries = Object.entries(cache).slice(-MAX_CACHE_ENTRIES);

        for (const [handle, entry] of entries) {
          if (entry?.status !== "resolved") {
            continue;
          }

          const key = handle.toLowerCase();
          // Only load from disk if missing or disk entry is as-fresh or fresher.
          if (
            !memoryCache.has(key) ||
            (entry.fetchedAt ?? 0) >= (memoryCache.get(key).fetchedAt ?? 0)
          ) {
            memoryCache.set(key, entry);
          }
        }

        trimMemoryCache();
        onUpdate?.();
      }
    );
  }

  globalThis.HUXAbout = {
    init,
    setQueryId,
    get,
    enqueue,
    upsertFromInterceptor,
    markErrorFromInterceptor,
    /** Emergency stop — e.g. after a 429 storm. */
    pauseLookups: applyRateLimit,
    isRateLimited,
  };
})();
