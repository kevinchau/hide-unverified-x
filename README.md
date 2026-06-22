# Hide Unverified X

A lightweight browser extension for **Chrome** and **Firefox** that hides posts and replies from accounts without a blue check on [X](https://x.com).

No accounts. No tracking. Everything runs locally in your browser.

## Features

- Hides or dims unverified posts and replies
- Separate toggles for **For you**, **Following**, and **Replies**
- **Verification rules** — blue check only or any badge; choose author for retweets and quote tweets
- **Softer UX** — placeholder cards with **Show once** and **Always show**, plus per-tab hidden count
- **Whitelist** — always show specific accounts
- **Country filter** — block or allow locations using data X already loads (no API keys, no extra requests)
- Manifest V3, compatible with Chrome and Firefox

## Install

### Chrome

1. Clone this repo or [download it](https://github.com/kevinchau/hide-unverified-x/archive/refs/heads/main.zip)
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project folder

### Firefox

1. Clone this repo or download it
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select `manifest.json` in the project folder

> Temporary add-ons in Firefox are removed when the browser restarts. For a permanent install, package and sign the extension via [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/).

## Usage

### Popup

| Setting | What it does |
| --- | --- |
| **For you** | Filter recommended home timeline posts |
| **Following** | Filter posts from accounts you follow |
| **Replies** | Filter reply posts across X |
| **Count as verified** | Blue check only, or any badge (gold/gray included) |
| **Hide / Dim** | Remove posts entirely, or fade them out |
| **Placeholder cards** | Show a slim bar with reveal actions when hiding |
| **Country filter (For you / Replies)** | Filter by profile location from timeline data |

The popup also shows how many posts are hidden in the current X tab.

### Country filter (free, no rate limits)

This does **not** call `AboutAccountQuery` or create API keys. Instead, a page interceptor
reads user location fields from GraphQL responses X already fetches for your feed:

- `legacy.location` — the profile location text users set themselves
- `about_profile.account_based_in` — when X includes it in a response

Configure countries in **Advanced settings** (blocklist or allowlist). Unknown locations
default to **show** so posts are not hidden without data.

### Advanced settings

Open **Advanced settings** from the popup, or right-click the extension icon → **Options**.

| Setting | What it does |
| --- | --- |
| **Retweets** | Filter based on the original author or the person who reposted |
| **Quote tweets** | Filter based on the quoter or the quoted author |
| **Whitelist** | Handles that are always shown, one per line |

Placeholder actions:

- **Show once** — reveal the post until you reload the tab
- **Always show** — add the author to your whitelist

## How it works

1. A content script watches for new `article[data-testid="tweet"]` elements
2. It determines context (For you, Following, Replies, or other)
3. It resolves the relevant author based on your retweet/quote settings
4. It checks for a verification badge in that author's name row
5. Unverified posts are hidden or dimmed; optional placeholder cards offer reveal actions

Profiles, search, and other pages are not filtered yet.

## Project structure

```
hide-unverified-x/
├── manifest.json
├── page-interceptor.js  # Reads location data from existing GraphQL responses
├── country-match.js     # Country text matching helpers
├── background.js        # Per-tab hidden count relay
├── content.js           # Tweet filtering logic
├── content.css
├── popup/               # Quick settings
├── options/             # Advanced settings
└── icons/
```

## Privacy

This extension does not collect, transmit, or store any personal data beyond your settings and whitelist, saved locally via `chrome.storage.sync`.

## License

MIT — see [LICENSE](LICENSE).