const sessionStorage =
  globalThis.chrome?.storage?.session ?? globalThis.browser?.storage?.session;
const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;

function countKey(tabId) {
  return `hiddenCount:${tabId}`;
}

runtime?.onMessage?.addListener((message, sender) => {
  if (message?.type !== "setHiddenCount" || !sender.tab?.id || !sessionStorage) {
    return;
  }

  sessionStorage.set({
    [countKey(sender.tab.id)]: Math.max(0, message.count ?? 0),
  });
});