(function () {
  "use strict";

  const SOUTH_ASIA_ALIASES = [
    "south asia",
    "india",
    "pakistan",
    "bangladesh",
    "sri lanka",
    "nepal",
    "bhutan",
    "maldives",
    "afghanistan",
    "india app store",
    "pakistan app store",
    "bangladesh app store",
    "sri lanka app store",
    "nepal app store",
  ];

  const AFRICA_ALIASES = [
    "africa",
    "sub-saharan africa",
    "nigeria",
    "ghana",
    "kenya",
    "ethiopia",
    "south africa",
    "egypt",
    "morocco",
    "algeria",
    "tunisia",
    "senegal",
    "cameroon",
    "uganda",
    "tanzania",
    "zimbabwe",
    "mozambique",
    "angola",
    "congo",
    "democratic republic of the congo",
    "ivory coast",
    "côte d'ivoire",
    "cote d'ivoire",
    "rwanda",
    "sudan",
    "south sudan",
    "somalia",
    "mali",
    "burkina faso",
    "niger",
    "chad",
    "madagascar",
    "botswana",
    "namibia",
    "zambia",
    "malawi",
    "liberia",
    "sierra leone",
    "togo",
    "benin",
    "gabon",
    "guinea",
    "gambia",
    "mauritania",
    "eritrea",
    "djibouti",
    "central african republic",
    "nigeria app store",
    "south africa app store",
    "kenya app store",
    "egypt app store",
    "ghana app store",
    "morocco app store",
    "ethiopia app store",
  ];

  const ALIASES = {
    southasia: SOUTH_ASIA_ALIASES,
    africa: AFRICA_ALIASES,
    in: ["india", "india app store"],
    pk: ["pakistan", "pakistan app store"],
    bd: ["bangladesh", "bangladesh app store"],
    lk: ["sri lanka", "sri lanka app store"],
    np: ["nepal", "nepal app store"],
    af: ["afghanistan"],
    ng: ["nigeria", "nigeria app store"],
    gh: ["ghana", "ghana app store"],
    ke: ["kenya", "kenya app store"],
    et: ["ethiopia", "ethiopia app store"],
    za: ["south africa", "south africa app store"],
    eg: ["egypt", "egypt app store"],
    ma: ["morocco", "morocco app store"],
    dz: ["algeria"],
    tn: ["tunisia"],
    sn: ["senegal"],
    cm: ["cameroon"],
    ug: ["uganda"],
    tz: ["tanzania"],
    zw: ["zimbabwe"],
    mz: ["mozambique"],
    ao: ["angola"],
    ci: ["ivory coast", "côte d'ivoire", "cote d'ivoire"],
    rw: ["rwanda"],
    sd: ["sudan"],
    ss: ["south sudan"],
    so: ["somalia"],
    ml: ["mali"],
    bf: ["burkina faso"],
    ne: ["niger"],
    td: ["chad"],
    mg: ["madagascar"],
    bw: ["botswana"],
    na: ["namibia"],
    zm: ["zambia"],
    mw: ["malawi"],
    lr: ["liberia"],
    sl: ["sierra leone"],
    tg: ["togo"],
    bj: ["benin"],
    ga: ["gabon"],
    gn: ["guinea"],
    gm: ["gambia"],
    mr: ["mauritania"],
    er: ["eritrea"],
    dj: ["djibouti"],
    cf: ["central african republic"],
    cd: ["democratic republic of the congo", "congo"],
  };

  const SUGGESTED_SPAM_BLOCKLIST = [
    "southasia",
    "africa",
  ];

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
    SUGGESTED_SPAM_BLOCKLIST,
    SOUTH_ASIA_ALIASES,
    AFRICA_ALIASES,
  };
})();