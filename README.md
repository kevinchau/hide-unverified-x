# Hide Unverified X

<p align="center">
  <img src="icons/icon128.png" alt="Hide Unverified X" width="96" height="96" />
</p>

<p align="center">
  <strong>Filter spam on X by verification badge and account origin — locally, with no API keys.</strong>
</p>

<p align="center">
  <a href="https://github.com/kevinchau/hide-unverified-x/releases/latest"><img src="https://img.shields.io/badge/version-1.7.13-1d9bf0.svg" alt="Version 1.7.13" /></a>
  <img src="https://img.shields.io/badge/Chrome-supported-4285F4?logo=googlechrome&logoColor=white" alt="Chrome" />
  <img src="https://img.shields.io/badge/Firefox-supported-FF7139?logo=firefoxbrowser&logoColor=white" alt="Firefox" />
  <img src="https://img.shields.io/badge/Safari-supported-006CFF?logo=safari&logoColor=white" alt="Safari" />
</p>

<p align="center">
  <a href="https://github.com/kevinchau/hide-unverified-x/releases/latest">
    <img src="https://img.shields.io/badge/Install%20for%20Firefox-signed%20.xpi-FF7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white" alt="Install signed Firefox add-on (latest)" />
  </a>
  &nbsp;
  <a href="#chrome">
    <img src="https://img.shields.io/badge/Install%20for%20Chrome-from%20repo-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Install for Chrome from repo" />
  </a>
  &nbsp;
  <a href="#safari">
    <img src="https://img.shields.io/badge/Install%20for%20Safari-from%20repo-006CFF?style=for-the-badge&logo=safari&logoColor=white" alt="Install for Safari from repo" />
  </a>
</p>

<p align="center">
  <sub><strong>Firefox:</strong> signed <code>.xpi</code> · auto-updates · <strong>Chrome:</strong> <a href="https://github.com/kevinchau/hide-unverified-x/tree/main/chrome"><code>chrome/</code></a> folder · <strong>Safari:</strong> <a href="https://github.com/kevinchau/hide-unverified-x/tree/main/safari"><code>safari/</code></a> Xcode project</sub>
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

Click **Install for Firefox** above, or [download the signed add-on from the latest release](https://github.com/kevinchau/hide-unverified-x/releases/latest) (`hide-unverified-x-1.7.13.xpi`).

1. Open the link in **Firefox**.
2. Confirm the install prompt if one appears.
3. If Firefox only downloads the file: open **Add-ons and themes** → gear icon → **Install Add-on From File…** → select `hide-unverified-x-1.7.13.xpi`.

### Chrome

The repo includes a ready-to-load [`chrome/`](chrome/) folder — no Node.js, npm, or build step.

**1. Get the repo**

```bash
git clone https://github.com/kevinchau/hide-unverified-x.git
```

Or download the [source zip](https://github.com/kevinchau/hide-unverified-x/archive/refs/heads/main.zip) and unzip it.

**2. Load in Chrome**

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the **`chrome`** folder:
   - After clone: `hide-unverified-x/chrome`
   - After zip: `hide-unverified-x-main/chrome`

Chrome keeps the extension until you remove it. **Developer mode** must stay on.

**To update:** `git pull` (or re-download the zip) to get the latest `chrome/` folder, then click **Reload** on the extension card in `chrome://extensions`.

> A Chrome Web Store listing is planned for a one-click install later.

### Safari

macOS only. Third-party Safari extension hosted in [`safari/`](safari/). Requires **Xcode** (free) — not distributed through the Mac App Store.

1. Clone or [download](https://github.com/kevinchau/hide-unverified-x/archive/refs/heads/main.zip) this repo.
2. Open **`safari/Hide Unverified X/Hide Unverified X.xcodeproj`** in Xcode.
3. Press **Run** (⌘R) to build and install on your Mac.
4. Enable the extension in **Safari → Settings → Extensions**.

Full steps and troubleshooting: **[safari/README.md](safari/README.md)**

**To update:** `git pull`, then **Run** again in Xcode.

> Safari requires a signed host app — Xcode handles this with your free Apple ID. Advanced settings open in a panel (not a full tab).

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
| **Location badge** | Flag + country/region left of the Grok button (from About this account data) |
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
| **Show location badge** | Flag + country (or region) left of the Grok button |
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

When **Show location badge** is on (default), posts show a compact **flag + country** label (or the region name alone when X only reports a region) to the left of the Grok button in the tweet header.

**Suggested spam blocklist** (one click in Advanced settings):

- **South Asia** — region plus Afghanistan, Bangladesh, Bhutan, India, Maldives, Nepal, Pakistan, Sri Lanka, and matching App Store strings
- **Africa** — 54 countries plus regional labels and common App Store strings

You can also type shortcuts `southasia` or `africa` in the blocklist field.

---

## Privacy

This extension does not collect, transmit, or sell your data. There is **no third-party analytics**.

**Stored on your device:**

- Settings and whitelist
- About-account lookups (`storage.local`)
- Following handles — accounts you follow (`storage.local`)
- Followed-by-following handles — social-proof whitelist (`storage.local`)

**Settings sync:** Settings and whitelist use `storage.sync`, so the browser may sync them across your signed-in profile. That sync is browser-managed; data is not sent to the extension author.

**About-account filter:** When enabled, may call X GraphQL with your existing logged-in X session to look up account origin (`Account based in` / `Connected via`). Results stay in the local cache. No API keys are required.

**Firefox updates:** The signed Firefox add-on checks for new versions via GitHub (`updates.json` / Releases). Chrome and Safari installs from this repo do not phone home.

All filtering runs in your browser.

---

## Updates

**Firefox:** New versions install automatically once released. You can also check [releases](https://github.com/kevinchau/hide-unverified-x/releases) manually.

**Chrome:** `git pull` (or re-download the repo) to refresh the `chrome/` folder, then **Reload** the extension in `chrome://extensions`.

**Safari:** `git pull`, then **Run** again in Xcode. See [safari/README.md](safari/README.md).

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

---

## License

MIT — see [LICENSE](LICENSE).