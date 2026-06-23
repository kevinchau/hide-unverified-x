(function () {
  "use strict";

  const MESSAGE_SOURCE = "hide-unverified-x";

  function publish(message) {
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        ...message,
      },
      window.location.origin
    );
  }

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

  function isFollowingUser(user) {
    if (!user || typeof user !== "object") {
      return false;
    }

    if (user.legacy?.following === true) {
      return true;
    }

    return user.relationship_perspectives?.following === true;
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

  function inspectResponse(response, url) {
    if (!url || !url.includes("/i/api/graphql/")) {
      return;
    }

    response
      .clone()
      .json()
      .then((payload) => {
        if (url.includes("AboutAccountQuery")) {
          handleAboutAccountPayload(payload, url);
        }

        handleFollowingUsersPayload(payload);
      })
      .catch(() => {});
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = function huxFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url;
    return originalFetch(input, init).then((response) => {
      inspectResponse(response, url);
      return response;
    });
  };
})();