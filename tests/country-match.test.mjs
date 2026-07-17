import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

before(() => {
  const code = readFileSync(join(__dirname, "..", "country-match.js"), "utf8");
  new Function(code)();
});

function HUX() {
  return globalThis.HUXCountry;
}

describe("normalizeTerms", () => {
  it("expands shortcuts to alias groups", () => {
    const terms = HUX().normalizeTerms(["ng"]);
    assert.ok(terms.includes("ng"));
    assert.ok(terms.includes("nigeria"));
    assert.ok(terms.includes("nigeria app store"));
  });

  it("expands southasia and africa regional shortcuts", () => {
    const south = HUX().normalizeTerms(["southasia"]);
    assert.ok(south.includes("india"));
    assert.ok(south.includes("pakistan"));

    const africa = HUX().normalizeTerms(["africa"]);
    assert.ok(africa.includes("nigeria"));
    assert.ok(africa.includes("niger"));
    assert.ok(africa.includes("ghana"));
  });

  it("lowercases and trims entries; ignores empty", () => {
    const terms = HUX().normalizeTerms(["  India  ", "", "  "]);
    assert.ok(terms.includes("india"));
    assert.equal(terms.includes(""), false);
  });

  it("returns empty array for non-array input", () => {
    assert.deepEqual(HUX().normalizeTerms(null), []);
    assert.deepEqual(HUX().normalizeTerms(undefined), []);
    assert.deepEqual(HUX().normalizeTerms("india"), []);
  });
});

describe("shouldHideByAccount — blocklist word boundaries", () => {
  it("hides Nigeria when blocklist includes nigeria", () => {
    const terms = HUX().normalizeTerms(["nigeria"]);
    const result = HUX().shouldHideByAccount(
      { status: "resolved", basedIn: "Nigeria" },
      terms,
      "blocklist",
      "basedIn"
    );
    assert.equal(result, true);
  });

  it("does not match niger inside Nigeria", () => {
    const result = HUX().shouldHideByAccount(
      { status: "resolved", basedIn: "Nigeria" },
      ["niger"],
      "blocklist",
      "basedIn"
    );
    assert.equal(result, false);
  });

  it("matches niger against Niger (whole word)", () => {
    const result = HUX().shouldHideByAccount(
      { status: "resolved", basedIn: "Niger" },
      ["niger"],
      "blocklist",
      "basedIn"
    );
    assert.equal(result, true);
  });

  it("matches india as a word inside India App Store", () => {
    const result = HUX().shouldHideByAccount(
      { status: "resolved", basedIn: "India App Store" },
      ["india"],
      "blocklist",
      "basedIn"
    );
    assert.equal(result, true);
  });

  it("matches multi-word phrase india app store", () => {
    const result = HUX().shouldHideByAccount(
      { status: "resolved", basedIn: "India App Store" },
      ["india app store"],
      "blocklist",
      "basedIn"
    );
    assert.equal(result, true);
  });

  it("is case-insensitive", () => {
    const result = HUX().shouldHideByAccount(
      { status: "resolved", basedIn: "NIGERIA" },
      ["nigeria"],
      "blocklist",
      "basedIn"
    );
    assert.equal(result, true);
  });
});

describe("shouldHideByAccount — empty / non-resolved → null", () => {
  it("returns null for empty about-account entry", () => {
    const terms = HUX().normalizeTerms(["nigeria"]);
    const result = HUX().shouldHideByAccount(
      { status: "resolved", empty: true, basedIn: "Nigeria" },
      terms,
      "blocklist",
      "basedIn"
    );
    assert.equal(result, null);
  });

  it("returns null when status is not resolved", () => {
    const terms = HUX().normalizeTerms(["nigeria"]);
    assert.equal(
      HUX().shouldHideByAccount(
        { status: "pending", basedIn: "Nigeria" },
        terms,
        "blocklist",
        "basedIn"
      ),
      null
    );
    assert.equal(
      HUX().shouldHideByAccount(
        { status: "error", basedIn: "Nigeria" },
        terms,
        "blocklist",
        "basedIn"
      ),
      null
    );
    assert.equal(
      HUX().shouldHideByAccount(null, terms, "blocklist", "basedIn"),
      null
    );
  });

  it("returns null when no searchable fields for selected fields mode", () => {
    const terms = HUX().normalizeTerms(["nigeria"]);
    assert.equal(
      HUX().shouldHideByAccount(
        { status: "resolved", basedIn: "Nigeria" },
        terms,
        "blocklist",
        "connectedVia"
      ),
      null
    );
  });
});

