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
  const MAX_CACHE_ENTRIES = 10_000;
  const EMPTY_RETRY_MS = 60 * 60 * 1000;
  const ERROR_RETRY_MS = 2 * 60_000;
  /** Fallback pause when X 429s without a usable x-rate-limit-reset header. */
  const RATE_LIMIT_BACKOFF_MS = 30 * 60_000;
  /** Small buffer after X's reset timestamp so the window has flipped. */
  const RATE_LIMIT_RESET_BUFFER_MS = 3_000;
  const REQUEST_TIMEOUT_MS = 12_000;
  /**
   * Sightings with the same cached location (spaced out) before we treat the
   * cache as trusted and stop live AboutAccountQuery checks. Country filter
   * still uses the cached location — trust only saves API calls.
   */
  const TRUST_LOCATION_HITS = 3;
  /** Min time between location confirmations so one scroll pass ≠ instant trust. */
  const TRUST_HIT_MIN_GAP_MS = 15 * 60 * 1000;

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

  function emptyEntry(stats = {}) {
    return {
      status: "resolved",
      basedIn: "",
      connectedVia: "",
      accurate: true,
      empty: true,
      fetchedAt: Date.now(),
      encounterCount: stats.encounterCount || 0,
      lastSeenAt: stats.lastSeenAt || 0,
      locationHits: 0,
      trusted: false,
    };
  }

  function errorEntry(stats = {}) {
    return {
      status: "error",
      basedIn: "",
      connectedVia: "",
      accurate: true,
      empty: false,
      fetchedAt: Date.now(),
      encounterCount: stats.encounterCount || 0,
      lastSeenAt: stats.lastSeenAt || 0,
      locationHits: stats.locationHits || 0,
      trusted: stats.trusted === true,
    };
  }

  function locationKey(basedIn, connectedVia) {
    return `${String(basedIn || "")
      .trim()
      .toLowerCase()}|${String(connectedVia || "")
      .trim()
      .toLowerCase()}`;
  }

  function retentionScore(entry) {
    if (!entry) {
      return 0;
    }
    // Prefer frequent + recently seen accounts when the cache is full.
    // Trusted / high locationHits get a boost so stable identities stick.
    const encounters = entry.encounterCount || 0;
    const seen = entry.lastSeenAt || entry.fetchedAt || 0;
    const trustBoost = entry.trusted ? 1e12 : (entry.locationHits || 0) * 1e9;
    return trustBoost + encounters * 1e7 + seen;
  }

  function pickStats(existing) {
    return {
      encounterCount: existing?.encounterCount || 0,
      lastSeenAt: existing?.lastSeenAt || 0,
      locationHits: existing?.locationHits || 0,
      trusted: existing?.trusted === true,
    };
  }

  /**
   * On a fresh About API result: keep hit count if location unchanged, else reset.
   * Trust is mainly earned via recordEncounter (repeat sightings), not re-fetches.
   */
  function withLocationTrust(existing, basedIn, connectedVia, empty) {
    const stats = pickStats(existing);
    const nextKey = locationKey(basedIn, connectedVia);

    if (empty || nextKey === "|") {
      return {
        locationHits: 0,
        trusted: false,
        lastLocationConfirmAt: 0,
        encounterCount: stats.encounterCount,
        lastSeenAt: stats.lastSeenAt,
      };
    }

    const prevKey = existing
      ? locationKey(existing.basedIn, existing.connectedVia)
      : "|";

    if (
      existing?.status === "resolved" &&
      !existing.empty &&
      prevKey === nextKey
    ) {
      const locationHits = Math.max(existing.locationHits || 1, 1);
      const trusted =
        existing.trusted === true || locationHits >= TRUST_LOCATION_HITS;
      return {
        locationHits,
        trusted,
        lastLocationConfirmAt: existing.lastLocationConfirmAt || 0,
        encounterCount: stats.encounterCount,
        lastSeenAt: stats.lastSeenAt,
      };
    }

    // New or changed location — must re-earn trust; will need live checks again.
    return {
      locationHits: 1,
      trusted: false,
      lastLocationConfirmAt: Date.now(),
      encounterCount: stats.encounterCount,
      lastSeenAt: stats.lastSeenAt,
    };
  }

  /**
   * Count a feed sighting. Frequent handles are retained preferentially when
   * the cache trims. Repeat sightings with a stable cached location earn trust
   * so we can skip further About API lookups (country filter still applies).
   */
  function recordEncounter(handle) {
    if (!handle) {
      return;
    }

    const key = handle.toLowerCase();
    const existing = memoryCache.get(key);
    const now = Date.now();

    if (!existing) {
      memoryCache.set(key, {
        status: "unknown",
        basedIn: "",
        connectedVia: "",
        accurate: true,
        empty: true,
        encounterCount: 1,
        lastSeenAt: now,
        locationHits: 0,
        lastLocationConfirmAt: 0,
        trusted: false,
      });
    } else {
      existing.encounterCount = (existing.encounterCount || 0) + 1;
      existing.lastSeenAt = now;

      // Confirm cached location on spaced sightings (not every rAF reprocess).
      if (
        existing.status === "resolved" &&
        !existing.empty &&
        (existing.basedIn || existing.connectedVia)
      ) {
        const lastConfirm = existing.lastLocationConfirmAt || 0;
        if (now - lastConfirm >= TRUST_HIT_MIN_GAP_MS) {
          existing.locationHits = (existing.locationHits || 1) + 1;
          existing.lastLocationConfirmAt = now;
          if (existing.locationHits >= TRUST_LOCATION_HITS) {
            existing.trusted = true;
          }
        }
      }

      memoryCache.set(key, existing);
    }

    trimMemoryCache();
    schedulePersist();
  }

  function isTrusted(handle) {
    if (!handle) {
      return false;
    }

    return memoryCache.get(handle.toLowerCase())?.trusted === true;
  }

  /** Trusted + resolved location → never spend another AboutAccountQuery. */
  function shouldSkipLiveLookup(entry) {
    return (
      entry?.trusted === true &&
      entry?.status === "resolved" &&
      entry.empty !== true &&
      !!(entry.basedIn || entry.connectedVia)
    );
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

  /**
   * Honor X's AboutAccountQuery headers:
   *   x-rate-limit-limit: 50
   *   x-rate-limit-remaining: 0
   *   x-rate-limit-reset: <unix seconds>
   */
  function applyRateLimitFromHeaders(options = {}) {
    const resetUnix = Number(options.rateLimitReset) || 0;
    const remaining = options.rateLimitRemaining;
    const status = options.status;
    const forced =
      options.rateLimited === true || status === 429 || remaining === 0;

    if (!forced && remaining != null && remaining > 0) {
      return;
    }

    if (resetUnix > 1_000_000_000) {
      // Prefer X's exact reset clock over a fixed 30m guess.
      const until = resetUnix * 1000 + RATE_LIMIT_RESET_BUFFER_MS;
      if (until > Date.now()) {
        rateLimitedUntil = Math.max(rateLimitedUntil, until);
        clearQueue();
        persistRateLimitNow();
        return;
      }
    }

    if (forced) {
      applyRateLimit(RATE_LIMIT_BACKOFF_MS);
    }
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

    // Lowest retention score first (rare + cold + untrusted) get dropped.
    const entries = [...memoryCache.entries()].sort(
      (left, right) => retentionScore(left[1]) - retentionScore(right[1])
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

    // Carry encounter / trust stats across status transitions.
    const merged = {
      ...entry,
      encounterCount: Math.max(
        existing?.encounterCount || 0,
        entry.encounterCount || 0
      ),
      lastSeenAt: Math.max(
        existing?.lastSeenAt || 0,
        entry.lastSeenAt || 0,
        Date.now()
      ),
      locationHits:
        entry.locationHits != null
          ? entry.locationHits
          : existing?.locationHits || 0,
      trusted:
        entry.trusted === true ||
        (existing?.trusted === true && entry.status !== "error"),
    };

    memoryCache.set(key, merged);
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

  /**
   * Drop a handle from the About cache (e.g. user clicked the location badge
   * to force a fresh lookup on the next enqueue).
   */
  function remove(handle) {
    if (!handle) {
      return false;
    }

    const key = handle.toLowerCase();
    removeQueuedHandle(key);
    clearPendingTimer(key);
    const existed = memoryCache.delete(key);
    if (existed) {
      schedulePersist();
      notifyUpdate();
    }
    return existed;
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

    // Trusted stable location: use cache only — no live About API.
    if (shouldSkipLiveLookup(existing)) {
      return;
    }

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

    const stats = pickStats(existing);
    memoryCache.set(key, {
      status: "pending",
      basedIn: existing?.basedIn || "",
      connectedVia: existing?.connectedVia || "",
      accurate: existing?.accurate !== false,
      empty: existing?.empty === true,
      fetchedAt: existing?.fetchedAt || 0,
      encounterCount: stats.encounterCount,
      lastSeenAt: stats.lastSeenAt || Date.now(),
      locationHits: stats.locationHits,
      trusted: stats.trusted,
    });
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
          memoryCache.set(key, errorEntry(pickStats(entry)));
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
    {
      const existing = memoryCache.get(handle);
      const stats = pickStats(existing);
      memoryCache.set(handle, {
        status: "pending",
        basedIn: existing?.basedIn || "",
        connectedVia: existing?.connectedVia || "",
        accurate: existing?.accurate !== false,
        empty: existing?.empty === true,
        fetchedAt: existing?.fetchedAt || 0,
        encounterCount: stats.encounterCount,
        lastSeenAt: stats.lastSeenAt || Date.now(),
        locationHits: stats.locationHits,
        trusted: stats.trusted,
      });
    }
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

    const key = handle.toLowerCase();
    const existing = memoryCache.get(key);
    const based = basedIn || "";
    const via = connectedVia || "";
    const empty = !based && !via;
    const trust = withLocationTrust(existing, based, via, empty);

    const entry = {
      status: "resolved",
      basedIn: based,
      connectedVia: via,
      accurate: accurate !== false,
      empty,
      fetchedAt: Date.now(),
      encounterCount: trust.encounterCount,
      lastSeenAt: Math.max(trust.lastSeenAt || 0, Date.now()),
      locationHits: trust.locationHits,
      lastLocationConfirmAt: trust.lastLocationConfirmAt || Date.now(),
      trusted: trust.trusted,
    };

    removeQueuedHandle(key);
    setEntry(handle, entry);
  }

  function markErrorFromInterceptor(handle, options = {}) {
    if (!handle) {
      return;
    }

    if (
      options.rateLimited ||
      options.status === 429 ||
      options.rateLimitRemaining === 0
    ) {
      applyRateLimitFromHeaders(options);
    }

    const key = handle.toLowerCase();
    const existing = memoryCache.get(key);
    removeQueuedHandle(key);
    setEntry(key, errorEntry(pickStats(existing)));
  }

  function noteRateLimitFromInterceptor(options = {}) {
    applyRateLimitFromHeaders(options);
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
        // Load highest-retention entries when the on-disk cache is large.
        const entries = Object.entries(cache)
          .sort((a, b) => retentionScore(b[1]) - retentionScore(a[1]))
          .slice(0, MAX_CACHE_ENTRIES);

        for (const [handle, entry] of entries) {
          // Keep resolved (and trusted/unknown with stats) so encounter counts survive.
          if (
            entry?.status !== "resolved" &&
            entry?.status !== "unknown" &&
            !(entry?.encounterCount > 0)
          ) {
            continue;
          }

          const key = handle.toLowerCase();
          // Only load from disk if missing or disk entry is as-fresh or fresher.
          if (
            !memoryCache.has(key) ||
            (entry.fetchedAt ?? 0) >= (memoryCache.get(key).fetchedAt ?? 0) ||
            (entry.encounterCount || 0) >
              (memoryCache.get(key)?.encounterCount || 0)
          ) {
            memoryCache.set(key, {
              ...entry,
              encounterCount: entry.encounterCount || 0,
              lastSeenAt: entry.lastSeenAt || entry.fetchedAt || 0,
              locationHits: entry.locationHits || 0,
              lastLocationConfirmAt: entry.lastLocationConfirmAt || 0,
              trusted: entry.trusted === true,
            });
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
    remove,
    enqueue,
    recordEncounter,
    isTrusted,
    upsertFromInterceptor,
    markErrorFromInterceptor,
    noteRateLimitFromInterceptor,
    /** Emergency stop — e.g. after a 429 storm. */
    pauseLookups: applyRateLimit,
    isRateLimited,
    TRUST_LOCATION_HITS,
    MAX_CACHE_ENTRIES,
  };
})();
