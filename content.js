(function () {
  "use strict";

  const MESSAGE_SOURCE = "hide-unverified-x";

  const PROCESSED_ATTR = "data-hux-processed";
  const HIDDEN_ATTR = "data-hux-hidden";
  const DIMMED_ATTR = "data-hux-dimmed";
  const CONTEXT_ATTR = "data-hux-context";
  const REVEALED_ATTR = "data-hux-revealed";
  const PLACEHOLDER_ATTR = "data-hux-placeholder";
  const COUNTED_ATTR = "data-hux-counted";

  const DEFAULT_SETTINGS = {
    forYou: true,
    following: true,
    replies: true,
    badgeType: "blue",
    retweetAuthor: "original",
    quoteAuthor: "quoter",
    displayMode: "hide",
    showPlaceholders: true,
    whitelist: [],
    countryForYou: false,
    countryReplies: false,
    countryMode: "blocklist",
    countryList: [],
    countryUnknown: "show",
    countryMatchFields: "both",
  };

  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    userName: '[data-testid="User-Name"]',
    quotedTweet: '[data-testid="card.wrapper"]',
    feedCell: '[data-testid="cellInnerDiv"]',
    verifiedBadge: '[data-testid="icon-verified"]',
    socialContext: '[data-testid="socialContext"]',
    homeTab: '[role="tab"]',
    placeholder: `[${PLACEHOLDER_ATTR}]`,
  };

  let settings = { ...DEFAULT_SETTINGS };
  let observer = null;
  let pendingFrame = null;
  let hiddenCount = 0;

  const storage = globalThis.chrome?.storage?.sync ?? globalThis.browser?.storage?.sync;
  const countryMatcher = globalThis.HUXCountry;
  const aboutAccount = globalThis.HUXAbout;

  function extractHandle(scope) {
    if (!scope) {
      return null;
    }

    const text = scope.textContent ?? "";
    const match = text.match(/@([A-Za-z0-9_]+)/);
    if (match) {
      return match[1].toLowerCase();
    }

    const link = scope.querySelector('a[href^="/"]');
    const href = link?.getAttribute("href") ?? "";
    const hrefMatch = href.match(/^\/([^/?]+)/);
    return hrefMatch ? hrefMatch[1].toLowerCase() : null;
  }

  function getPrimaryUserName(tweet) {
    for (const userName of tweet.querySelectorAll(SELECTORS.userName)) {
      if (!userName.closest(SELECTORS.quotedTweet)) {
        return userName;
      }
    }

    return tweet.querySelector(SELECTORS.userName);
  }

  function getQuotedUserName(tweet) {
    const quoted = tweet.querySelector(SELECTORS.quotedTweet);
    return quoted?.querySelector(SELECTORS.userName) ?? null;
  }

  function getSocialContext(tweet) {
    return tweet.querySelector(SELECTORS.socialContext);
  }

  function isRetweet(tweet) {
    const socialContext = getSocialContext(tweet);
    if (!socialContext) {
      return false;
    }

    const text = socialContext.textContent.toLowerCase();
    return text.includes("reposted") || text.includes("retweeted");
  }

  function isQuoteTweet(tweet) {
    return !!tweet.querySelector(SELECTORS.quotedTweet);
  }

  function getAuthorScope(tweet) {
    if (isRetweet(tweet) && settings.retweetAuthor === "retweeter") {
      return getSocialContext(tweet) ?? getPrimaryUserName(tweet);
    }

    if (isQuoteTweet(tweet) && settings.quoteAuthor === "quoted") {
      return getQuotedUserName(tweet) ?? getPrimaryUserName(tweet);
    }

    return getPrimaryUserName(tweet);
  }

  function isBlueCheckBadge(badge) {
    if (!badge) {
      return false;
    }

    const ariaLabel = badge.getAttribute("aria-label") ?? "";
    if (ariaLabel && !ariaLabel.toLowerCase().includes("verified")) {
      return false;
    }

    return !badge.querySelector("path[fill]");
  }

  function isVerifiedScope(scope) {
    if (!scope) {
      return false;
    }

    for (const badge of scope.querySelectorAll(SELECTORS.verifiedBadge)) {
      if (settings.badgeType === "any" || isBlueCheckBadge(badge)) {
        return true;
      }
    }

    return false;
  }

  function isWhitelisted(handle) {
    if (!handle) {
      return false;
    }

    return settings.whitelist.includes(handle.toLowerCase());
  }

  function isReply(tweet) {
    const socialContext = getSocialContext(tweet);
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

  function isVerificationFilterEnabled(context) {
    return context !== "other" && settings[context] === true;
  }

  function isCountryFilterEnabled(context) {
    if (context === "forYou") {
      return settings.countryForYou;
    }
    if (context === "replies") {
      return settings.countryReplies;
    }
    return false;
  }

  function getCountryTerms() {
    return countryMatcher?.normalizeTerms(settings.countryList) ?? [];
  }

  function ensureAboutAccountLookup(handle, context) {
    if (!handle || !isCountryFilterEnabled(context)) {
      return;
    }

    aboutAccount?.enqueue(handle);
  }

  function getAboutEntry(handle) {
    if (!handle) {
      return null;
    }

    return aboutAccount?.get(handle.toLowerCase()) ?? null;
  }

  function getCountryFilterDecision(handle, context) {
    const terms = getCountryTerms();
    if (!terms.length) {
      return false;
    }

    ensureAboutAccountLookup(handle, context);

    const entry = getAboutEntry(handle);
    if (!entry || entry.status === "pending") {
      return settings.countryUnknown === "hide";
    }

    const decision = countryMatcher?.shouldHideByAccount(
      entry,
      terms,
      settings.countryMode,
      settings.countryMatchFields
    );

    if (decision === null) {
      return settings.countryUnknown === "hide";
    }

    return decision;
  }

  function getHideTarget(tweet) {
    return tweet.closest(SELECTORS.feedCell) ?? tweet;
  }

  function getPlaceholder(tweet) {
    const target = getHideTarget(tweet);
    const previous = target.previousElementSibling;
    if (previous?.hasAttribute(PLACEHOLDER_ATTR)) {
      return previous;
    }

    return null;
  }

  function removePlaceholder(tweet) {
    getPlaceholder(tweet)?.remove();
  }

  function syncHiddenCount() {
    const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
    runtime?.sendMessage?.({ type: "setHiddenCount", count: hiddenCount });
  }

  function adjustHiddenCount(delta) {
    if (delta === 0) {
      return;
    }

    hiddenCount = Math.max(0, hiddenCount + delta);
    syncHiddenCount();
  }

  function markHiddenCounted(tweet, counted) {
    if (counted) {
      tweet.setAttribute(COUNTED_ATTR, "true");
      adjustHiddenCount(1);
      return;
    }

    if (tweet.hasAttribute(COUNTED_ATTR)) {
      tweet.removeAttribute(COUNTED_ATTR);
      adjustHiddenCount(-1);
    }
  }

  function clearFilteredState(tweet, context) {
    const target = getHideTarget(tweet);
    target.removeAttribute(HIDDEN_ATTR);
    tweet.removeAttribute(HIDDEN_ATTR);
    tweet.removeAttribute(DIMMED_ATTR);
    tweet.setAttribute(PROCESSED_ATTR, "visible");
    tweet.setAttribute(CONTEXT_ATTR, context);
    removePlaceholder(tweet);
    markHiddenCounted(tweet, false);
  }

  function revealTweet(tweet) {
    tweet.setAttribute(REVEALED_ATTR, "true");
    clearFilteredState(tweet, getTweetContext(tweet));
  }

  function addToWhitelist(handle) {
    if (!handle || !storage) {
      return;
    }

    const normalized = handle.toLowerCase();
    if (settings.whitelist.includes(normalized)) {
      return;
    }

    storage.set({ whitelist: [...settings.whitelist, normalized] });
  }

  function buildPlaceholderLabel(handle, reason, accountText) {
    if (reason === "country" && accountText) {
      return `Post from @${handle} hidden (${accountText})`;
    }

    if (reason === "country") {
      return handle
        ? `Post from @${handle} hidden (about account)`
        : "Post hidden (about account)";
    }

    return handle ? `Post from @${handle} hidden` : "Unverified post hidden";
  }

  function createPlaceholder(tweet, handle, reason, accountText) {
    removePlaceholder(tweet);

    const placeholder = document.createElement("div");
    placeholder.setAttribute(PLACEHOLDER_ATTR, "true");
    placeholder.className = "hux-placeholder";

    const label = document.createElement("span");
    label.className = "hux-placeholder-label";
    label.textContent = buildPlaceholderLabel(handle, reason, accountText);

    const actions = document.createElement("div");
    actions.className = "hux-placeholder-actions";

    const showOnceButton = document.createElement("button");
    showOnceButton.type = "button";
    showOnceButton.className = "hux-placeholder-button";
    showOnceButton.textContent = "Show once";
    showOnceButton.addEventListener("click", (event) => {
      event.stopPropagation();
      revealTweet(tweet);
    });

    const alwaysShowButton = document.createElement("button");
    alwaysShowButton.type = "button";
    alwaysShowButton.className =
      "hux-placeholder-button hux-placeholder-button-secondary";
    alwaysShowButton.textContent = "Always show";
    alwaysShowButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (handle) {
        addToWhitelist(handle);
      }
      revealTweet(tweet);
    });

    actions.append(showOnceButton, alwaysShowButton);
    placeholder.append(label, actions);

    const target = getHideTarget(tweet);
    target.parentNode?.insertBefore(placeholder, target);
    return placeholder;
  }

  function applyHiddenState(tweet, context, handle, reason, accountText) {
    const target = getHideTarget(tweet);
    const wasFiltered =
      target.hasAttribute(HIDDEN_ATTR) || tweet.hasAttribute(DIMMED_ATTR);

    target.setAttribute(HIDDEN_ATTR, "true");
    tweet.removeAttribute(DIMMED_ATTR);
    tweet.setAttribute(PROCESSED_ATTR, "hidden");
    tweet.setAttribute(CONTEXT_ATTR, context);

    if (settings.showPlaceholders) {
      createPlaceholder(tweet, handle, reason, accountText);
    } else {
      removePlaceholder(tweet);
    }

    if (!wasFiltered && !tweet.hasAttribute(COUNTED_ATTR)) {
      markHiddenCounted(tweet, true);
    }
  }

  function applyDimmedState(tweet, context) {
    const target = getHideTarget(tweet);
    const wasFiltered =
      target.hasAttribute(HIDDEN_ATTR) || tweet.hasAttribute(DIMMED_ATTR);

    target.removeAttribute(HIDDEN_ATTR);
    tweet.removeAttribute(HIDDEN_ATTR);
    tweet.setAttribute(DIMMED_ATTR, "true");
    tweet.setAttribute(PROCESSED_ATTR, "dimmed");
    tweet.setAttribute(CONTEXT_ATTR, context);
    removePlaceholder(tweet);

    if (!wasFiltered && !tweet.hasAttribute(COUNTED_ATTR)) {
      markHiddenCounted(tweet, true);
    }
  }

  function getFilterDecision(tweet) {
    if (tweet.hasAttribute(REVEALED_ATTR)) {
      return null;
    }

    const context = getTweetContext(tweet);
    const authorScope = getAuthorScope(tweet);
    const handle = extractHandle(authorScope);

    if (isWhitelisted(handle)) {
      return null;
    }

    if (
      isVerificationFilterEnabled(context) &&
      !isVerifiedScope(authorScope)
    ) {
      return { reason: "unverified", handle, accountText: "" };
    }

    if (isCountryFilterEnabled(context) && getCountryFilterDecision(handle, context)) {
      const entry = getAboutEntry(handle);
      const accountText = countryMatcher?.formatAccountLabel(entry) ?? "";
      return { reason: "country", handle, accountText };
    }

    return null;
  }

  function processTweet(tweet) {
    const context = getTweetContext(tweet);
    const decision = getFilterDecision(tweet);

    if (!decision) {
      clearFilteredState(tweet, context);
      return;
    }

    if (settings.displayMode === "dim") {
      applyDimmedState(tweet, context);
      return;
    }

    applyHiddenState(
      tweet,
      context,
      decision.handle,
      decision.reason,
      decision.accountText
    );
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

  function normalizeWhitelist(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return [
      ...new Set(
        value
          .map((entry) => String(entry).trim().replace(/^@/, "").toLowerCase())
          .filter(Boolean)
      ),
    ];
  }

  function normalizeCountryList(value) {
    if (!Array.isArray(value)) {
      if (typeof value === "string") {
        return value
          .split(/[\n,]/)
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      return [];
    }

    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  function normalizeStoredSettings(result) {
    const hasContextSettings = ["forYou", "following", "replies"].some(
      (key) => typeof result[key] === "boolean"
    );

    const base = hasContextSettings
      ? {
          forYou: result.forYou ?? DEFAULT_SETTINGS.forYou,
          following: result.following ?? DEFAULT_SETTINGS.following,
          replies: result.replies ?? DEFAULT_SETTINGS.replies,
        }
      : typeof result.enabled === "boolean"
        ? {
            forYou: result.enabled,
            following: result.enabled,
            replies: result.enabled,
          }
        : {
            forYou: DEFAULT_SETTINGS.forYou,
            following: DEFAULT_SETTINGS.following,
            replies: DEFAULT_SETTINGS.replies,
          };

    return {
      ...DEFAULT_SETTINGS,
      ...base,
      badgeType: result.badgeType === "any" ? "any" : "blue",
      retweetAuthor:
        result.retweetAuthor === "retweeter" ? "retweeter" : "original",
      quoteAuthor: result.quoteAuthor === "quoted" ? "quoted" : "quoter",
      displayMode: result.displayMode === "dim" ? "dim" : "hide",
      showPlaceholders:
        typeof result.showPlaceholders === "boolean"
          ? result.showPlaceholders
          : DEFAULT_SETTINGS.showPlaceholders,
      whitelist: normalizeWhitelist(result.whitelist),
      countryForYou: result.countryForYou === true,
      countryReplies: result.countryReplies === true,
      countryMode: result.countryMode === "allowlist" ? "allowlist" : "blocklist",
      countryList: normalizeCountryList(result.countryList),
      countryUnknown:
        result.countryUnknown === "hide" ? "hide" : "show",
      countryMatchFields:
        result.countryMatchFields === "basedIn" ||
        result.countryMatchFields === "connectedVia"
          ? result.countryMatchFields
          : "both",
    };
  }

  function applySettings(nextSettings) {
    settings = normalizeStoredSettings(nextSettings);
    startObserver();
    processTweets();
  }

  function loadSettings() {
    if (!storage) {
      applySettings(DEFAULT_SETTINGS);
      return;
    }

    storage.get(DEFAULT_SETTINGS, (result) => {
      applySettings(result);
    });
  }

  function handlePageMessage(event) {
    if (
      event.source !== window ||
      event.origin !== window.location.origin ||
      event.data?.source !== MESSAGE_SOURCE
    ) {
      return;
    }

    if (event.data.type === "hux-about-query-id") {
      aboutAccount?.setQueryId(event.data.queryId);
      return;
    }

    if (event.data.type === "hux-about-account") {
      aboutAccount?.upsertFromInterceptor(
        event.data.handle,
        event.data.basedIn,
        event.data.connectedVia,
        event.data.accurate
      );
    }
  }

  if (storage?.onChanged) {
    storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") {
        return;
      }

      const nextSettings = {
        ...settings,
        whitelist: [...settings.whitelist],
        countryList: [...settings.countryList],
      };
      let changed = false;

      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (!changes[key]) {
          continue;
        }

        changed = true;
        if (key === "whitelist") {
          nextSettings.whitelist = normalizeWhitelist(changes[key].newValue);
        } else if (key === "countryList") {
          nextSettings.countryList = normalizeCountryList(changes[key].newValue);
        } else {
          nextSettings[key] = changes[key].newValue;
        }
      }

      if (changed) {
        applySettings(nextSettings);
      }
    });
  }

  let initialized = false;

  function init() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", init, { once: true });
      return;
    }

    if (initialized) {
      return;
    }

    initialized = true;
    window.addEventListener("message", handlePageMessage);
    aboutAccount?.init(() => scheduleProcess());
    loadSettings();
  }

  init();
})();