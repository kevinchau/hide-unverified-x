(function () {
  "use strict";

  const MESSAGE_SOURCE = "hide-unverified-x";

  const GRAPHQL_OPERATIONS = [
    "HomeTimeline",
    "HomeLatestTimeline",
    "TweetDetail",
    "TweetResultByRestId",
    "SearchTimeline",
    "UserTweets",
    "UserTweetsAndReplies",
    "ListLatestTweetsTimeline",
    "Likes",
    "Bookmarks",
    "AboutAccountQuery",
  ];

  function shouldInspectUrl(url) {
    if (!url || !url.includes("/i/api/graphql/")) {
      return false;
    }

    return GRAPHQL_OPERATIONS.some((operation) => url.includes(operation));
  }

  function readBasedIn(user) {
    const about =
      user.about_profile ||
      user.aboutProfile ||
      user.about_module?.about_profile ||
      user.aboutModule?.aboutProfile ||
      null;

    if (!about) {
      return "";
    }

    return about.account_based_in || about.accountBasedIn || "";
  }

  function publishUser(handle, location, basedIn) {
    if (!handle) {
      return;
    }

    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: "hux-user-location",
        handle: handle.toLowerCase(),
        location: location || "",
        basedIn: basedIn || "",
      },
      window.location.origin
    );
  }

  function collectUsers(node, seen, emit) {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        collectUsers(item, seen, emit);
      }
      return;
    }

    const legacy = node.legacy;
    const screenName = legacy?.screen_name || legacy?.screenName;

    if (screenName) {
      const handle = String(screenName).toLowerCase();
      const location = legacy?.location || "";
      const basedIn = readBasedIn(node);

      if (!seen.has(handle) || location || basedIn) {
        seen.set(handle, { location, basedIn });
        emit(handle, location, basedIn);
      }
    }

    if (node.user_results?.result) {
      collectUsers(node.user_results.result, seen, emit);
    }

    if (node.user_result?.result) {
      collectUsers(node.user_result.result, seen, emit);
    }

    if (node.user_result_by_screen_name?.result) {
      collectUsers(node.user_result_by_screen_name.result, seen, emit);
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === "object") {
        collectUsers(value, seen, emit);
      }
    }
  }

  function handleGraphqlPayload(payload) {
    const seen = new Map();
    collectUsers(payload, seen, publishUser);
  }

  function inspectResponse(response, url) {
    if (!shouldInspectUrl(url)) {
      return;
    }

    response
      .clone()
      .json()
      .then(handleGraphqlPayload)
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