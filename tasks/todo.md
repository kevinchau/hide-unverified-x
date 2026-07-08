# Multiagent Review Fixes — Implementation Plan

Branch target: `fix/multiagent-review-fixes` (merge of worktree agents)

## Workstreams (parallel, non-overlapping files)

### A — Cache races (`about-account.js`, `following-cache.js`)
- [ ] A1. Distinguish error vs empty about entries; backoff retry for errors
- [ ] A2. Init merge by fetchedAt (don't clobber fresher interceptor data)
- [ ] A3. Following: do not persist until loadComplete; flush dirty after load

### B — Country match + tests (`country-match.js`, `tests/`, `package.json`)
- [ ] B1. Word/token boundary matching (avoid niger⊂nigeria false positives)
- [ ] B2. Node unit tests for country-match
- [ ] B3. `npm test` script

### C — Interceptor (`page-interceptor.js`)
- [ ] C1. Cap messageBuffer (drop oldest)
- [ ] C2. Coerce/sanitize handles and about strings at publish time

### D — Content filter (`content.js`, `content.css`)
- [ ] D1. Idempotent placeholders (skip recreate if unchanged)
- [ ] D2. Quote detection via nested tweet article (not card.wrapper)
- [ ] D3. Recompute hidden count from DOM; reset on navigation
- [ ] D4. Validate untrusted postMessage payloads
- [ ] D5. Treat about status error as fail-open (show)
- [ ] D6. Noop processTweet early exit when fingerprint unchanged
- [ ] D7. Placeholder a11y: role=status, focus-visible, disable Always show without handle

### E — UI (`popup/*`, `options/*`, `background.js`, `manifest.json`)
- [ ] E1. Options autosave textareas (debounce) + keep Save buttons
- [ ] E2. Confirm before suggested blocklist overwrite
- [ ] E3. Per-section status (not reuse whitelist status for retweet)
- [ ] E4. Empty About-account CTA in popup when toggles on + empty list
- [ ] E5. focus-visible styles popup/options
- [ ] E6. Count state when not on X; storage.onChanged session fallback
- [ ] E7. Replace `tabs` with `activeTab` if possible
- [ ] E8. Dim mode: disable/grey placeholders with reason; Display helper copy

### F — Docs + packaging (`README.md`, `store/chrome-listing.txt`, `CHANGELOG.md`)
- [ ] F1. Privacy section accurate (follow caches, X GraphQL, Firefox updates, sync)
- [ ] F2. Version badges/install links → 1.7.6 / latest
- [ ] F3. CHANGELOG entry for this work

### G — Settings schema extract (after A–F merge if needed)
- [ ] G1. `settings-schema.js` shared DEFAULTS + normalize; wire content/popup/options
- [ ] G2. Run prepare scripts so chrome/ + safari Resources stay in sync

## Integration
- [ ] Merge worktrees onto `fix/multiagent-review-fixes`
- [ ] `npm run prepare:chrome && npm run prepare:firefox && npm run prepare:safari` (or full prepare)
- [ ] `npm test`
- [ ] Smoke-check manifests / syntax
- [ ] Document results in this file

## Review section
_(filled after merge)_
