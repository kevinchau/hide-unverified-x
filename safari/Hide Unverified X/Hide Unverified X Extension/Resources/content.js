(function () {
  "use strict";

  const MESSAGE_SOURCE = "hide-unverified-x";
  const READY_TYPE = "hux-ready";

  const PROCESSED_ATTR = "data-hux-processed";
  const HIDDEN_ATTR = "data-hux-hidden";
  const DIMMED_ATTR = "data-hux-dimmed";
  const CONTEXT_ATTR = "data-hux-context";
  const REVEALED_ATTR = "data-hux-revealed";
  const PLACEHOLDER_ATTR = "data-hux-placeholder";
  const PLACEHOLDER_FP_ATTR = "data-hux-ph-fp";
  const COUNTED_ATTR = "data-hux-counted";
  const FINGERPRINT_ATTR = "data-hux-fp";
  const LOCATION_BADGE_ATTR = "data-hux-location-badge";
  const LOCATION_BADGE_FP_ATTR = "data-hux-loc-fp";
  const MAX_MESSAGE_ARRAY = 500;
  const HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;
  const QUERY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

  const settingsSchema = globalThis.HUXSettings;
  if (!settingsSchema) {
    throw new Error("HUXSettings missing");
  }
  const DEFAULT_SETTINGS = settingsSchema.DEFAULT_SETTINGS;
  const normalizeWhitelist = settingsSchema.normalizeWhitelist;
  const normalizeCountryList = settingsSchema.normalizeCountryList;
  const normalizeStoredSettings = settingsSchema.normalizeStoredSettings;

  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    userName: '[data-testid="User-Name"]',
    feedCell: '[data-testid="cellInnerDiv"]',
    verifiedBadge: '[data-testid="icon-verified"]',
    socialContext: '[data-testid="socialContext"]',
    homeTab: '[role="tab"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    hoverCard:
      '[data-testid="hoverCardParent"], [data-testid="HoverCard"], [role="tooltip"]',
    placeholder: `[${PLACEHOLDER_ATTR}]`,
  };

  const RESERVED_PROFILE_PATHS = new Set([
    "home",
    "search",
    "settings",
    "i",
    "compose",
    "messages",
    "notifications",
    "explore",
    "login",
    "signup",
    "intent",
    "hashtag",
  ]);

  let settings = { ...DEFAULT_SETTINGS };
  let observer = null;
  let pendingFrame = null;
  let hiddenCount = 0;
  let lastPathname = location.pathname;
  /** @type {WeakSet<Element>|null} Tweets below the focused status on a conversation page. */
  let conversationReplyTweets = null;

  const storage = globalThis.chrome?.storage?.sync ?? globalThis.browser?.storage?.sync;
  const countryMatcher = globalThis.HUXCountry;
  const aboutAccount = globalThis.HUXAbout;
  const followingCache = globalThis.HUXFollowing;

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

  function extractTweetId(tweet) {
    // Prefer the primary status link; skip nested quote tweets / cards.
    for (const statusLink of tweet.querySelectorAll('a[href*="/status/"]')) {
      if (isInsideNestedTweet(statusLink, tweet)) {
        continue;
      }
      const href = statusLink.getAttribute("href") ?? "";
      const match = href.match(/\/status\/(\d+)/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  function getStatusIdFromPath(pathname = location.pathname) {
    const match = pathname.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  }

  function isStatusPage() {
    return getStatusIdFromPath() !== null;
  }

  function isInsideNestedTweet(element, tweet) {
    if (!element) {
      return false;
    }

    const nearestTweet = element.closest(SELECTORS.tweet);
    return !!nearestTweet && nearestTweet !== tweet;
  }

  function getNestedQuotedTweet(tweet) {
    return tweet.querySelector(SELECTORS.tweet);
  }

  function getPrimaryUserName(tweet) {
    for (const userName of tweet.querySelectorAll(SELECTORS.userName)) {
      if (!isInsideNestedTweet(userName, tweet)) {
        return userName;
      }
    }

    return null;
  }

  function getQuotedUserName(tweet) {
    const quoted = getNestedQuotedTweet(tweet);
    return quoted?.querySelector(SELECTORS.userName) ?? null;
  }

  function getSocialContext(tweet) {
    for (const socialContext of tweet.querySelectorAll(SELECTORS.socialContext)) {
      if (!isInsideNestedTweet(socialContext, tweet)) {
        return socialContext;
      }
    }

    return null;
  }

  function rebuildConversationReplyCache() {
    conversationReplyTweets = null;
    if (!isStatusPage()) {
      return;
    }

    const pageStatusId = getStatusIdFromPath();
    const tweets = [
      ...document.querySelectorAll(SELECTORS.tweet),
    ].filter(isTopLevelTweet);

    if (!tweets.length) {
      return;
    }

    let focusedIndex = tweets.findIndex(
      (tweet) => extractTweetId(tweet) === pageStatusId
    );
    // Focused tweet not mounted / id parse miss: treat first top-level as focus.
    if (focusedIndex < 0) {
      focusedIndex = 0;
    }

    const replySet = new WeakSet();
    for (let i = focusedIndex + 1; i < tweets.length; i++) {
      replySet.add(tweets[i]);
    }
    conversationReplyTweets = replySet;
  }

  function isConversationReply(tweet) {
    return !!conversationReplyTweets?.has(tweet);
  }

  function isReply(tweet) {
    // Status/conversation pages: tweets below the focused post are replies
    // even when X omits the "Replying to" social context banner.
    if (isConversationReply(tweet)) {
      return true;
    }

    const socialContext = getSocialContext(tweet);
    if (!socialContext) {
      return false;
    }

    const text = socialContext.textContent;
    if (
      /replying to/i.test(text) ||
      /réponse à/i.test(text) ||
      /返信先/i.test(text)
    ) {
      return true;
    }

    const profileLinks = [
      ...socialContext.querySelectorAll('a[href^="/"]'),
    ].filter((link) => {
      const href = link.getAttribute("href") ?? "";
      return /^\/[^/?]+$/.test(href);
    });

    return (
      profileLinks.length >= 2 &&
      !socialContext.querySelector('a[href*="/status/"]')
    );
  }

  function isRetweet(tweet) {
    const socialContext = getSocialContext(tweet);
    if (!socialContext) {
      return false;
    }

    if (isReply(tweet)) {
      return false;
    }

    const text = socialContext.textContent.toLowerCase();
    if (
      text.includes("reposted") ||
      text.includes("retweeted") ||
      text.includes("reposté") ||
      text.includes("リポスト")
    ) {
      return true;
    }

    const profileLinks = [
      ...socialContext.querySelectorAll('a[href^="/"]'),
    ].filter((link) => {
      const href = link.getAttribute("href") ?? "";
      return /^\/[^/?]+$/.test(href);
    });

    return (
      profileLinks.length > 0 &&
      !socialContext.querySelector('a[href*="/status/"]')
    );
  }

  function isQuoteTweet(tweet) {
    return !!getNestedQuotedTweet(tweet);
  }

  function getAuthorScope(tweet) {
    if (isRetweet(tweet) && settings.retweetAuthor === "retweeter") {
      const socialContext = getSocialContext(tweet);
      if (socialContext && !isInsideNestedTweet(socialContext, tweet)) {
        return socialContext;
      }
      return getPrimaryUserName(tweet);
    }

    if (isQuoteTweet(tweet) && settings.quoteAuthor === "quoted") {
      return getQuotedUserName(tweet) ?? getPrimaryUserName(tweet);
    }

    return getPrimaryUserName(tweet);
  }

  function getBadgeRoot(badge) {
    return badge?.closest?.('[data-testid="icon-verified"]') ?? badge;
  }

  function getBadgeAriaLabel(badge) {
    const root = getBadgeRoot(badge);
    if (!root) {
      return "";
    }

    const label =
      root.getAttribute("aria-label") ??
      root.querySelector("svg")?.getAttribute("aria-label") ??
      "";

    return label.toLowerCase();
  }

  function hasGovernmentLabel(badge) {
    const label = getBadgeAriaLabel(badge);
    return (
      label.includes("government") ||
      label.includes("public official") ||
      label.includes("official account")
    );
  }

  function isGovernmentCheckBadge(badge) {
    return !!badge && hasGovernmentLabel(badge);
  }

  function isGoldCheckBadge(badge) {
    if (!badge) {
      return false;
    }

    const label = getBadgeAriaLabel(badge);
    if (
      label.includes("organization") ||
      label.includes("business") ||
      label.includes("affiliate")
    ) {
      return true;
    }

    if (hasGovernmentLabel(badge) || label.includes("verified account")) {
      return false;
    }

    return !!getBadgeRoot(badge)?.querySelector("path[fill]");
  }

  function isBlueCheckBadge(badge) {
    if (!badge) {
      return false;
    }

    const label = getBadgeAriaLabel(badge);
    if (isGoldCheckBadge(badge) || isGovernmentCheckBadge(badge)) {
      return false;
    }

    if (label.includes("verified account")) {
      return true;
    }

    if (label && !label.includes("verified")) {
      return false;
    }

    return !getBadgeRoot(badge)?.querySelector("path[fill]");
  }

  function badgeCountsAsVerified(badge) {
    if (isBlueCheckBadge(badge) && settings.badgeBlue) {
      return true;
    }

    if (isGoldCheckBadge(badge) && settings.badgeGold) {
      return true;
    }

    if (isGovernmentCheckBadge(badge) && settings.badgeGovernment) {
      return true;
    }

    return false;
  }

  function isVerifiedScope(scope) {
    if (!scope) {
      return false;
    }

    for (const badge of scope.querySelectorAll(SELECTORS.verifiedBadge)) {
      if (badgeCountsAsVerified(badge)) {
        return true;
      }
    }

    return false;
  }

  function isWhitelisted(handle) {
    if (!handle) {
      return false;
    }

    const normalized = handle.toLowerCase();
    if (settings.whitelist.includes(normalized)) {
      return true;
    }

    if (settings.whitelistFollowing && followingCache?.isFollowing(normalized)) {
      return true;
    }

    return false;
  }

  function isAnyBadgeEnabled() {
    return (
      settings.badgeBlue || settings.badgeGold || settings.badgeGovernment
    );
  }

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

  function getProfileHandle() {
    const match = location.pathname.match(/^\/([^/?]+)$/);
    if (!match) {
      return null;
    }

    const handle = match[1].toLowerCase();
    if (RESERVED_PROFILE_PATHS.has(handle)) {
      return null;
    }

    return handle;
  }

  function extractHandleFromProfileSurface(root) {
    const userName = root.querySelector(SELECTORS.userName);
    if (userName) {
      const handle = extractHandle(userName);
      if (handle && !RESERVED_PROFILE_PATHS.has(handle)) {
        return handle;
      }
    }

    for (const link of root.querySelectorAll('a[href^="/"]')) {
      const href = link.getAttribute("href") ?? "";
      const match = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
      if (!match) {
        continue;
      }

      const handle = match[1].toLowerCase();
      if (!RESERVED_PROFILE_PATHS.has(handle)) {
        return handle;
      }
    }

    return null;
  }

  function findHandleForProofElement(element) {
    if (!element) {
      return null;
    }

    const hoverRoot = element.closest(SELECTORS.hoverCard);
    if (hoverRoot) {
      return extractHandleFromProfileSurface(hoverRoot);
    }

    const profileHandle = getProfileHandle();
    if (profileHandle) {
      const column = document.querySelector(SELECTORS.primaryColumn);
      if (column?.contains(element)) {
        return profileHandle;
      }
    }

    const tweet = element.closest(SELECTORS.tweet);
    if (tweet) {
      return extractHandle(getAuthorScope(tweet));
    }

    const cell = element.closest(SELECTORS.feedCell);
    if (cell) {
      const cellTweet = cell.querySelector(SELECTORS.tweet);
      if (cellTweet) {
        return extractHandle(getAuthorScope(cellTweet));
      }
    }

    return null;
  }

  function scanSubtreeForFollowedByProof(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (treeWalker.nextNode()) {
      const nodeText = treeWalker.currentNode.textContent ?? "";
      if (!textIndicatesFollowedByYouFollow(nodeText)) {
        continue;
      }

      const handle = findHandleForProofElement(
        treeWalker.currentNode.parentElement
      );
      if (handle) {
        followingCache?.addFollowedByFollowing([handle]);
      }
    }
  }

  let scanProofTimer = null;

  function scheduleScanFollowedByProof() {
    if (!settings.whitelistFollowedByFollowing) {
      return;
    }

    if (scanProofTimer !== null) {
      clearTimeout(scanProofTimer);
    }

    scanProofTimer = setTimeout(() => {
      scanProofTimer = null;
      scanFollowedByFollowingProof();
    }, 120);
  }

  function scanFollowedByFollowingProof() {
    if (!settings.whitelistFollowedByFollowing) {
      return;
    }

    const column = document.querySelector(SELECTORS.primaryColumn);
    if (column) {
      scanSubtreeForFollowedByProof(column);
    }

    for (const hoverCard of document.querySelectorAll(SELECTORS.hoverCard)) {
      scanSubtreeForFollowedByProof(hoverCard);
    }
  }

  function tweetHasFollowedByYouFollowContext(tweet) {
    const cell = tweet.closest(SELECTORS.feedCell) ?? tweet;

    for (const contextEl of cell.querySelectorAll(SELECTORS.socialContext)) {
      if (textIndicatesFollowedByYouFollow(contextEl.textContent ?? "")) {
        return true;
      }
    }

    const cellText = cell.textContent ?? "";
    if (textIndicatesFollowedByYouFollow(cellText)) {
      return true;
    }

    return false;
  }

  function isFollowWhitelisted(tweet, handle, context) {
    if (settings.whitelistFollowing && context === "following") {
      return true;
    }

    if (isWhitelisted(handle)) {
      return true;
    }

    if (settings.whitelistFollowedByFollowing) {
      if (handle && followingCache?.isFollowedByFollowing(handle)) {
        return true;
      }

      if (tweetHasFollowedByYouFollowContext(tweet)) {
        if (handle) {
          followingCache?.addFollowedByFollowing([handle]);
        }
        return true;
      }
    }

    if (!settings.whitelistFollowing) {
      return false;
    }

    const tweetId = extractTweetId(tweet);
    return !!tweetId && followingCache?.isTweetFromFollowing(tweetId);
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

    const href = (
      selectedTab.querySelector("a[href]")?.getAttribute("href") ??
      selectedTab.getAttribute("href") ??
      ""
    ).toLowerCase();

    if (href.includes("following")) {
      return "following";
    }

    if (
      href.includes("foryou") ||
      href.endsWith("/home") ||
      href === "/home" ||
      href === "/"
    ) {
      return "forYou";
    }

    const label = selectedTab.textContent.trim().toLowerCase();
    if (
      label.includes("following") ||
      label.includes("abonnements") ||
      label.includes("フォロー中")
    ) {
      return "following";
    }

    if (
      label.includes("for you") ||
      label.includes("foryou") ||
      label.includes("pour vous") ||
      label.includes("おすすめ")
    ) {
      return "forYou";
    }

    const tabs = [...document.querySelectorAll(SELECTORS.homeTab)];
    const selectedIndex = tabs.indexOf(selectedTab);
    if (selectedIndex === 1) {
      return "following";
    }
    if (selectedIndex === 0) {
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

  /**
   * Only the country filter may enqueue GraphQL About lookups.
   * Location badges piggyback on that cache (and on About pages you open).
   * Enqueueing for every feed author was enough to 429 the session and break
   * X's own "About this account" UI.
   */
  function needsAboutAccountLookup(context) {
    return isCountryFilterEnabled(context);
  }

  function ensureAboutAccountLookup(handle, context, priority = false) {
    if (!handle || !needsAboutAccountLookup(context)) {
      return;
    }

    aboutAccount?.enqueue(handle, priority ? { priority: true } : undefined);
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

    ensureAboutAccountLookup(handle, context, true);

    const entry = getAboutEntry(handle);
    // Fail open on lookup errors — do not hide when about-account fetch failed.
    if (entry?.status === "error") {
      return false;
    }

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

  function getFeedCell(tweet) {
    return tweet.closest(SELECTORS.feedCell);
  }

  /**
   * Placeholder may live:
   *  - as first child of the feed cell (preferred — dies with virtualization)
   *  - as previous sibling of the cell/tweet (legacy)
   */
  function getPlaceholder(tweet) {
    const cell = getFeedCell(tweet);
    if (cell) {
      for (const child of cell.children) {
        if (child.hasAttribute?.(PLACEHOLDER_ATTR)) {
          return child;
        }
      }
    }

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

  /**
   * X recycles feed cells. Placeholders that sat *outside* a cell become
   * orphans and glue onto the next tweet (black bar + Show once).
   */
  function cleanupOrphanPlaceholders(root = document) {
    root.querySelectorAll(`[${PLACEHOLDER_ATTR}]`).forEach((placeholder) => {
      const parent = placeholder.parentElement;
      if (!parent) {
        placeholder.remove();
        return;
      }

      // Preferred: inside a feed cell that still has a (hidden) tweet.
      if (parent.matches?.(SELECTORS.feedCell)) {
        const tweet = parent.querySelector(SELECTORS.tweet);
        if (!tweet) {
          placeholder.remove();
          return;
        }
        // Cell has a visible tweet — placeholder should not remain.
        if (
          tweet.getAttribute(PROCESSED_ATTR) === "visible" ||
          tweet.getAttribute(PROCESSED_ATTR) === "dimmed" ||
          (tweet.getAttribute(HIDDEN_ATTR) !== "true" &&
            parent.getAttribute(HIDDEN_ATTR) !== "true")
        ) {
          // Only strip if the tweet is not currently supposed to be hidden.
          if (tweet.getAttribute(PROCESSED_ATTR) !== "hidden") {
            placeholder.remove();
          }
        }
        return;
      }

      // Legacy: previous sibling of a feed cell / tweet.
      const next = placeholder.nextElementSibling;
      if (!next) {
        placeholder.remove();
        return;
      }

      const nextTweet =
        next.matches?.(SELECTORS.tweet)
          ? next
          : next.querySelector?.(SELECTORS.tweet);

      if (!nextTweet) {
        placeholder.remove();
        return;
      }

      // Orphan if the following tweet is visible/dimmed or not hidden.
      if (nextTweet.getAttribute(PROCESSED_ATTR) !== "hidden") {
        placeholder.remove();
        return;
      }

      // Still attached to a hidden tweet — keep only if that tweet is hidden.
      const nextCell = nextTweet.closest(SELECTORS.feedCell) ?? nextTweet;
      if (
        nextTweet.getAttribute(HIDDEN_ATTR) !== "true" &&
        nextCell.getAttribute(HIDDEN_ATTR) !== "true"
      ) {
        placeholder.remove();
      }
    });
  }

  function syncHiddenCount() {
    const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
    runtime?.sendMessage?.({ type: "setHiddenCount", count: hiddenCount });
  }

  function recomputeHiddenCount() {
    const next = document.querySelectorAll(`[${COUNTED_ATTR}]`).length;
    if (next === hiddenCount) {
      return;
    }

    hiddenCount = next;
    syncHiddenCount();
  }

  function markHiddenCounted(tweet, counted) {
    if (counted) {
      if (!tweet.hasAttribute(COUNTED_ATTR)) {
        tweet.setAttribute(COUNTED_ATTR, "true");
      }
      return;
    }

    tweet.removeAttribute(COUNTED_ATTR);
  }

  function clearFilteredState(tweet, context) {
    const target = getHideTarget(tweet);
    target.removeAttribute(HIDDEN_ATTR);
    tweet.removeAttribute(HIDDEN_ATTR);
    tweet.removeAttribute(DIMMED_ATTR);
    tweet.setAttribute(PROCESSED_ATTR, "visible");
    tweet.setAttribute(CONTEXT_ATTR, context);
    removePlaceholder(tweet);
    // Legacy orphans can sit as previousSibling of this cell.
    const cell = getFeedCell(tweet);
    const prev = (cell ?? tweet).previousElementSibling;
    if (prev?.hasAttribute(PLACEHOLDER_ATTR)) {
      prev.remove();
    }
    markHiddenCounted(tweet, false);
  }

  function revealTweet(tweet) {
    const context = getTweetContext(tweet);
    tweet.setAttribute(REVEALED_ATTR, "true");
    clearFilteredState(tweet, context);
    tweet.setAttribute(
      FINGERPRINT_ATTR,
      buildTweetFingerprint(null, context)
    );
    recomputeHiddenCount();
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
      const badge = countryMatcher?.locationBadgeForAccount(
        getAboutEntry(handle)
      );
      const loc = badge?.display || accountText;
      return handle
        ? `Post from @${handle} hidden · ${loc}`
        : `Post hidden · ${loc}`;
    }

    if (reason === "country") {
      return handle
        ? `Post from @${handle} hidden (about account)`
        : "Post hidden (about account)";
    }

    // Unverified hide: still surface location when we already know it.
    const badge = countryMatcher?.locationBadgeForAccount(
      getAboutEntry(handle)
    );
    if (badge?.display && handle) {
      return `Post from @${handle} hidden · ${badge.display}`;
    }

    return handle ? `Post from @${handle} hidden` : "Unverified post hidden";
  }

  function buildPlaceholderFingerprint(handle, reason, labelText) {
    return `${handle || ""}|${reason || ""}|${labelText}`;
  }

  function createPlaceholder(tweet, handle, reason, accountText) {
    const labelText = buildPlaceholderLabel(handle, reason, accountText);
    const fingerprint = buildPlaceholderFingerprint(handle, reason, labelText);
    const existing = getPlaceholder(tweet);

    // D1: skip remove+recreate when handle/reason/label are unchanged.
    if (existing?.getAttribute(PLACEHOLDER_FP_ATTR) === fingerprint) {
      return existing;
    }

    removePlaceholder(tweet);

    const placeholder = document.createElement("div");
    placeholder.setAttribute(PLACEHOLDER_ATTR, "true");
    placeholder.setAttribute(PLACEHOLDER_FP_ATTR, fingerprint);
    placeholder.setAttribute("role", "status");
    placeholder.setAttribute("aria-live", "polite");
    placeholder.className = "hux-placeholder";

    const label = document.createElement("span");
    label.className = "hux-placeholder-label";
    label.textContent = labelText;

    const actions = document.createElement("div");
    actions.className = "hux-placeholder-actions";

    const showOnceButton = document.createElement("button");
    showOnceButton.type = "button";
    showOnceButton.className = "hux-placeholder-button";
    showOnceButton.textContent = "Show once";
    showOnceButton.setAttribute(
      "aria-label",
      handle ? `Show post from @${handle} once` : "Show hidden post once"
    );
    showOnceButton.addEventListener("click", (event) => {
      event.stopPropagation();
      revealTweet(tweet);
    });

    const alwaysShowButton = document.createElement("button");
    alwaysShowButton.type = "button";
    alwaysShowButton.className =
      "hux-placeholder-button hux-placeholder-button-secondary";
    alwaysShowButton.textContent = "Always show";

    if (handle) {
      alwaysShowButton.setAttribute(
        "aria-label",
        `Always show posts from @${handle}`
      );
      alwaysShowButton.addEventListener("click", (event) => {
        event.stopPropagation();
        addToWhitelist(handle);
        revealTweet(tweet);
      });
    } else {
      alwaysShowButton.disabled = true;
      alwaysShowButton.setAttribute(
        "aria-label",
        "Always show unavailable without account handle"
      );
    }

    actions.append(showOnceButton, alwaysShowButton);
    placeholder.append(label, actions);

    // Prefer inside the feed cell so X virtualization removes placeholder +
    // tweet together. Hiding only the article keeps the cell (and bar) visible.
    const cell = getFeedCell(tweet);
    if (cell) {
      cell.insertBefore(placeholder, cell.firstChild);
    } else {
      const target = getHideTarget(tweet);
      target.parentNode?.insertBefore(placeholder, target);
    }
    return placeholder;
  }

  function applyHiddenState(tweet, context, handle, reason, accountText) {
    const cell = getFeedCell(tweet);
    const target = getHideTarget(tweet);

    // Never leave a location badge on a post we're removing from the feed —
    // it can attach to the wrong header row and smash into the placeholder.
    removeLocationBadge(tweet);

    // Hide the tweet article; keep the feed cell visible so an in-cell
    // placeholder can render. Fall back to hiding the whole target when there
    // is no cell wrapper.
    if (cell) {
      cell.removeAttribute(HIDDEN_ATTR);
      tweet.setAttribute(HIDDEN_ATTR, "true");
    } else {
      target.setAttribute(HIDDEN_ATTR, "true");
      tweet.setAttribute(HIDDEN_ATTR, "true");
    }

    tweet.removeAttribute(DIMMED_ATTR);
    tweet.setAttribute(PROCESSED_ATTR, "hidden");
    tweet.setAttribute(CONTEXT_ATTR, context);

    if (settings.showPlaceholders) {
      createPlaceholder(tweet, handle, reason, accountText);
    } else {
      removePlaceholder(tweet);
    }

    markHiddenCounted(tweet, true);
  }

  function applyDimmedState(tweet, context) {
    const target = getHideTarget(tweet);

    target.removeAttribute(HIDDEN_ATTR);
    tweet.removeAttribute(HIDDEN_ATTR);
    tweet.setAttribute(DIMMED_ATTR, "true");
    tweet.setAttribute(PROCESSED_ATTR, "dimmed");
    tweet.setAttribute(CONTEXT_ATTR, context);
    removePlaceholder(tweet);

    markHiddenCounted(tweet, true);
  }

  function getFilterDecision(tweet) {
    if (tweet.hasAttribute(REVEALED_ATTR)) {
      return null;
    }

    const context = getTweetContext(tweet);
    const authorScope = getAuthorScope(tweet);
    const handle = extractHandle(authorScope);

    if (isFollowWhitelisted(tweet, handle, context)) {
      return null;
    }

    if (
      isVerificationFilterEnabled(context) &&
      isAnyBadgeEnabled() &&
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

  function buildTweetFingerprint(decision, context, locationKey = "") {
    if (!decision) {
      return `visible|${context}|${settings.displayMode}|loc:${locationKey}`;
    }

    return [
      settings.displayMode,
      settings.showPlaceholders ? "ph" : "noph",
      context,
      decision.reason || "",
      decision.handle || "",
      decision.accountText || "",
      `loc:${locationKey}`,
    ].join("|");
  }

  function getPrimaryHandle(tweet) {
    return extractHandle(getPrimaryUserName(tweet));
  }

  function getLocationBadgeInfo(handle) {
    if (!settings.showCountryFlags || !handle) {
      return null;
    }

    const entry = getAboutEntry(handle);
    return countryMatcher?.locationBadgeForAccount(entry) ?? null;
  }

  function locationFingerprintKey(handle) {
    if (!settings.showCountryFlags) {
      return "off";
    }

    if (!handle) {
      return "none";
    }

    const entry = getAboutEntry(handle);
    if (!entry) {
      return "miss";
    }

    if (entry.status === "pending") {
      return "pending";
    }

    if (entry.status === "error") {
      return "error";
    }

    const badge = countryMatcher?.locationBadgeForAccount(entry);
    return badge?.display || "empty";
  }

  function isPrimaryTweetNode(el, tweet) {
    return el && !isInsideNestedTweet(el, tweet);
  }

  /**
   * Resolve mount point left of Grok (or ···). Returns { parent, before }.
   */
  function findLocationBadgeMount(tweet) {
    // 1) Grok actions button (aria-label is typically "Grok actions").
    for (const el of tweet.querySelectorAll(
      'button, a[role="button"], div[role="button"], [aria-label]'
    )) {
      if (!isPrimaryTweetNode(el, tweet)) {
        continue;
      }

      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      const testId = (el.getAttribute("data-testid") || "").toLowerCase();
      if (label.includes("grok") || testId.includes("grok")) {
        const target =
          el.closest('button, a[role="button"], div[role="button"]') || el;
        if (target.parentElement) {
          return { parent: target.parentElement, before: target };
        }
      }
    }

    // 2) ··· caret / more menu in the same header cluster.
    for (const el of tweet.querySelectorAll(
      '[data-testid="caret"], button[aria-haspopup="menu"]'
    )) {
      if (!isPrimaryTweetNode(el, tweet)) {
        continue;
      }

      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      const testId = el.getAttribute("data-testid") || "";
      if (
        testId === "caret" ||
        label.includes("more") ||
        label.includes("post options") ||
        label.includes("status options")
      ) {
        if (el.parentElement) {
          return { parent: el.parentElement, before: el };
        }
      }
    }

    // 3) Header row that contains User-Name and at least one action control.
    const userName = getPrimaryUserName(tweet);
    if (userName) {
      let row = userName.parentElement;
      for (let depth = 0; depth < 8 && row && row !== tweet; depth += 1) {
        if (row.childElementCount >= 2) {
          const actions = [...row.children].filter((child) => {
            if (child.contains(userName)) {
              return false;
            }
            return Boolean(
              child.querySelector?.(
                'button, [role="button"], [data-testid="caret"], [aria-label*="Grok"], [aria-label*="grok"]'
              ) ||
                child.matches?.(
                  'button, [role="button"], [data-testid="caret"]'
                )
            );
          });

          if (actions.length) {
            const before = actions[0];
            return { parent: row, before };
          }
        }
        row = row.parentElement;
      }
    }

    return null;
  }

  function removeLocationBadge(tweet) {
    tweet.querySelectorAll(`[${LOCATION_BADGE_ATTR}]`).forEach((node) => {
      if (!isInsideNestedTweet(node, tweet)) {
        node.remove();
      }
    });
  }

  function isTweetHidden(tweet) {
    if (tweet.getAttribute(PROCESSED_ATTR) === "hidden") {
      return true;
    }

    const target = getHideTarget(tweet);
    return target?.getAttribute(HIDDEN_ATTR) === "true";
  }

  function syncLocationBadge(tweet, handle) {
    if (!settings.showCountryFlags) {
      removeLocationBadge(tweet);
      return;
    }

    // Hidden posts use the placeholder for location context — do not inject
    // into a display:none header (causes layout glitches with the black bar).
    if (isTweetHidden(tweet)) {
      removeLocationBadge(tweet);
      return;
    }

    const badge = getLocationBadgeInfo(handle);
    if (!badge) {
      removeLocationBadge(tweet);
      return;
    }

    const mount = findLocationBadgeMount(tweet);
    if (!mount?.parent || !mount.before) {
      removeLocationBadge(tweet);
      return;
    }

    // Refuse to mount into something that isn't part of this tweet article.
    if (!tweet.contains(mount.parent)) {
      removeLocationBadge(tweet);
      return;
    }

    let el = null;
    for (const node of tweet.querySelectorAll(`[${LOCATION_BADGE_ATTR}]`)) {
      if (!isInsideNestedTweet(node, tweet)) {
        el = node;
        break;
      }
    }

    if (!el) {
      el = document.createElement("span");
      el.setAttribute(LOCATION_BADGE_ATTR, "true");
      el.className = "hux-location-badge";
    }

    const fp = badge.display;
    if (el.getAttribute(LOCATION_BADGE_FP_ATTR) !== fp) {
      el.setAttribute(LOCATION_BADGE_FP_ATTR, fp);
      el.replaceChildren();

      // Split flag + text so the country name can ellipsis without clipping
      // the emoji, and narrow layouts can hide text (flag-only).
      if (badge.flag) {
        const flagEl = document.createElement("span");
        flagEl.className = "hux-location-badge-flag";
        flagEl.textContent = badge.flag;
        flagEl.setAttribute("aria-hidden", "true");
        el.append(flagEl);
      }

      if (badge.text) {
        const textEl = document.createElement("span");
        textEl.className = "hux-location-badge-text";
        textEl.textContent = badge.text;
        el.append(textEl);
      }

      el.title = badge.title || badge.display;
      el.setAttribute("aria-label", badge.title || badge.display);
    }

    // Keep immediately left of Grok / action cluster (right side of header).
    // That cluster is typically flex-end; long User-Name truncates on the left.
    if (el.parentElement !== mount.parent || el.nextElementSibling !== mount.before) {
      mount.parent.insertBefore(el, mount.before);
    }

    // Nudge the action cluster not to shrink under a long name.
    if (mount.parent && mount.parent instanceof HTMLElement) {
      if (!mount.parent.dataset.huxLocCluster) {
        mount.parent.dataset.huxLocCluster = "1";
        mount.parent.style.flexShrink = "0";
      }
    }
  }

  function isTopLevelTweet(tweet) {
    return !tweet.parentElement?.closest(SELECTORS.tweet);
  }

  function processTweet(tweet) {
    const context = getTweetContext(tweet);
    const primaryHandle = getPrimaryHandle(tweet);
    const decision = getFilterDecision(tweet);

    // Location badges never enqueue by themselves — they only render when
    // about data is already cached (country filter / About page / prior visit).
    const willHide = Boolean(decision) && settings.displayMode === "hide";

    const locationKey = willHide
      ? "hidden"
      : locationFingerprintKey(primaryHandle);
    const fingerprint = buildTweetFingerprint(decision, context, locationKey);

    // D6: skip filter DOM work when decision/settings fingerprint is unchanged.
    // Still re-sync the location badge — X often re-renders header actions.
    if (tweet.getAttribute(FINGERPRINT_ATTR) === fingerprint) {
      if (!willHide) {
        // Visible tweets must never keep a leftover placeholder bar.
        removePlaceholder(tweet);
        syncLocationBadge(tweet, primaryHandle);
      } else {
        removeLocationBadge(tweet);
      }
      return;
    }

    tweet.setAttribute(FINGERPRINT_ATTR, fingerprint);

    if (!decision) {
      clearFilteredState(tweet, context);
      syncLocationBadge(tweet, primaryHandle);
      return;
    }

    if (settings.displayMode === "dim") {
      applyDimmedState(tweet, context);
      syncLocationBadge(tweet, primaryHandle);
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
    // Rebuild once per pass so isReply can classify conversation descendants
    // without re-querying the full tweet list for every article.
    rebuildConversationReplyCache();
    cleanupOrphanPlaceholders(root);

    root.querySelectorAll(SELECTORS.tweet).forEach((tweet) => {
      if (!isTopLevelTweet(tweet)) {
        return;
      }

      processTweet(tweet);
    });

    // Second pass: virtualization may leave bars after tweets update.
    cleanupOrphanPlaceholders(root);
    recomputeHiddenCount();
  }

  function scheduleProcess() {
    if (pendingFrame !== null) {
      cancelAnimationFrame(pendingFrame);
    }

    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;
      scanFollowedByFollowingProof();
      processTweets();
    });
  }

  function nodeAffectsTweets(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    if (
      node.matches?.(SELECTORS.tweet) ||
      node.querySelector?.(SELECTORS.tweet) ||
      node.matches?.(SELECTORS.homeTab) ||
      node.querySelector?.(SELECTORS.homeTab)
    ) {
      return true;
    }

    if (
      node.matches?.(SELECTORS.verifiedBadge) ||
      node.querySelector?.(SELECTORS.verifiedBadge) ||
      node.matches?.(SELECTORS.userName) ||
      node.querySelector?.(SELECTORS.userName)
    ) {
      return !!node.closest?.(SELECTORS.tweet);
    }

    return false;
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
          if (nodeAffectsTweets(node)) {
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

      if (settings.whitelistFollowedByFollowing) {
        scheduleScanFollowedByProof();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected"],
    });

    scanFollowedByFollowingProof();
    processTweets();
  }

  function applySettings(nextSettings) {
    settings = normalizeStoredSettings(nextSettings);
    startObserver();
    scanFollowedByFollowingProof();
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

  function sanitizeHandle(value) {
    if (typeof value !== "string") {
      return null;
    }

    const handle = value.trim().replace(/^@/, "").toLowerCase();
    return HANDLE_PATTERN.test(handle) ? handle : null;
  }

  function sanitizeQueryId(value) {
    if (typeof value !== "string") {
      return null;
    }

    const queryId = value.trim();
    return QUERY_ID_PATTERN.test(queryId) ? queryId : null;
  }

  function sanitizeAboutText(value) {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim().slice(0, 500);
  }

  function sanitizeHandleList(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    const handles = [];
    const limit = Math.min(value.length, MAX_MESSAGE_ARRAY);

    for (let i = 0; i < limit; i += 1) {
      const handle = sanitizeHandle(value[i]);
      if (handle) {
        handles.push(handle);
      }
    }

    return handles;
  }

  function sanitizeTweetAuthors(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    const tweets = [];
    const limit = Math.min(value.length, MAX_MESSAGE_ARRAY);

    for (let i = 0; i < limit; i += 1) {
      const raw = value[i];
      if (!raw || typeof raw !== "object") {
        continue;
      }

      const tweetId = String(raw.tweetId ?? raw.tweet_id ?? "").trim();
      if (!/^\d{1,30}$/.test(tweetId)) {
        continue;
      }

      const handle = sanitizeHandle(raw.handle);
      if (!handle) {
        continue;
      }

      tweets.push({
        tweetId,
        handle,
        following: raw.following === true,
      });
    }

    return tweets;
  }

  function handlePageMessage(event) {
    if (
      event.source !== window ||
      event.origin !== window.location.origin ||
      event.data?.source !== MESSAGE_SOURCE ||
      typeof event.data !== "object" ||
      event.data === null
    ) {
      return;
    }

    const { type } = event.data;

    if (type === "hux-about-query-id") {
      const queryId = sanitizeQueryId(event.data.queryId);
      if (queryId) {
        aboutAccount?.setQueryId(queryId);
      }
      return;
    }

    if (type === "hux-about-account") {
      const handle = sanitizeHandle(event.data.handle);
      if (!handle) {
        return;
      }

      aboutAccount?.upsertFromInterceptor(
        handle,
        sanitizeAboutText(event.data.basedIn),
        sanitizeAboutText(event.data.connectedVia),
        event.data.accurate !== false
      );
      return;
    }

    if (type === "hux-about-account-error") {
      const handle = sanitizeHandle(event.data.handle);
      if (!handle) {
        return;
      }

      aboutAccount?.markErrorFromInterceptor?.(handle, {
        rateLimited: event.data.rateLimited === true,
      });
      return;
    }

    if (type === "hux-following-users") {
      const handles = sanitizeHandleList(event.data.handles);
      if (handles.length) {
        followingCache?.addHandles(handles);
      }
      return;
    }

    if (type === "hux-tweet-authors") {
      const tweets = sanitizeTweetAuthors(event.data.tweets);
      if (tweets.length) {
        followingCache?.addTweetAuthors(tweets);
      }
      return;
    }

    if (type === "hux-followed-by-following") {
      const handles = sanitizeHandleList(event.data.handles);
      if (handles.length) {
        followingCache?.addFollowedByFollowing(handles);
      }
    }
  }

  function signalReady() {
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: READY_TYPE,
      },
      window.location.origin
    );
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

  function startPathWatcher() {
    lastPathname = location.pathname;

    setInterval(() => {
      if (location.pathname === lastPathname) {
        return;
      }

      lastPathname = location.pathname;
      // SPA navigation: reset count and reprocess the new timeline.
      hiddenCount = 0;
      syncHiddenCount();
      scheduleProcess();
    }, 1000);
  }

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
    signalReady();
    aboutAccount?.init(() => scheduleProcess());
    followingCache?.setOnUpdate(() => scheduleProcess());
    startPathWatcher();
    loadSettings();
  }

  init();
})();
