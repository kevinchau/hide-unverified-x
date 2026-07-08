# Multiagent Review Fixes — Implementation Plan

Branch: `fix/multiagent-review-fixes`

## Workstreams (parallel worktrees)

### A — Cache races (`about-account.js`, `following-cache.js`)
- [x] A1. Distinguish error vs empty about entries; backoff retry for errors
- [x] A2. Init merge by fetchedAt (don't clobber fresher interceptor data)
- [x] A3. Following: do not persist until loadComplete; flush dirty after load

### B — Country match + tests (`country-match.js`, `tests/`, `package.json`)
- [x] B1. Word/token boundary matching (avoid niger⊂nigeria false positives)
- [x] B2. Node unit tests for country-match
- [x] B3. `npm test` script

### C — Interceptor (`page-interceptor.js`)
- [x] C1. Cap messageBuffer (drop oldest)
- [x] C2. Coerce/sanitize handles and about strings at publish time

### D — Content filter (`content.js`, `content.css`)
- [x] D1. Idempotent placeholders (skip recreate if unchanged)
- [x] D2. Quote detection via nested tweet article (not card.wrapper)
- [x] D3. Recompute hidden count from DOM; reset on navigation
- [x] D4. Validate untrusted postMessage payloads
- [x] D5. Treat about status error as fail-open (show)
- [x] D6. Noop processTweet early exit when fingerprint unchanged
- [x] D7. Placeholder a11y: role=status, focus-visible, disable Always show without handle

### E — UI (`popup/*`, `options/*`, `manifest.json`)
- [x] E1. Options autosave textareas (debounce) + keep Save buttons
- [x] E2. Confirm before suggested blocklist overwrite
- [x] E3. Per-section status (not reuse whitelist status for retweet)
- [x] E4. Empty About-account CTA in popup when toggles on + empty list
- [x] E5. focus-visible styles popup/options
- [x] E6. Count state when not on X; storage.onChanged session fallback
- [x] E7. Replace `tabs` with `activeTab`
- [x] E8. Dim mode: disable/grey placeholders with reason; Display helper copy

### F — Docs (`README.md`, `store/chrome-listing.txt`, `CHANGELOG.md`)
- [x] F1. Privacy section accurate
- [x] F2. Version badges/install links → 1.7.6 / latest
- [x] F3. CHANGELOG [Unreleased] entry

### G — Settings schema extract
- [x] G1. `settings-schema.js` shared DEFAULTS + normalize; wire content/popup/options
- [x] G2. Run prepare scripts so chrome/ + safari Resources stay in sync

## Integration
- [x] Merge worktrees onto `fix/multiagent-review-fixes` (cherry-pick A–G)
- [x] `npm run prepare:chrome && prepare:safari && prepare:firefox`
- [x] `npm test` — 16/16 pass
- [x] Syntax check on core JS

## Deferred (review noted; not in this PR)
- Full `content.js` god-file split into many modules (partially helped by settings-schema)
- Full `_locales` i18n infrastructure
- Account-switch keyed caches
- MAIN-world session nonce for postMessage (validation done; nonce not added)

## Review section

### Method
Seven worktree-isolated subagents (A–G) + orchestrator merge via `git remote add` + cherry-pick (Grok isolation worktrees are full git clones, not linked worktrees).

### Results
| Stream | Commit (local) | Outcome |
|--------|----------------|---------|
| A cache | `fix(cache): about error status…` | errorEntry + merge + dirty persist |
| B country | `fix(country): word-boundary…` | 16 unit tests |
| C interceptor | `fix(interceptor): cap…` | buffer 200 + sanitize |
| D content | `fix(content): placeholders…` | quotes, count, a11y, validate |
| E UI | `fix(ui): options autosave…` | activeTab, CTA, focus |
| F docs | `docs: privacy accuracy…` | README/store/CHANGELOG |
| G schema | `refactor: extract settings-schema…` | HUXSettings shared |

### Verification
- `npm test` → 16 pass
- `node --check` on core scripts
- prepare:* stages chrome/, safari Resources, dist/sideload/firefox with `settings-schema.js` and `activeTab`

### Not shipped here
- Splitting remaining content.js responsibilities
- chrome.i18n / multi-locale UI
- Nonce-authenticated MAIN bridge
