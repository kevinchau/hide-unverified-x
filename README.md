# Hide Unverified X

A lightweight browser extension for **Chrome** and **Firefox** that filters posts on [X](https://x.com) by verification status and **About this account** metadata.

No developer API keys. Everything runs locally in your browser.

## Features

- Hides or dims unverified posts and replies
- Separate toggles for **For you**, **Following**, and **Replies**
- **Verification rules** — blue check only or any badge; choose author for retweets and quote tweets
- **About-account filter** — match **Account based in** and **Connected via** from `/username/about`
- **Softer UX** — placeholder cards with **Show once** and **Always show**, plus per-tab hidden count
- **Whitelist** — always show specific accounts
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
| **For you / Following / Replies** | Verification filtering per context |
| **About-account filter** | Filter For you / Replies using About this account data |
| **Count as verified** | Blue check only, or any badge (gold/gray included) |
| **Hide / Dim** | Remove posts entirely, or fade them out |
| **Placeholder cards** | Show a slim bar with reveal actions when hiding |

The popup also shows how many posts are hidden in the current X tab.

### About-account filter

This uses the same data as [About this account](https://x.com/zundamotisuki/about):

| Field | Example |
| --- | --- |
| **Account based in** | `India`, `South Asia`, `Nigeria`, `Africa` |
| **Connected via** | `India App Store`, `Nigeria App Store` |

How it works:

1. When you visit an `/about` page, responses are captured passively (no extra request)
2. For feed authors without cached data, the extension calls X's internal `AboutAccountQuery` using your existing login session
3. Results are cached locally and queued slowly (~1.5s apart) to reduce rate limits
4. No Twitter Developer Portal API keys are required

Configure blocklist/allowlist terms in **Advanced settings**. You can match against based-in, connected-via, or both. Unknown or still-loading accounts default to **show**.

**Suggested spam blocklist** covers common spam regions on X:

- **South Asia** — region plus Afghanistan, Bangladesh, Bhutan, India, Maldives, Nepal, Pakistan, Sri Lanka, and their App Store strings
- **Africa** — Africa, Sub-Saharan Africa, North Africa, and all 54 African countries (Nigeria, Ghana, Kenya, Ethiopia, South Africa, Egypt, Morocco, etc.) plus common App Store strings

Shortcuts `southasia` and `africa` still expand automatically. Click **Use suggested spam blocklist** in Advanced settings to paste the full list with blocklist mode.

### Advanced settings

Open **Advanced settings** from the popup, or right-click the extension icon → **Options**.

| Setting | What it does |
| --- | --- |
| **Retweets** | Filter based on the original author or the person who reposted |
| **Quote tweets** | Filter based on the quoter or the quoted author |
| **About-account filter** | Blocklist/allowlist, match fields, unknown-account behavior |
| **Whitelist** | Handles that are always shown, one per line |

Placeholder actions:

- **Show once** — reveal the post until you reload the tab
- **Always show** — add the author to your whitelist

## How it works

1. A content script watches for new `article[data-testid="tweet"]` elements
2. Verification is checked from the tweet DOM (badge SVG)
3. About-account data is fetched via `AboutAccountQuery` or intercepted from `/about` page loads
4. Unverified or blocked posts are hidden or dimmed; optional placeholder cards offer reveal actions

## Project structure

```
hide-unverified-x/
├── manifest.json
├── page-interceptor.js  # Captures AboutAccountQuery responses in-page
├── about-account.js     # Cached AboutAccountQuery lookups
├── country-match.js     # Blocklist/allowlist matching helpers
├── background.js        # Per-tab hidden count relay
├── content.js           # Tweet filtering logic
├── content.css
├── popup/               # Quick settings
├── options/             # Advanced settings
└── icons/
```

## Privacy

This extension does not collect, transmit, or store any personal data beyond your settings, whitelist, and locally cached About-account lookups.

## License

MIT — see [LICENSE](LICENSE).