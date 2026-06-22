(function () {
  "use strict";

  const ALIASES = {
    us: ["us", "usa", "u.s.", "u.s.a.", "united states", "united states of america"],
    uk: ["uk", "u.k.", "united kingdom", "great britain", "england", "scotland", "wales"],
    ca: ["canada"],
    au: ["australia"],
    nz: ["new zealand"],
    in: ["india"],
    jp: ["japan"],
    kr: ["korea", "south korea"],
    cn: ["china"],
    de: ["germany", "deutschland"],
    fr: ["france"],
    es: ["spain", "españa"],
    it: ["italy", "italia"],
    br: ["brazil", "brasil"],
    mx: ["mexico"],
    ru: ["russia"],
    ua: ["ukraine"],
    il: ["israel"],
    ae: ["uae", "united arab emirates", "dubai"],
    sa: ["saudi arabia"],
    pk: ["pakistan"],
    bd: ["bangladesh"],
    ng: ["nigeria"],
    ph: ["philippines"],
    id: ["indonesia"],
    vn: ["vietnam", "viet nam"],
    th: ["thailand"],
    tr: ["turkey", "türkiye"],
    pl: ["poland"],
    nl: ["netherlands", "holland"],
    se: ["sweden"],
    no: ["norway"],
    dk: ["denmark"],
    fi: ["finland"],
    ie: ["ireland"],
    sg: ["singapore"],
    my: ["malaysia"],
    za: ["south africa"],
    ar: ["argentina"],
    cl: ["chile"],
    co: ["colombia"],
    eg: ["egypt"],
    ir: ["iran"],
    iq: ["iraq"],
  };

  function normalizeTerms(list) {
    if (!Array.isArray(list)) {
      return [];
    }

    const expanded = new Set();

    for (const rawEntry of list) {
      const entry = String(rawEntry).trim().toLowerCase();
      if (!entry) {
        continue;
      }

      expanded.add(entry);

      const aliasGroup = ALIASES[entry];
      if (aliasGroup) {
        for (const alias of aliasGroup) {
          expanded.add(alias);
        }
      }
    }

    return [...expanded];
  }

  function getLocationText(entry) {
    if (!entry) {
      return "";
    }

    return (entry.basedIn || entry.location || "").trim();
  }

  function textMatchesTerms(text, terms) {
    const haystack = text.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  }

  function shouldHideByCountry(entry, terms, mode) {
    const locationText = getLocationText(entry);

    if (!locationText) {
      return null;
    }

    const matched = textMatchesTerms(locationText, terms);

    if (mode === "allowlist") {
      return !matched;
    }

    return matched;
  }

  globalThis.HUXCountry = {
    normalizeTerms,
    getLocationText,
    shouldHideByCountry,
  };
})();