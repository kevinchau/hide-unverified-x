(function () {
  "use strict";

  const MESSAGE_SOURCE = "hide-unverified-x";
  const READY_TYPE = "hux-ready";

  if (window.__huxNetworkHooked) {
    return;
  }

  window.__huxNetworkHooked = true;

  let consumerReady = false;
  const messageBuffer = [];

  function publish(message) {
    const payload = {
      source: MESSAGE_SOURCE,
      ...message,
    };

    if (!consumerReady) {
      messageBuffer.push(payload);
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

  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      event.origin !== window.location.origin ||
      event.data?.source !== MESSAGE_SOURCE ||
      event.data?.type !== READY_TYPE
    ) {
      return;
    }

    flushBuffer();
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

  function handleAboutAccountPayload(payload, url) {
    const queryMatch = url.match(/\/graphql\/([^/]+)\/AboutAccountQuery/);
    if (queryMatch?.[1]) {
      publish({
        type: "hux-about-query-id",
        queryId: queryMatch[1],
      });
    }

    const result =
      payload?.data?.user_result_by_screen_name?.result ||
      payload?.data?.user_result?.result ||
      payload?.data?.user?.result ||
      null;

    if (!result) {
      return;
    }

    const handle = readHandle(result);
    const about = readAboutProfile(result);
    if (!handle || !about) {
      return;
    }

    publish({
      type: "hux-about-account",
      handle: handle.toLowerCase(),
      basedIn: about.basedIn,
      connectedVia: about.connectedVia,
      accurate: about.accurate,
    });
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

  function walkForFollowingUsers(value, found, visited) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (visited.has(value)) {
      return;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        walkForFollowingUsers(item, found, visited);
      }
      return;
    }

    const handle = readFollowingHandle(value);
    if (handle && isFollowingUser(value)) {
      found.add(handle);
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") {
        walkForFollowingUsers(child, found, visited);
      }
    }
  }

  function handleFollowingUsersPayload(payload) {
    const found = new Set();
    walkForFollowingUsers(payload, found, new WeakSet());

    if (!found.size) {
      return;
    }

    publish({
      type: "hux-following-users",
      handles: [...found],
    });
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
      normalized.includes("vous suivez") ||
      normalized.includes("que sigues") ||
      normalized.includes("die du folgst") ||
      normalized.includes("フォローしている");

    return hasFollowedBy && hasYouFollow;
  }

  function typeIndicatesFollowedByYouFollow(type) {
    const normalized = String(type).toLowerCase();
    return (
      normalized.includes("friendsfollowing") ||
      normalized.includes("followedbyfriend") ||
      normalized.includes("trustedfriend") ||
      normalized.includes("socialproof")
    );
  }

  function objectIndicatesFollowedByYouFollow(obj, visited, depth) {
    if (!obj || depth > MAX_SOCIAL_PROOF_DEPTH) {
      return false;
    }

    if (typeof obj === "string") {
      return textIndicatesFollowedByYouFollow(obj);
    }

    if (typeof obj !== "object") {
      return false;
    }

    if (visited.has(obj)) {
      return false;
    }

    visited.add(obj);

    if (Array.isArray(obj)) {
      return obj.some((item) =>
        objectIndicatesFollowedByYouFollow(item, visited, depth + 1)
      );
    }

    for (const [key, value] of Object.entries(obj)) {
      if (
        /social|proof|context/i.test(key) &&
        typeIndicatesFollowedByYouFollow(value?.type || value?.__typename || key)
      ) {
        return true;
      }

      if (objectIndicatesFollowedByYouFollow(value, visited, depth + 1)) {
        return true;
      }
    }

    return false;
  }

  function subtreeHasFollowedByYouFollowProof(value, visited, depth) {
    if (!value || depth > MAX_SOCIAL_PROOF_DEPTH) {
      return false;
    }

    if (typeof value === "string") {
      return textIndicatesFollowedByYouFollow(value);
    }

    if (typeof value !== "object") {
      return false;
    }

    if (visited.has(value)) {
      return false;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      return value.some((item) =>
        subtreeHasFollowedByYouFollowProof(item, visited, depth + 1)
      );
    }

    for (const child of Object.values(value)) {
      if (typeof child === "string" && textIndicatesFollowedByYouFollow(child)) {
        return true;
      }

      if (child && typeof child === "object") {
        if (subtreeHasFollowedByYouFollowProof(child, visited, depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  function tryExtractSubjectHandle(value) {
    if (!value || typeof value !== "object") {
      return "";
    }

    const tweetAuthor = tryExtractTweetAuthor(value);
    if (tweetAuthor?.handle) {
      return tweetAuthor.handle;
    }

    const userCandidates = [
      value.core?.user_results?.result,
      value.user_results?.result,
      value.result?.core?.user_results?.result,
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

    return "";
  }

  function walkForFollowedByFollowingUsers(value, found, visited) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (visited.has(value)) {
      return;
    }

    visited.add(value);

    if (subtreeHasFollowedByYouFollowProof(value, new WeakSet(), 0)) {
      const handle = tryExtractSubjectHandle(value);
      if (handle) {
        found.add(handle);
      }
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        walkForFollowedByFollowingUsers(item, found, visited);
      }
      return;
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") {
        walkForFollowedByFollowingUsers(child, found, visited);
      }
    }
  }

  function handleFollowedByFollowingPayload(payload) {
    const found = new Set();
    walkForFollowedByFollowingUsers(payload, found, new WeakSet());

    if (!found.size) {
      return;
    }

    publish({
      type: "hux-followed-by-following",
      handles: [...found],
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
    const tweetId = readTweetId(obj);
    if (!tweetId) {
      return null;
    }

    const user = readUserFromTweet(obj);
    if (!user) {
      return null;
    }

    const handle = readFollowingHandle(user);
    if (!handle) {
      return null;
    }

    return {
      tweetId,
      handle,
      following: isFollowingUser(user),
    };
  }

  function walkForTweetAuthors(value, found, visited) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (visited.has(value)) {
      return;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        walkForTweetAuthors(item, found, visited);
      }
      return;
    }

    const author = tryExtractTweetAuthor(value);
    if (author) {
      found.set(author.tweetId, author);
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") {
        walkForTweetAuthors(child, found, visited);
      }
    }
  }

  function handleTweetAuthorsPayload(payload) {
    const found = new Map();
    walkForTweetAuthors(payload, found, new WeakSet());

    if (!found.size) {
      return;
    }

    publish({
      type: "hux-tweet-authors",
      tweets: [...found.values()],
    });
  }

  function inspectResponse(response, url) {
    if (!url || !url.includes("/i/api/graphql/")) {
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

    handleFollowingUsersPayload(payload);
    handleFollowedByFollowingPayload(payload);
    handleTweetAuthorsPayload(payload);
  }

  const originalFetch = window.fetch.bind(window);
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
})();