describe("shouldHideByAccount — allowlist mode", () => {
  it("hides when country is NOT in allowlist terms", () => {
    const terms = HUX().normalizeTerms(["india"]);
    const result = HUX().shouldHideByAccount(
      { status: "resolved", basedIn: "Nigeria" },
      terms,
      "allowlist",
      "basedIn"
    );
    assert.equal(result, true);
  });

  it("does not hide when country matches allowlist terms", () => {
    const terms = HUX().normalizeTerms(["nigeria"]);
    const result = HUX().shouldHideByAccount(
      { status: "resolved", basedIn: "Nigeria" },
      terms,
      "allowlist",
      "basedIn"
    );
    assert.equal(result, false);
  });

  it("searches both fields when fields is both", () => {
    const terms = ["ghana"];
    assert.equal(
      HUX().shouldHideByAccount(
        {
          status: "resolved",
          basedIn: "United States",
          connectedVia: "Ghana App Store",
        },
        terms,
        "blocklist",
        "both"
      ),
      true
    );
  });
});

describe("isoToFlagEmoji", () => {
  it("maps ISO codes to regional indicator flags", () => {
    assert.equal(HUX().isoToFlagEmoji("IN"), "🇮🇳");
    assert.equal(HUX().isoToFlagEmoji("ng"), "🇳🇬");
    assert.equal(HUX().isoToFlagEmoji("US"), "🇺🇸");
  });

  it("returns empty for invalid codes", () => {
    assert.equal(HUX().isoToFlagEmoji(""), "");
    assert.equal(HUX().isoToFlagEmoji("USA"), "");
    assert.equal(HUX().isoToFlagEmoji(null), "");
  });
});

describe("resolveLocationText", () => {
  it("maps country names to flag + title case text", () => {
    const result = HUX().resolveLocationText("Nigeria");
    assert.equal(result.flag, "🇳🇬");
    assert.equal(result.text, "Nigeria");
    assert.equal(result.iso, "NG");
  });

  it("strips App Store suffix", () => {
    const result = HUX().resolveLocationText("India App Store");
    assert.equal(result.flag, "🇮🇳");
    assert.equal(result.text, "India");
  });

  it("returns region text without a flag", () => {
    const result = HUX().resolveLocationText("South Asia");
    assert.equal(result.flag, "");
    assert.equal(result.text, "South Asia");
    assert.equal(result.iso, null);
  });

  it("does not match niger inside Nigeria", () => {
    const result = HUX().resolveLocationText("Nigeria");
    assert.equal(result.iso, "NG");
  });

  it("keeps unknown strings as plain text", () => {
    const result = HUX().resolveLocationText("Atlantis");
    assert.equal(result.flag, "");
    assert.equal(result.text, "Atlantis");
  });
});

describe("locationBadgeForAccount", () => {
  it("prefers basedIn over connectedVia", () => {
    const badge = HUX().locationBadgeForAccount({
      status: "resolved",
      basedIn: "United States",
      connectedVia: "India App Store",
    });
    assert.equal(badge.flag, "🇺🇸");
    assert.equal(badge.text, "United States");
    assert.equal(badge.display, "🇺🇸 United States");
    assert.match(badge.title, /Based in United States/);
  });

  it("falls back to connectedVia when basedIn is empty", () => {
    const badge = HUX().locationBadgeForAccount({
      status: "resolved",
      basedIn: "",
      connectedVia: "Ghana App Store",
    });
    assert.equal(badge.display, "🇬🇭 Ghana");
  });

  it("shows region name without flag when only region is known", () => {
    const badge = HUX().locationBadgeForAccount({
      status: "resolved",
      basedIn: "South Asia",
      connectedVia: "",
    });
    assert.equal(badge.flag, "");
    assert.equal(badge.display, "South Asia");
  });

  it("returns null for pending/empty/error entries", () => {
    assert.equal(
      HUX().locationBadgeForAccount({ status: "pending" }),
      null
    );
    assert.equal(
      HUX().locationBadgeForAccount({ status: "resolved", empty: true }),
      null
    );
    assert.equal(
      HUX().locationBadgeForAccount({ status: "error", basedIn: "India" }),
      null
    );
  });
});
