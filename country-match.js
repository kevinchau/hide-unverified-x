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

  function textMatchesTerms(text, terms) {
    const haystack = text.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  }

  function getSearchTexts(entry, fields) {
    const texts = [];

    if (fields === "basedIn" || fields === "both") {
      if (entry.basedIn) {
        texts.push(entry.basedIn);
      }
    }

    if (fields === "connectedVia" || fields === "both") {
      if (entry.connectedVia) {
        texts.push(entry.connectedVia);
      }
    }

    return texts;
  }

  function formatAccountLabel(entry) {
    if (!entry) {
      return "";
    }

    const parts = [];
    if (entry.basedIn) {
      parts.push(`Based in ${entry.basedIn}`);
    }
    if (entry.connectedVia) {
      parts.push(`Connected via ${entry.connectedVia}`);
    }

    return parts.join(" · ");
  }

  function shouldHideByAccount(entry, terms, mode, fields) {
    if (!entry || entry.status !== "resolved") {
      return null;
    }

    if (entry.empty) {
      return null;
    }

    const texts = getSearchTexts(entry, fields);
    if (!texts.length) {
      return null;
    }

    const matched = texts.some((text) => textMatchesTerms(text, terms));

    if (mode === "allowlist") {
      return !matched;
    }

    return matched;
  }

  globalThis.HUXCountry = {
    normalizeTerms,
    formatAccountLabel,
    shouldHideByAccount,
  };
})();