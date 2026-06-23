# Hide Unverified X — Safari (macOS)

Third-party Safari Web Extension, hosted in this repo. Not distributed through the Mac App Store — you build and run it locally with Xcode.

## Requirements

- macOS with **Safari 18+** (macOS Sequoia or later recommended)
- **Xcode 16+** (free from the Mac App Store)
- An Apple ID (free) for local development signing in Xcode

## Install

1. Clone this repo (or download the source zip).
2. Open **`safari/Hide Unverified X/Hide Unverified X.xcodeproj`** in Xcode.
3. Select the **Hide Unverified X** scheme and your Mac as the run destination.
4. Press **Run** (⌘R). Xcode builds the host app and installs the Safari extension on your Mac.
5. Open **Safari → Settings → Extensions** and enable **Hide Unverified X**.
6. Allow the extension on **x.com** when prompted.

The host app can be quit after enabling the extension — Safari keeps the extension installed.

## Updates

Pull the latest repo changes, then **Run** again in Xcode (or **Product → Clean Build Folder** if something looks stale). Re-enable the extension in Safari if macOS asks you to.

Extension web resources live in `Hide Unverified X Extension/Resources/`. Maintainers refresh them with:

```bash
npm run prepare:safari
```

from the repo root before committing a release.

## Command-line build (optional)

```bash
npm run build:safari
```

Outputs an unsigned `.app` under `dist/safari-derived/`. For Safari to load the extension, you still need to open the project in Xcode and **Run** once so Xcode signs it with your development team.

## Regenerating the Xcode project

Only needed if the Xcode wrapper structure changes (rare):

```bash
npm run scaffold:safari
npm run prepare:safari
```

Then re-apply bundle ID fixes if the converter resets them (`com.kevinchau.hide-unverified-x` + `.extension`).

## Notes

- **About-account lookups** rely on a page-context network hook (`world: "MAIN"`). Safari support for this is newer than Chrome/Firefox — if feeds do not filter by region, file an issue.
- **Advanced settings** open in an extension popup panel on Safari (not a full tab).
- Distribution outside your Mac requires **Developer ID** signing and notarization — not covered here.