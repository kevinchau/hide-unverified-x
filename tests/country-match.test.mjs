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
