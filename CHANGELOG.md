# Changelog

All notable changes to this project are documented here.

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