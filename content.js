(function () {
  "use strict";

  const STORAGE_KEY = "enabled";
  const PROCESSED_ATTR = "data-hux-processed";
  const HIDDEN_ATTR = "data-hux-hidden";

  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    userName: '[data-testid="User-Name"]',
    quotedTweet: '[data-testid="card.wrapper"]',
    feedCell: '[data-testid="cellInnerDiv"]',
    verifiedBadge: '[data-testid="icon-verified"]',
  };

  let enabled = true;
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

    // Blue checks use an outlined path; gold/gray badges use filled paths.
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

  function getHideTarget(tweet) {
    return tweet.closest(SELECTORS.feedCell) ?? tweet;
  }

  function hideTweet(tweet) {
    const target = getHideTarget(tweet);
    target.setAttribute(HIDDEN_ATTR, "true");
    tweet.setAttribute(PROCESSED_ATTR, "hidden");
  }

  function showTweet(tweet) {
    const target = getHideTarget(tweet);
    target.removeAttribute(HIDDEN_ATTR);
    tweet.setAttribute(PROCESSED_ATTR, "visible");
  }

  function processTweet(tweet) {
    if (!enabled) {
      showTweet(tweet);
      return;
    }

    if (hasBlueCheck(tweet)) {
      showTweet(tweet);
      return;
    }

    hideTweet(tweet);
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
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            continue;
          }

          if (
            node.matches?.(SELECTORS.tweet) ||
            node.querySelector?.(SELECTORS.tweet)
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
    });
  }

  function stopObserver() {
    observer?.disconnect();
    observer = null;
  }

  function setEnabled(nextEnabled) {
    enabled = nextEnabled;

    if (enabled) {
      startObserver();
      processTweets();
      return;
    }

    stopObserver();
    document.querySelectorAll(SELECTORS.tweet).forEach(showTweet);
  }

  function loadSettings() {
    if (!storage) {
      setEnabled(true);
      return;
    }

    storage.get({ [STORAGE_KEY]: true }, (result) => {
      setEnabled(result[STORAGE_KEY]);
    });
  }

  if (storage?.onChanged) {
    storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes[STORAGE_KEY]) {
        return;
      }

      setEnabled(changes[STORAGE_KEY].newValue);
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