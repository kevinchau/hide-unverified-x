# Hide Unverified X

A lightweight browser extension for **Chrome** and **Firefox** that hides posts and replies from accounts without a blue check on [X](https://x.com).

No accounts. No tracking. Everything runs locally in your browser.

## Features

- Hides unverified posts and replies across your timeline, search, and threads
- Targets the **blue check** specifically — gold (business) and gray (government) badges are not treated as blue checks
- Works with infinite scroll via a `MutationObserver`
- Separate toggles for **For you**, **Following**, and **Replies**
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

Open the toolbar popup to control filtering per context:

| Toggle | Applies to |
| --- | --- |
| **For you** | Recommended posts on the home timeline |
| **Following** | Posts from accounts you follow on the home timeline |
| **Replies** | Reply posts anywhere on X (detected via "Replying to …") |

All three are enabled by default. Turn off a toggle to stop filtering in that context.

Profiles, search, and other pages are not filtered. If some posts don't update immediately after toggling, reload the X tab.

## How it works

1. A content script watches for new `article[data-testid="tweet"]` elements
2. It finds the tweet author via `[data-testid="User-Name"]`, ignoring quoted tweets
3. It checks for a blue verification badge (`[data-testid="icon-verified"]` with an outlined SVG path)
4. Unverified tweets are hidden by setting `display: none` on the feed cell or tweet article

## Project structure

```
hide-unverified-x/
├── manifest.json    # Extension manifest (MV3)
├── content.js       # Tweet filtering logic
├── content.css      # Hide styles
├── popup/           # Enable/disable popup UI
└── icons/           # Extension icons
```

## Privacy

This extension does not collect, transmit, or store any personal data. The only setting (enabled/disabled) is saved locally via `chrome.storage.sync`.

## License

MIT — see [LICENSE](LICENSE).