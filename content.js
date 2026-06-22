(function () {
  "use strict";

  const SETTINGS_KEYS = ["forYou", "following", "replies"];
  const PROCESSED_ATTR = "data-hux-processed";
  const HIDDEN_ATTR = "data-hux-hidden";
  const CONTEXT_ATTR = "data-hux-context";

  const DEFAULT_SETTINGS = {
    forYou: true,
    following: true,
    replies: true,
  };

  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    userName: '[data-testid="User-Name"]',
    quotedTweet: '[data-testid="card.wrapper"]',
    feedCell: '[data-testid="cellInnerDiv"]',
    verifiedBadge: '[data-testid="icon-verified"]',
    socialContext: '[data-testid="socialContext"]',
    homeTab: '[role="tab"]',
  };

  let settings = { ...DEFAULT_SETTINGS };
  let observer = null;
  let pendingFrame = null;

  const storage = globalThis.chrome?.storage?.sync ?? globalThis.browser?.storage?.sync;

  function getAuthorUserName(tweet) {
    for (const userName of tweet.querySelectorAll(SELECTORS.userName)) {
      if (!userName.closest(SELECTORS.quotedTweet)) {
        return userName;
      }
    }

    return tweet.querySelector(SELECTORS.userName);
  }

  function isBlueCheckBadge(badge) {
    if (!badge) {
      return false;
    }

    const ariaLabel = badge.getAttribute("aria-label") ?? "";
    if (ariaLabel && !ariaLabel.toLowerCase().includes("verified")) {
      return false;
    }

    if (badge.querySelector("path[fill]")) {
      return false;
    }

    return true;
  }

  function hasBlueCheck(tweet) {
    const author = getAuthorUserName(tweet);
    if (!author) {
      return false;
    }

    for (const badge of author.querySelectorAll(SELECTORS.verifiedBadge)) {
      if (isBlueCheckBadge(badge)) {
        return true;
      }
    }

    return false;
  }

  function isReply(tweet) {
    const socialContext = tweet.querySelector(SELECTORS.socialContext);
    if (!socialContext) {
      return false;
    }

    return /replying to/i.test(socialContext.textContent);
  }

  function isHomeTimeline() {
    const path = location.pathname;
    return path === "/" || path === "/home" || path.startsWith("/home/");
  }

  function getActiveHomeTab() {
    if (!isHomeTimeline()) {
      return null;
    }

    const selectedTab = document.querySelector(
      `${SELECTORS.homeTab}[aria-selected="true"]`
    );
    if (!selectedTab) {
      return null;
    }

    const label = selectedTab.textContent.trim().toLowerCase();
    if (label.includes("following")) {
      return "following";
    }
    if (label.includes("for you") || label.includes("foryou")) {
      return "forYou";
    }

    return null;
  }

  function getTweetContext(tweet) {
    if (isReply(tweet)) {
      return "replies";
    }

    const homeTab = getActiveHomeTab();
    if (homeTab) {
      return homeTab;
    }

    return "other";
  }

  function isFilteringEnabledForContext(context) {
    if (context === "other") {
      return false;
    }

    return settings[context] === true;
  }

  function getHideTarget(tweet) {
    return tweet.closest(SELECTORS.feedCell) ?? tweet;
  }

  function hideTweet(tweet, context) {
    const target = getHideTarget(tweet);
    target.setAttribute(HIDDEN_ATTR, "true");
    tweet.setAttribute(PROCESSED_ATTR, "hidden");
    tweet.setAttribute(CONTEXT_ATTR, context);
  }

  function showTweet(tweet, context) {
    const target = getHideTarget(tweet);
    target.removeAttribute(HIDDEN_ATTR);
    tweet.setAttribute(PROCESSED_ATTR, "visible");
    tweet.setAttribute(CONTEXT_ATTR, context);
  }

  function processTweet(tweet) {
    const context = getTweetContext(tweet);

    if (!isFilteringEnabledForContext(context)) {
      showTweet(tweet, context);
      return;
    }

    if (hasBlueCheck(tweet)) {
      showTweet(tweet, context);
      return;
    }

    hideTweet(tweet, context);
  }

  function processTweets(root = document) {
    root.querySelectorAll(SELECTORS.tweet).forEach(processTweet);
  }

  function scheduleProcess() {
    if (pendingFrame !== null) {
      return;
    }

    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;
      processTweets();
    });
  }

  function startObserver() {
    if (observer) {
      return;
    }

    observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "aria-selected"
        ) {
          shouldProcess = true;
          break;
        }

        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            continue;
          }

          if (
            node.matches?.(SELECTORS.tweet) ||
            node.querySelector?.(SELECTORS.tweet) ||
            node.matches?.(SELECTORS.homeTab) ||
            node.querySelector?.(SELECTORS.homeTab)
          ) {
            shouldProcess = true;
            break;
          }
        }

        if (shouldProcess) {
          break;
        }
      }

      if (shouldProcess) {
        scheduleProcess();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected"],
    });

    processTweets();
  }

  function applySettings(nextSettings) {
    settings = { ...DEFAULT_SETTINGS, ...nextSettings };
    startObserver();
    processTweets();
  }

  function normalizeStoredSettings(result) {
    const hasLegacyEnabled = typeof result.enabled === "boolean";
    const hasNewSettings = SETTINGS_KEYS.some((key) => typeof result[key] === "boolean");

    if (hasNewSettings) {
      return {
        forYou: result.forYou ?? DEFAULT_SETTINGS.forYou,
        following: result.following ?? DEFAULT_SETTINGS.following,
        replies: result.replies ?? DEFAULT_SETTINGS.replies,
      };
    }

    if (hasLegacyEnabled) {
      return {
        forYou: result.enabled,
        following: result.enabled,
        replies: result.enabled,
      };
    }

    return { ...DEFAULT_SETTINGS };
  }

  function loadSettings() {
    if (!storage) {
      applySettings(DEFAULT_SETTINGS);
      return;
    }

    storage.get(
      {
        enabled: true,
        forYou: true,
        following: true,
        replies: true,
      },
      (result) => {
        applySettings(normalizeStoredSettings(result));
      }
    );
  }

  if (storage?.onChanged) {
    storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") {
        return;
      }

      const touched = SETTINGS_KEYS.some((key) => changes[key]);
      if (!touched) {
        return;
      }

      const nextSettings = { ...settings };
      for (const key of SETTINGS_KEYS) {
        if (changes[key]) {
          nextSettings[key] = changes[key].newValue;
        }
      }

      applySettings(nextSettings);
    });
  }

  function init() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", init, { once: true });
      return;
    }

    loadSettings();
  }

  init();
})();