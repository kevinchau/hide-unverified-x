# Country / region badge left of Grok — Implementation Plan

## Goal
Show **flag + country name** (or region name when no country) on each tweet, **to the left of the Grok button** in the header row (fallback: left of the `···` caret).

## Implementation

### A — Resolve label + flag (`country-match.js`)
- [x] A1. Country/region name → ISO map + `isoToFlagEmoji`
- [x] A2. `locationBadgeForAccount(entry)` → `{ flag, text, title, display }` or null
- [x] A3. Unit tests

### B — Settings
- [x] B1. `showCountryFlags: true` in schema + normalize
- [x] B2. Popup toggle

### C — Inject (`content.js`, `content.css`)
- [x] C1. Lookup when badge enabled
- [x] C2. Find Grok/caret anchor; insert `.hux-location-badge`
- [x] C3. Idempotent update/remove; fingerprint includes badge
- [x] C4. CSS: compact, muted, right-aligned in header

### D — Docs + verify
- [x] D1. CHANGELOG
- [x] D2. README
- [x] D3. tests + prepare packages — **34/34 pass**

## Review section

### What shipped
- Badge text: `🇮🇳 India`, `🇳🇬 Nigeria`, or region-only `South Asia`
- Placement: immediately left of Grok button; caret fallback
- Popup: **Show location badge** (default on)
- Lookups enqueue when badge is on even if About filter list is empty
- Primary author only (not quote nested)

### Verification
- `npm test` → 34 pass
- `node --check` on core scripts
- `prepare:chrome` / `prepare:safari` / `prepare:firefox` staged

### Manual check on X
1. Reload extension, open For you / a reply thread
2. Wait for About lookups (~1.5s apart) — badges should appear left of Grok
3. Toggle **Show location badge** off — badges remove
4. Hover badge for full “Based in … · Connected via …” tooltip
