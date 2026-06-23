# Hide Unverified X

<p align="center">
  <img src="icons/icon128.png" alt="Hide Unverified X" width="96" height="96" />
</p>

<p align="center">
  <strong>Filter spam on X by verification badge and account origin — locally, with no API keys.</strong>
</p>

<p align="center">
  <a href="https://github.com/kevinchau/hide-unverified-x/releases/tag/v1.7.3"><img src="https://img.shields.io/badge/version-1.7.3-1d9bf0.svg" alt="Version 1.7.3" /></a>
  <img src="https://img.shields.io/badge/Chrome-supported-4285F4?logo=googlechrome&logoColor=white" alt="Chrome" />
  <img src="https://img.shields.io/badge/Firefox-supported-FF7139?logo=firefoxbrowser&logoColor=white" alt="Firefox" />
</p>

<p align="center">
  <a href="https://github.com/kevinchau/hide-unverified-x/releases/download/v1.7.3/hide-unverified-x-1.7.3.xpi">
    <img src="https://img.shields.io/badge/Install%20for%20Firefox-signed%20.xpi-FF7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white" alt="Install signed Firefox add-on (v1.7.3)" />
  </a>
</p>

<p align="center">
  <sub>Mozilla-signed · stays installed across restarts · <a href="https://github.com/kevinchau/hide-unverified-x/releases">updates</a> install automatically</sub>
</p>

Hide or dim posts on [X](https://x.com) that lack the verification badges you care about, or that match regions you want to block. Everything runs in your browser — no API keys, no accounts to create, no tracking.

---

## Contents

- [Install](#install)
- [Getting started](#getting-started)
- [Features](#features)
- [Settings](#settings)
- [About-account filter](#about-account-filter)
- [Privacy](#privacy)
- [Updates](#updates)
- [License](#license)

---

## Install

### Firefox

Click **Install for Firefox** above, or [download the signed add-on](https://github.com/kevinchau/hide-unverified-x/releases/download/v1.7.3/hide-unverified-x-1.7.3.xpi).

1. Open the link in **Firefox**.
2. Confirm the install prompt if one appears.
3. If Firefox only downloads the file: open **Add-ons and themes** → gear icon → **Install Add-on From File…** → select `hide-unverified-x-1.7.3.xpi`.

### Chrome

Install from this repo using Chrome’s **Load unpacked** (Developer mode). You need [Node.js](https://nodejs.org/) installed once to prepare the extension folder.

**1. Get the repo**

```bash
git clone https://github.com/kevinchau/hide-unverified-x.git
cd hide-unverified-x
```

Or download the [source zip](https://github.com/kevinchau/hide-unverified-x/archive/refs/heads/main.zip), unzip it, and open a terminal in that folder.

**2. Prepare the Chrome folder**

```bash
npm run sideload
```

This creates `dist/sideload/chrome` — the folder Chrome needs. Re-run this command after pulling updates.

**3. Load in Chrome**

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the **`dist/sideload/chrome`** folder inside the repo (not the repo root, not a `.zip`)

Chrome keeps the extension until you remove it. **Developer mode** must stay on.

**To update:** run `git pull`, then `npm run sideload`, then click **Reload** on the extension card in `chrome://extensions`.

> Chrome cannot install a `.zip` directly — only an unpacked folder. A Chrome Web Store listing is planned for a one-click install later.

---

## Getting started

After installing, open X and click the extension icon:

1. Leave **Blue check** and **Gold check** on (default) — these are the most common verified accounts.
2. Turn on **Silver check** if you want government officials to stay visible.
3. Enable **About-account filter** on **For you** and **Replies** if you want to block posts by region.
4. Open **Advanced settings** and click **Use suggested spam blocklist** for South Asia and Africa presets.

The popup shows how many posts are filtered on the current tab.

---

## Features

| | |
| --- | --- |
| **Verification badges** | Hide or dim posts without blue, gold, or silver checks — each toggleable |
| **Per-feed control** | Separate settings for **For you**, **Following**, and **Replies** |
| **About-account filter** | Block or allow posts by account region or App Store (e.g. `India App Store`) |
| **Whitelist** | Always show specific handles, accounts you follow, or people followed by people you follow |
| **Softer hiding** | Optional placeholder cards with **Show once** and **Always show** |
| **Hide or dim** | Remove posts entirely, or fade them out so you can still scroll past |

---

## Settings

Click the extension icon on X for quick toggles:

| Setting | What it does |
| --- | --- |
| **For you / Following / Replies** | Turn filtering on or off per feed |
| **About-account filter** | Filter For you and Replies using account origin data |
| **Blue / Gold / Silver check** | Choose which badge types count as verified |
| **Hide / Dim** | Remove posts or fade them |
| **Placeholder cards** | Show a slim bar to reveal hidden posts |
| **Accounts you follow** | Skip filtering for everyone you follow |

Right-click the extension icon → **Options** (or **Advanced settings** in the popup) for more:

| Setting | What it does |
| --- | --- |
| **Retweets** | Filter by original author or the person who retweeted |
| **Quote tweets** | Filter by quoter or quoted author |
| **Blocklist / Allowlist** | Terms matched against account region and App Store |
| **Whitelist handles** | One handle per line, always shown |
| **Followed by your follows** | Show accounts in the “Followed by … you follow” list on profiles |

### Verification badges

| Badge | Default | Meaning |
| --- | --- | --- |
| **Blue** | On | Individual verified accounts |
| **Gold** | On | Verified organizations |
| **Silver** | Off | Government officials |

Posts from accounts without any **enabled** badge are filtered.

### Placeholder actions

When placeholder cards are on:

- **Show once** — reveal the post until you reload the tab
- **Always show** — add the author to your whitelist permanently

---

## About-account filter

Uses the same information as X’s **About this account** page (`Account based in`, `Connected via`).

| Field | Example |
| --- | --- |
| **Account based in** | `India`, `South Asia`, `Nigeria`, `Africa` |
| **Connected via** | `India App Store`, `Nigeria App Store` |

The extension learns account origins as you browse — from About pages you visit and from feed lookups using your existing X session. Results are cached on your device. Accounts with unknown or still-loading data are shown by default.

**Suggested spam blocklist** (one click in Advanced settings):

- **South Asia** — region plus Afghanistan, Bangladesh, Bhutan, India, Maldives, Nepal, Pakistan, Sri Lanka, and matching App Store strings
- **Africa** — 54 countries plus regional labels and common App Store strings

You can also type shortcuts `southasia` or `africa` in the blocklist field.

---

## Privacy

This extension does not collect, transmit, or sell your data. It stores only:

- Your settings and whitelist
- Locally cached About-account lookups

All filtering happens in your browser.

---

## Updates

**Firefox:** New versions install automatically once released. You can also check [releases](https://github.com/kevinchau/hide-unverified-x/releases) manually.

**Chrome:** `git pull`, `npm run sideload`, then **Reload** the extension in `chrome://extensions`. A Web Store listing is planned for automatic updates.

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

---

## License

MIT — see [LICENSE](LICENSE).