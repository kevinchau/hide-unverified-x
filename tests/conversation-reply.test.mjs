import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Mirrors content.js getStatusIdFromPath / conversation focus logic so
 * status-page reply classification stays covered without a browser DOM.
 */

function getStatusIdFromPath(pathname) {
  const match = String(pathname).match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

function conversationReplyIndices(tweetIds, pageStatusId) {
  if (!pageStatusId || !tweetIds.length) {
    return [];
  }

  let focusedIndex = tweetIds.findIndex((id) => id === pageStatusId);
  if (focusedIndex < 0) {
    focusedIndex = 0;
  }

  const replies = [];
  for (let i = focusedIndex + 1; i < tweetIds.length; i++) {
    replies.push(i);
  }
  return replies;
}

describe("getStatusIdFromPath", () => {
  it("parses /user/status/id", () => {
    assert.equal(
      getStatusIdFromPath("/KenKirtland17/status/1945000000000000000"),
      "1945000000000000000"
    );
  });

  it("parses /i/status/id", () => {
    assert.equal(getStatusIdFromPath("/i/status/12345"), "12345");
  });

  it("returns null off status pages", () => {
    assert.equal(getStatusIdFromPath("/home"), null);
    assert.equal(getStatusIdFromPath("/CollectPanda33"), null);
    assert.equal(getStatusIdFromPath("/explore"), null);
  });
});

describe("conversation reply indices", () => {
  it("marks only tweets below the focused status as replies", () => {
    const ids = ["parent1", "parent2", "focus", "reply1", "reply2"];
    assert.deepEqual(conversationReplyIndices(ids, "focus"), [3, 4]);
  });

  it("does not mark the focused tweet as a reply", () => {
    const ids = ["focus", "reply1"];
    assert.deepEqual(conversationReplyIndices(ids, "focus"), [1]);
    assert.ok(!conversationReplyIndices(ids, "focus").includes(0));
  });

  it("falls back to first tweet as focus when page id is missing from list", () => {
    const ids = ["a", "b", "c"];
    assert.deepEqual(conversationReplyIndices(ids, "missing"), [1, 2]);
  });

  it("returns empty when not on a status page", () => {
    assert.deepEqual(conversationReplyIndices(["a", "b"], null), []);
  });
});
