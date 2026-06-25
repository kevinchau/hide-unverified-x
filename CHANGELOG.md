# Changelog

All notable changes to this project are documented here.

## [1.7.5] — 2026-06-23

### Fixed
- **Followed by your follows** whitelist — detect social-context labels on feed tweets (not only cached profile visits); GraphQL parsing now pairs social proof with the tweet/profile subject instead of the mentioned friends

## [1.7.4] — 2026-06-23

### Added
- **Safari (macOS)** — third-party Safari Web Extension in [`safari/`](safari/), buildable from the repo with Xcode (`npm run prepare:safari` syncs web resources)

## [1.7.3] — 2026-06-23

### Added
- Firefox `update_url` for self-hosted updates via GitHub Releases (`updates.json` on `main`, synced on `npm run build:firefox`)

## [1.7.2] — 2026-06-23

### Fixed
- Firefox AMO **Duplicate add-on ID** — replaced `hide-unverified-x@kevinchau.github` with a unique UUID (`{b4e8a1c2-3f5d-4e7a-9b0c-1d2e3f4a5b6c}`); ID is centralized in `scripts/package-shared.mjs`

## [1.7.1] — 2026-06-23

### Added
- **Sideload workflow** — `npm run sideload` prepares `dist/sideload/chrome` and `dist/sideload/firefox` for local install without app stores
- Chrome Web Store packaging (`npm run build:chrome`) and store listing copy in `store/chrome-listing.txt`
- `npm run build` produces both Chrome and Firefox packages

### Fixed
- Firefox AMO submission: add `browser_specific_settings.gecko.data_collection_permissions` (`required: ["none"]`)
- Firefox minimum version raised to 140.0 (required for built-in data consent)

## [1.7.0] — 2026-06-22

### Added
- **Followed by your follows** whitelist — surfaces non-verified accounts that appear in the profile “Followed by … you follow” social proof
- Passive GraphQL detection plus profile-page DOM scanning; handles cached locally as you browse
- Firefox packaging script (`npm run build:firefox`) and optional `web-ext sign` flow for Mozilla signing

## [1.6.0] — 2026-06-22

### Fixed
- **Early GraphQL data loss** — MAIN-world interceptor buffers messages until the content script signals ready
- **Late verification badges** — MutationObserver now reprocesses tweets when badges or usernames load inside existing posts
- **About-account cache** — Runtime size cap and automatic retry of empty lookups after one hour
- **Follow whitelist on For You** — GraphQL tweet-ID → author following map supplements the handle cache
- **False follow positives** — Tightened user detection in the network interceptor (requires user-shaped objects)
- **Extension reload** — Network hooks are no longer double-patched on hot reload
- **i18n context detection** — Home tab, reply, and retweet detection use href/structure fallbacks beyond English text
- **Verification filter** — Skips filtering when all badge toggles are off
- Popup counter now reads **N filtered** (accurate for dim mode)

## [1.5.1] — 2026-06-22

### Fixed
- **Follow whitelist** — `whitelistFollowing` setting was never applied in the content script, so the toggle had no effect
- Re-process tweets when the following cache loads from storage or receives GraphQL updates (fixed dropped `requestAnimationFrame` coalescing)
- Intercept `XMLHttpRequest` GraphQL responses in addition to `fetch` so followed handles are discovered reliably
- Following tab bypasses verification filter when follow-whitelist is enabled

## [1.5.0] — 2026-06-22

### Added
- **Always show accounts you follow** toggle — blanket whitelist built from X GraphQL `following` fields
- `following-cache.js` — local cache of followed handles, populated passively while browsing

## [1.4.5] — 2026-06-22

### Added
- Independent toggles for **blue**, **gold**, and **silver** (government) verification badges

### Changed
- Replaced the verification dropdown with per-badge switches in the popup
- Migrates legacy `badgeType` settings automatically

## [1.4.4] — 2026-06-22

### Fixed
- Gold organization checkmarks no longer treated as unverified

## [1.4.3] — 2026-06-22

### Changed
- Expanded suggested spam blocklist to full South Asia and Africa country lists
- One-click blocklist now pastes explicit regions, countries, and App Store strings

## [1.4.2] — 2026-06-22

### Added
- `southasia` and `africa` preset shortcuts for the about-account blocklist
- **Use suggested spam blocklist** button in Advanced settings

## [1.4.1] — 2026-06-22

### Fixed
- Firefox temporary add-on install (`background.scripts` alongside `service_worker`)

## [1.4.0] — 2026-06-22

### Added
- About-account filter using `Account based in` and `Connected via` from `/username/about`
- Passive `AboutAccountQuery` interception and cached lookups (no API keys)

### Removed
- Profile bio location matching (unreliable for spam filtering)

## [1.3.0] — 2026-06-22

### Added
- Country filter via passive GraphQL interception (superseded by v1.4.0 about-account approach)

## [1.2.0] — 2026-06-22

### Added
- Verification rules (blue vs any badge, retweet/quote author selection)
- Softer UX: hide/dim modes, placeholder cards, whitelist, per-tab hidden count
- Advanced settings page

## [1.1.0] — 2026-06-22

### Added
- Per-context toggles for **For you**, **Following**, and **Replies**

## [1.0.0] — 2026-06-22

### Added
- Initial release: hide unverified posts on X for Chrome and Firefox
- Popup toggle, Manifest V3, MIT license