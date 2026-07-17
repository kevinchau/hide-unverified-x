(function () {
  "use strict";

  const DEFAULT_SETTINGS = {
    forYou: true,
    following: true,
    replies: true,
    badgeBlue: true,
    badgeGold: true,
    badgeGovernment: false,
    retweetAuthor: "original",
    quoteAuthor: "quoter",
    displayMode: "dim",
    showPlaceholders: true,
    whitelist: [],
    whitelistFollowing: false,
    whitelistFollowedByFollowing: false,
    countryForYou: false,
    countryReplies: false,
    countryMode: "blocklist",
    countryList: [],
    countryUnknown: "show",
    countryMatchFields: "both",
    showCountryFlags: true,
  };

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

  function normalizeBadgeSettings(result) {
    if (typeof result.badgeBlue === "boolean") {
      return {
        badgeBlue: result.badgeBlue,
        badgeGold: result.badgeGold !== false,
        badgeGovernment: result.badgeGovernment === true,
      };
    }

    if (result.badgeType === "any") {
      return {
        badgeBlue: true,
        badgeGold: true,
        badgeGovernment: true,
      };
    }

    return {
      badgeBlue: true,
      badgeGold: true,
      badgeGovernment: false,
    };
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
      ...normalizeBadgeSettings(result),
      retweetAuthor:
        result.retweetAuthor === "retweeter" ? "retweeter" : "original",
      quoteAuthor: result.quoteAuthor === "quoted" ? "quoted" : "quoter",
      // Default is dim; only an explicit "hide" opts into remove-from-feed.
      displayMode: result.displayMode === "hide" ? "hide" : "dim",
      showPlaceholders:
        typeof result.showPlaceholders === "boolean"
          ? result.showPlaceholders
          : DEFAULT_SETTINGS.showPlaceholders,
      whitelist: normalizeWhitelist(result.whitelist),
      whitelistFollowing: result.whitelistFollowing === true,
      whitelistFollowedByFollowing: result.whitelistFollowedByFollowing === true,
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
      showCountryFlags:
        typeof result.showCountryFlags === "boolean"
          ? result.showCountryFlags
          : DEFAULT_SETTINGS.showCountryFlags,
    };
  }

  globalThis.HUXSettings = {
    DEFAULT_SETTINGS,
    normalizeWhitelist,
    normalizeCountryList,
    normalizeBadgeSettings,
    normalizeStoredSettings,
  };
})();
