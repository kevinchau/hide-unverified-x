(function () {
  "use strict";

  const CACHE_KEY = "followingHandles";
  const FOLLOWED_BY_CACHE_KEY = "followedByFollowingHandles";
  const MAX_ENTRIES = 20000;
  const MAX_FOLLOWED_BY_ENTRIES = 20000;
  const MAX_TWEET_ENTRIES = 10000;
  const PERSIST_DELAY_MS = 2000;

  const following = new Set();
  const followedByFollowing = new Set();
  const tweetAuthors = new Map();
  let onUpdate = null;
  let persistTimer = null;
  let loadComplete = false;
  let loadStarted = false;
  let dirty = false;

  const localStorage =
    globalThis.chrome?.storage?.local ?? globalThis.browser?.storage?.local;

  function schedulePersist() {
    if (!localStorage) {
      return;
    }

    dirty = true;

    // Do not write until initial load finishes (avoids clobbering disk with partial state).
    if (!loadComplete) {
      return;
    }

    if (persistTimer !== null) {
      clearTimeout(persistTimer);
    }

    persistTimer = setTimeout(() => {
      persistTimer = null;
      dirty = false;
      localStorage.set({
        [CACHE_KEY]: [...following],
        [FOLLOWED_BY_CACHE_KEY]: [...followedByFollowing],
      });
    }, PERSIST_DELAY_MS);
  }

  function finishLoad() {
    loadComplete = true;
    if (dirty) {
      schedulePersist();
    }
    onUpdate?.();
  }

  function load() {
    if (!localStorage || loadComplete || loadStarted) {
      return;
    }

    loadStarted = true;
    localStorage.get(
      { [CACHE_KEY]: [], [FOLLOWED_BY_CACHE_KEY]: [] },
      (result) => {
        const handles = Array.isArray(result[CACHE_KEY]) ? result[CACHE_KEY] : [];
        for (const handle of handles) {
          const normalized = String(handle).trim().toLowerCase();
          if (normalized) {
            following.add(normalized);
          }
        }

        const followedByHandles = Array.isArray(result[FOLLOWED_BY_CACHE_KEY])
          ? result[FOLLOWED_BY_CACHE_KEY]
          : [];
        for (const handle of followedByHandles) {
          const normalized = String(handle).trim().toLowerCase();
          if (normalized) {
            followedByFollowing.add(normalized);
          }
        }

        finishLoad();
      }
    );
  }

  function trimHandleCache() {
    if (following.size <= MAX_ENTRIES) {
      return;
    }

    const excess = following.size - MAX_ENTRIES;
    const iterator = following.values();
    for (let i = 0; i < excess; i += 1) {
      const value = iterator.next().value;
      if (value) {
        following.delete(value);
      }
    }
  }

  function trimFollowedByCache() {
    if (followedByFollowing.size <= MAX_FOLLOWED_BY_ENTRIES) {
      return;
    }

    const excess = followedByFollowing.size - MAX_FOLLOWED_BY_ENTRIES;
    const iterator = followedByFollowing.values();
    for (let i = 0; i < excess; i += 1) {
      const value = iterator.next().value;
      if (value) {
        followedByFollowing.delete(value);
      }
    }
  }

  function trimTweetCache() {
    if (tweetAuthors.size <= MAX_TWEET_ENTRIES) {
      return;
    }

    const excess = tweetAuthors.size - MAX_TWEET_ENTRIES;
    const iterator = tweetAuthors.keys();
    for (let i = 0; i < excess; i += 1) {
      const key = iterator.next().value;
      if (key) {
        tweetAuthors.delete(key);
      }
    }
  }

  function addHandles(handles) {
    if (!Array.isArray(handles) || !handles.length) {
      return;
    }

    let changed = false;
    for (const rawHandle of handles) {
      const handle = String(rawHandle).trim().toLowerCase();
      if (!handle || following.has(handle)) {
        continue;
      }

      following.add(handle);
      changed = true;
    }

    if (!changed) {
      return;
    }

    trimHandleCache();
    schedulePersist();
    onUpdate?.();
  }

  function addTweetAuthors(tweets) {
    if (!Array.isArray(tweets) || !tweets.length) {
      return;
    }

    let changed = false;

    for (const rawTweet of tweets) {
      const tweetId = String(rawTweet?.tweetId ?? rawTweet?.tweet_id ?? "").trim();
      const handle = String(rawTweet?.handle ?? "")
        .trim()
        .toLowerCase();
      const isFollowed = rawTweet?.following === true;

      if (!tweetId) {
        continue;
      }

      const previous = tweetAuthors.get(tweetId);
      if (
        previous?.handle === handle &&
        previous?.following === isFollowed
      ) {
        continue;
      }

      tweetAuthors.set(tweetId, { handle, following: isFollowed });
      changed = true;

      if (isFollowed && handle && !following.has(handle)) {
        following.add(handle);
        changed = true;
      }
    }

    if (!changed) {
      return;
    }

    trimHandleCache();
    trimTweetCache();
    schedulePersist();
    onUpdate?.();
  }

  function isFollowing(handle) {
    if (!handle) {
      return false;
    }

    return following.has(handle.toLowerCase());
  }

  function isTweetFromFollowing(tweetId) {
    if (!tweetId) {
      return false;
    }

    return tweetAuthors.get(String(tweetId))?.following === true;
  }

  function addFollowedByFollowing(handles) {
    if (!Array.isArray(handles) || !handles.length) {
      return;
    }

    let changed = false;
    for (const rawHandle of handles) {
      const handle = String(rawHandle).trim().toLowerCase();
      if (!handle || followedByFollowing.has(handle)) {
        continue;
      }

      followedByFollowing.add(handle);
      changed = true;
    }

    if (!changed) {
      return;
    }

    trimFollowedByCache();
    schedulePersist();
    onUpdate?.();
  }

  function isFollowedByFollowing(handle) {
    if (!handle) {
      return false;
    }

    return followedByFollowing.has(handle.toLowerCase());
  }

  function setOnUpdate(callback) {
    onUpdate = callback;
    if (loadComplete) {
      onUpdate();
    }
  }

  if (!localStorage) {
    finishLoad();
  } else {
    load();
  }

  globalThis.HUXFollowing = {
    addHandles,
    addTweetAuthors,
    addFollowedByFollowing,
    isFollowing,
    isTweetFromFollowing,
    isFollowedByFollowing,
    setOnUpdate,
    size: () => following.size,
  };
})();
