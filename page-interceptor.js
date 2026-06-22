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

  function inspectResponse(response, url) {
    if (!url || !url.includes("/i/api/graphql/") || !url.includes("AboutAccountQuery")) {
      return;
    }

    response
      .clone()
      .json()
      .then((payload) => handleAboutAccountPayload(payload, url))
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