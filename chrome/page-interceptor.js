(function () {
  "use strict";

  const MESSAGE_SOURCE = "hide-unverified-x";
  const READY_TYPE = "hux-ready";
  const CONFIG_TYPE = "hux-config";
  const FETCH_ABOUT_TYPE = "hux-fetch-about";
  const BEARER =
    "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
  const FALLBACK_ABOUT_QUERY_ID = "zs_jFPFT78rBpXv9Z3U2YQ";

  if (window.__huxNetworkHooked) {
    return;
  }

  window.__huxNetworkHooked = true;

  let consumerReady = false;
  const messageBuffer = [];
  const MAX_MESSAGE_BUFFER = 200;
  let aboutQueryId = FALLBACK_ABOUT_QUERY_ID;
  const aboutFetchInFlight = new Set();

  // Feature gates pushed from the isolated-world content script (hux-config).
  // Default off so a default-configured user never pays for the expensive
  // timeline-payload walks below. AboutAccountQuery handling is never gated.
  let wantFollowingData = false;
  let wantFollowedByData = false;

  const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
  const QUERY_ID_RE = /^[A-Za-z0-9_-]{5,64}$/;
  const MAX_HANDLES = 500;
  const MAX_TEXT_LEN = 200;

  function sanitizeHandle(value) {
    if (typeof value !== "string") {
      return "";
    }

    const handle = value.trim().replace(/^@/, "").toLowerCase();
    return HANDLE_RE.test(handle) ? handle : "";
  }

  function sanitizeHandles(values) {
    if (!Array.isArray(values)) {
      return [];
    }

    const seen = new Set();
    const result = [];

    for (const value of values) {
      if (result.length >= MAX_HANDLES) {
        break;
      }

      const handle = sanitizeHandle(value);
      if (!handle || seen.has(handle)) {
        continue;
      }

      seen.add(handle);
      result.push(handle);
    }

    return result;
  }

  function sanitizeText(value) {
    if (value == null) {
      return "";
    }

    const text = String(value).replace(/\s+/g, " ").trim();
    if (!text) {
      return "";
    }

    return text.length > MAX_TEXT_LEN ? text.slice(0, MAX_TEXT_LEN) : text;
  }

  function sanitizeQueryId(value) {
    if (typeof value !== "string") {
      return "";
    }

    const queryId = value.trim();
    return QUERY_ID_RE.test(queryId) ? queryId : "";
  }

  function publish(message) {
    const payload = {
      source: MESSAGE_SOURCE,
      ...message,
    };

    if (!consumerReady) {
      messageBuffer.push(payload);
      if (messageBuffer.length > MAX_MESSAGE_BUFFER) {
        messageBuffer.splice(0, messageBuffer.length - MAX_MESSAGE_BUFFER);
      }
      return;
    }

    window.postMessage(payload, window.location.origin);
  }

  function flushBuffer() {
    consumerReady = true;

    for (const payload of messageBuffer) {
      window.postMessage(payload, window.location.origin);
    }

    messageBuffer.length = 0;
  }

  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function setAboutQueryId(nextQueryId) {
    const queryId = sanitizeQueryId(nextQueryId);
    if (!queryId || queryId === aboutQueryId) {
      return;
    }

    aboutQueryId = queryId;
  }

  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      event.origin !== window.location.origin ||
      event.data?.source !== MESSAGE_SOURCE
    ) {
      return;
    }

    if (event.data.type === READY_TYPE) {
      flushBuffer();
      return;
    }

    // Content script tells us which following/social-proof features are on so
    // we can skip walking (and even JSON-parsing) large timeline payloads when
    // nothing consumes the result.
    if (event.data.type === CONFIG_TYPE) {
      wantFollowingData = event.data.following === true;
      wantFollowedByData = event.data.followedBy === true;
      return;
    }

    // Content script asks the page context to fetch About this account so the
    // request uses the real X session cookies (isolated-world fetch often cannot).
    if (event.data.type === FETCH_ABOUT_TYPE) {
      const handle = sanitizeHandle(event.data.handle);
      if (!handle) {
        return;
      }

      if (event.data.queryId) {
        setAboutQueryId(event.data.queryId);
      }

      void fetchAboutAccountInPage(handle);
    }
  });

  function readAboutProfile(result) {
    const about = result?.about_profile || result?.aboutProfile || null;
    if (!about) {
      return null;
    }

    return {
      basedIn: about.account_based_in || about.accountBasedIn || "",
      connectedVia: about.source || "",
      accurate: about.location_accurate !== false,
    };
  }

  function readHandle(result) {
    return (
      result?.core?.screen_name ||
      result?.legacy?.screen_name ||
      result?.legacy?.screenName ||
      ""
    );
  }

  function publishAboutAccount(handle, about) {
    publish({
      type: "hux-about-account",
      handle,
      basedIn: sanitizeText(about?.basedIn || ""),
      connectedVia: sanitizeText(about?.connectedVia || ""),
      accurate: about?.accurate !== false,
    });
  }

  function publishAboutAccountError(handle, extra = {}) {
    publish({
      type: "hux-about-account-error",
      handle,
      rateLimited: extra.rateLimited === true,
      status: typeof extra.status === "number" ? extra.status : 0,
      rateLimitReset: typeof extra.rateLimitReset === "number" ? extra.rateLimitReset : 0,
      rateLimitRemaining:
        typeof extra.rateLimitRemaining === "number"
          ? extra.rateLimitRemaining
          : null,
      rateLimitLimit:
        typeof extra.rateLimitLimit === "number" ? extra.rateLimitLimit : null,
    });
  }

  /**
   * X returns x-rate-limit-limit / remaining / reset on AboutAccountQuery.
   * Example 429: limit=50, remaining=0, reset=<unix seconds>.
   */
  function readRateLimitHeaders(response) {
    if (!response?.headers?.get) {
      return null;
    }

    const limitRaw = response.headers.get("x-rate-limit-limit");
    const remainingRaw = response.headers.get("x-rate-limit-remaining");
    const resetRaw = response.headers.get("x-rate-limit-reset");

    const limit = limitRaw != null ? Number(limitRaw) : NaN;
    const remaining = remainingRaw != null ? Number(remainingRaw) : NaN;
    const reset = resetRaw != null ? Number(resetRaw) : NaN;

    if (
      !Number.isFinite(limit) &&
      !Number.isFinite(remaining) &&
      !Number.isFinite(reset)
    ) {
      return null;
    }

    return {
      limit: Number.isFinite(limit) ? limit : null,
      remaining: Number.isFinite(remaining) ? remaining : null,
      reset: Number.isFinite(reset) ? reset : null,
    };
  }

  function publishRateLimitState(rate, httpStatus) {
    if (!rate) {
      return;
    }

    publish({
      type: "hux-about-rate-limit",
      rateLimitLimit: rate.limit,
      rateLimitRemaining: rate.remaining,
      rateLimitReset: rate.reset,
      status: typeof httpStatus === "number" ? httpStatus : 0,
      rateLimited:
        httpStatus === 429 ||
        rate.remaining === 0 ||
        (rate.reset != null && rate.reset * 1000 > Date.now() && rate.remaining === 0),
    });
  }

  function handleAboutAccountPayload(payload, url) {
    const queryMatch = url.match(/\/graphql\/([^/]+)\/AboutAccountQuery/);
    if (queryMatch?.[1]) {
      const queryId = sanitizeQueryId(queryMatch[1]);
      if (queryId) {
        setAboutQueryId(queryId);
        publish({
          type: "hux-about-query-id",
          queryId,
        });
      }
    }

    const result =
      payload?.data?.user_result_by_screen_name?.result ||
      payload?.data?.user_result?.result ||
      payload?.data?.user?.result ||
      null;

    if (!result) {
      return false;
    }

    const handle = sanitizeHandle(readHandle(result));
    if (!handle) {
      return false;
    }

    // Publish even when about_profile is missing so the content script can
    // mark the account as empty (no location badge) instead of hanging pending.
    publishAboutAccount(handle, readAboutProfile(result));
    return true;
  }

  // Assigned when the fetch hook installs (end of this IIFE).
  let originalFetch = null;

  async function fetchAboutAccountInPage(handle) {
    const key = handle.toLowerCase();
    if (aboutFetchInFlight.has(key)) {
      return;
    }

    aboutFetchInFlight.add(key);

    try {
      const variables = { screenName: handle };
      const url =
        `https://x.com/i/api/graphql/${aboutQueryId}/AboutAccountQuery?variables=` +
        encodeURIComponent(JSON.stringify(variables));

      const doFetch = originalFetch || window.fetch.bind(window);
      const response = await doFetch(url, {
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

      const rate = readRateLimitHeaders(response);
      publishRateLimitState(rate, response.status);

      if (!response.ok) {
        publishAboutAccountError(handle, {
          status: response.status,
          rateLimited: response.status === 429 || rate?.remaining === 0,
          rateLimitReset: rate?.reset ?? 0,
          rateLimitRemaining: rate?.remaining,
          rateLimitLimit: rate?.limit,
        });
        return;
      }

      const payload = await response.json();
      const published = handleAboutAccountPayload(payload, url);
      if (!published) {
        publishAboutAccountError(handle);
      }
    } catch {
      publishAboutAccountError(handle);
    } finally {
      aboutFetchInFlight.delete(key);
    }
  }

  function readFollowingHandle(user) {
    return (
      user?.core?.screen_name ||
      user?.legacy?.screen_name ||
      user?.legacy?.screenName ||
      ""
    )
      .trim()
      .toLowerCase();
  }

  function looksLikeUser(user) {
    if (!user || typeof user !== "object") {
      return false;
    }

    if (user.__typename === "User") {
      return true;
    }

    return !!(
      user.legacy?.screen_name ||
      user.core?.screen_name ||
      user.legacy?.screenName
    );
  }

  function isFollowingUser(user) {
    if (!looksLikeUser(user)) {
      return false;
    }

    if (user.legacy?.following === true) {
      return true;
    }

    const perspectives = user.relationship_perspectives;
    if (perspectives?.following === true) {
      return true;
    }

    return user.relationship?.following === true;
  }

  // Single traversal that collects both "accounts you follow" and per-tweet
  // authors. These were previously two independent full walks of every payload.
  function walkUsersAndTweets(value, followingSet, tweetMap, visited) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (visited.has(value)) {
      return;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        walkUsersAndTweets(item, followingSet, tweetMap, visited);
      }
      return;
    }

    const handle = readFollowingHandle(value);
    if (handle && isFollowingUser(value)) {
      followingSet.add(handle);
    }

    const author = tryExtractTweetAuthor(value);
    if (author) {
      tweetMap.set(author.tweetId, author);
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") {
        walkUsersAndTweets(child, followingSet, tweetMap, visited);
      }
    }
  }

  function scanUsersAndTweets(payload) {
    const followingSet = new Set();
    const tweetMap = new Map();
    walkUsersAndTweets(payload, followingSet, tweetMap, new WeakSet());

    const handles = sanitizeHandles([...followingSet]);
    if (handles.length) {
      publish({
        type: "hux-following-users",
        handles,
      });
    }

    if (!tweetMap.size) {
      return;
    }

    const tweets = [];
    for (const tweet of tweetMap.values()) {
      const handle = sanitizeHandle(tweet.handle);
      if (!handle) {
        continue;
      }

      const tweetId = sanitizeText(tweet.tweetId);
      if (!tweetId) {
        continue;
      }

      tweets.push({
        tweetId,
        handle,
        following: tweet.following === true,
      });
    }

    if (tweets.length) {
      publish({
        type: "hux-tweet-authors",
        tweets,
      });
    }
  }

  const MAX_SOCIAL_PROOF_DEPTH = 8;

  function textIndicatesFollowedByYouFollow(text) {
    const normalized = String(text).replace(/\s+/g, " ").trim().toLowerCase();
    const hasFollowedBy =
      normalized.includes("followed by") ||
      normalized.includes("suivi par") ||
      normalized.includes("seguido por") ||
      normalized.includes("gefolgt von");
    const hasYouFollow =
      normalized.includes("you follow") ||
      normalized.includes("others you follow") ||
      normalized.includes("vous suivez") ||
      normalized.includes("que sigues") ||
      normalized.includes("die du folgst") ||
      normalized.includes("フォローしている");

    return hasFollowedBy && hasYouFollow;
  }

  function isSocialProofBranchKey(key) {
    return /social|proof|facepile|context/i.test(String(key));
  }

  // Mark every node whose subtree contains "followed by … you follow" proof
  // text, in a single O(n) pass, and report whether the payload has any proof
  // at all. Replaces a per-node full-subtree rescan that made followed-by-
  // following extraction O(n²) on large timeline payloads.
  function collectProofNodes(value, visited, proofNodes) {
    if (!value || typeof value !== "object") {
      return false;
    }

    if (visited.has(value)) {
      return proofNodes.has(value);
    }

    visited.add(value);

    let hasProof = false;
    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      if (typeof child === "string") {
        if (textIndicatesFollowedByYouFollow(child)) {
          hasProof = true;
        }
      } else if (child && typeof child === "object") {
        // Do not short-circuit: every descendant still needs its proof status
        // recorded so the extraction pass can attribute a subject to each.
        if (collectProofNodes(child, visited, proofNodes)) {
          hasProof = true;
        }
      }
    }

    if (hasProof) {
      proofNodes.add(value);
    }

    return hasProof;
  }

  function tryExtractPrimarySubjectHandle(value, visited, depth, inSocialBranch) {
    if (!value || depth > MAX_SOCIAL_PROOF_DEPTH || typeof value !== "object") {
      return "";
    }

    if (visited.has(value)) {
      return "";
    }

    visited.add(value);

    if (!inSocialBranch) {
      const tweetAuthor = tryExtractTweetAuthor(value);
      if (tweetAuthor?.handle) {
        return tweetAuthor.handle;
      }

      const userCandidates = [
        value.core?.user_results?.result,
        value.user_results?.result,
        value.result?.core?.user_results?.result,
        value.legacy?.user,
      ];

      if (value.__typename === "User" || looksLikeUser(value)) {
        userCandidates.unshift(value);
      }

      for (const user of userCandidates) {
        if (!user || typeof user !== "object") {
          continue;
        }

        const handle = readFollowingHandle(user);
        if (handle) {
          return handle;
        }
      }
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const handle = tryExtractPrimarySubjectHandle(
          item,
          visited,
          depth + 1,
          inSocialBranch
        );
        if (handle) {
          return handle;
        }
      }

      return "";
    }

    for (const [key, child] of Object.entries(value)) {
      if (!child || typeof child !== "object") {
        continue;
      }

      const handle = tryExtractPrimarySubjectHandle(
        child,
        visited,
        depth + 1,
        inSocialBranch || isSocialProofBranchKey(key)
      );
      if (handle) {
        return handle;
      }
    }

    return "";
  }

  // For each node whose subtree carries proof text, attribute it to the nearest
  // tweet/user subject (same extraction as before, now driven by the precomputed
  // proof-node set instead of re-scanning each node's subtree).
  function extractFollowedBySubjects(value, visited, proofNodes, found) {
    if (!value || typeof value !== "object" || visited.has(value)) {
      return;
    }

    visited.add(value);

    if (proofNodes.has(value)) {
      const handle = tryExtractPrimarySubjectHandle(
        value,
        new WeakSet(),
        0,
        false
      );
      if (handle) {
        found.add(handle);
      }
    }

    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      if (child && typeof child === "object") {
        extractFollowedBySubjects(child, visited, proofNodes, found);
      }
    }
  }

  function handleFollowedByFollowingPayload(payload) {
    const proofNodes = new WeakSet();
    // Fast path: no social-proof text anywhere → nothing to attribute.
    if (!collectProofNodes(payload, new WeakSet(), proofNodes)) {
      return;
    }

    const found = new Set();
    extractFollowedBySubjects(payload, new WeakSet(), proofNodes, found);

    const handles = sanitizeHandles([...found]);
    if (!handles.length) {
      return;
    }

    publish({
      type: "hux-followed-by-following",
      handles,
    });
  }

  function readTweetId(obj) {
    if (!obj || typeof obj !== "object") {
      return "";
    }

    const id =
      obj.rest_id ||
      obj.legacy?.id_str ||
      obj.legacy?.id ||
      obj.id_str ||
      "";

    return String(id).trim();
  }

  function readUserFromTweet(obj) {
    const candidates = [
      obj?.core?.user_results?.result,
      obj?.tweet?.core?.user_results?.result,
      obj?.user_results?.result,
      obj?.legacy?.user,
      obj?.result?.core?.user_results?.result,
    ];

    for (const user of candidates) {
      if (user && typeof user === "object") {
        return user;
      }
    }

    return null;
  }

  function tryExtractTweetAuthor(obj) {
    const sources = [
      obj,
      obj?.tweet,
      obj?.result?.tweet,
      obj?.tweet_results?.result?.tweet,
      obj?.itemContent?.tweet_results?.result?.tweet,
    ].filter((candidate) => candidate && typeof candidate === "object");

    for (const source of sources) {
      const tweetId = readTweetId(source);
      if (!tweetId) {
        continue;
      }

      const user = readUserFromTweet(source);
      if (!user) {
        continue;
      }

      const handle = readFollowingHandle(user);
      if (!handle) {
        continue;
      }

      return {
        tweetId,
        handle,
        following: isFollowingUser(user),
      };
    }

    return null;
  }

  // Whether we need to parse this response body at all. Timeline payloads are
  // large and frequent — skip the parse + walks entirely unless a feature that
  // consumes them is enabled (AboutAccountQuery always needs its body).
  function shouldParseBody(url) {
    return (
      url.includes("AboutAccountQuery") ||
      wantFollowingData ||
      wantFollowedByData
    );
  }

  function inspectResponse(response, url) {
    if (!url || !url.includes("/i/api/graphql/")) {
      return;
    }

    // Always learn AboutAccountQuery budget from X's rate-limit headers
    // (native About page and our own fetches share the same bucket).
    if (url.includes("AboutAccountQuery")) {
      publishRateLimitState(readRateLimitHeaders(response), response.status);
    }

    if (!response.ok || !shouldParseBody(url)) {
      return;
    }

    response
      .clone()
      .json()
      .then((payload) => {
        inspectPayload(payload, url);
      })
      .catch(() => {});
  }

  function inspectPayload(payload, url) {
    if (!url || !url.includes("/i/api/graphql/")) {
      return;
    }

    if (url.includes("AboutAccountQuery")) {
      handleAboutAccountPayload(payload, url);
    }

    if (wantFollowingData) {
      scanUsersAndTweets(payload);
    }

    if (wantFollowedByData) {
      handleFollowedByFollowingPayload(payload);
    }
  }

  originalFetch = window.fetch.bind(window);
  window.fetch = function huxFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url;
    return originalFetch(input, init).then((response) => {
      inspectResponse(response, url);
      return response;
    });
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function huxXhrOpen(method, url, ...rest) {
    this._huxUrl = typeof url === "string" ? url : String(url ?? "");
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function huxXhrSend(...args) {
    this.addEventListener("load", function huxXhrLoad() {
      const url = this._huxUrl;
      if (!url?.includes("/i/api/graphql/")) {
        return;
      }

      if (!shouldParseBody(url)) {
        return;
      }

      const responseType = this.responseType;
      if (
        responseType &&
        responseType !== "text" &&
        responseType !== "" &&
        responseType !== "json"
      ) {
        return;
      }

      try {
        const payload =
          responseType === "json" ? this.response : JSON.parse(this.responseText);
        inspectPayload(payload, url);
      } catch {
        // Ignore non-JSON responses.
      }
    });

    return originalSend.apply(this, args);
  };

  // Tell the content script about SPA navigations (pushState / replaceState /
  // popstate). Isolated-world scripts do not see the page's history calls.
  let lastPublishedPath = location.pathname + location.search;
  function publishLocationIfChanged() {
    const next = location.pathname + location.search;
    if (next === lastPublishedPath) {
      return;
    }

    lastPublishedPath = next;
    publish({
      type: "hux-location",
      pathname: location.pathname,
      search: location.search || "",
    });
  }

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function huxPushState(...args) {
    const result = originalPushState(...args);
    queueMicrotask(publishLocationIfChanged);
    return result;
  };

  history.replaceState = function huxReplaceState(...args) {
    const result = originalReplaceState(...args);
    queueMicrotask(publishLocationIfChanged);
    return result;
  };

  window.addEventListener("popstate", () => {
    queueMicrotask(publishLocationIfChanged);
  });
})();