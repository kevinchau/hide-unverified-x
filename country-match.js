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
    "bhutan app store",
    "maldives app store",
    "afghanistan app store",
  ];

  const AFRICA_ALIASES = [
    "africa",
    "sub-saharan africa",
    "north africa",
    "algeria",
    "angola",
    "benin",
    "botswana",
    "burkina faso",
    "burundi",
    "cabo verde",
    "cape verde",
    "cameroon",
    "central african republic",
    "chad",
    "comoros",
    "congo",
    "republic of the congo",
    "democratic republic of the congo",
    "côte d'ivoire",
    "cote d'ivoire",
    "ivory coast",
    "djibouti",
    "egypt",
    "equatorial guinea",
    "eritrea",
    "eswatini",
    "swaziland",
    "ethiopia",
    "gabon",
    "gambia",
    "ghana",
    "guinea",
    "guinea-bissau",
    "kenya",
    "lesotho",
    "liberia",
    "libya",
    "madagascar",
    "malawi",
    "mali",
    "mauritania",
    "mauritius",
    "morocco",
    "mozambique",
    "namibia",
    "niger",
    "nigeria",
    "rwanda",
    "são tomé and príncipe",
    "sao tome and principe",
    "senegal",
    "seychelles",
    "sierra leone",
    "somalia",
    "south africa",
    "south sudan",
    "sudan",
    "tanzania",
    "togo",
    "tunisia",
    "uganda",
    "zambia",
    "zimbabwe",
    "nigeria app store",
    "ghana app store",
    "kenya app store",
    "ethiopia app store",
    "south africa app store",
    "egypt app store",
    "morocco app store",
    "algeria app store",
    "tunisia app store",
    "senegal app store",
    "cameroon app store",
    "uganda app store",
    "tanzania app store",
    "zimbabwe app store",
    "angola app store",
    "mozambique app store",
  ];

  const ALIASES = {
    southasia: SOUTH_ASIA_ALIASES,
    africa: AFRICA_ALIASES,
    in: ["india", "india app store"],
    pk: ["pakistan", "pakistan app store"],
    bd: ["bangladesh", "bangladesh app store"],
    lk: ["sri lanka", "sri lanka app store"],
    np: ["nepal", "nepal app store"],
    bt: ["bhutan", "bhutan app store"],
    mv: ["maldives", "maldives app store"],
    af: ["afghanistan", "afghanistan app store"],
    ng: ["nigeria", "nigeria app store"],
    gh: ["ghana", "ghana app store"],
    ke: ["kenya", "kenya app store"],
    et: ["ethiopia", "ethiopia app store"],
    za: ["south africa", "south africa app store"],
    eg: ["egypt", "egypt app store"],
    ma: ["morocco", "morocco app store"],
    dz: ["algeria", "algeria app store"],
    tn: ["tunisia", "tunisia app store"],
    sn: ["senegal", "senegal app store"],
    cm: ["cameroon", "cameroon app store"],
    ug: ["uganda", "uganda app store"],
    tz: ["tanzania", "tanzania app store"],
    zw: ["zimbabwe", "zimbabwe app store"],
    mz: ["mozambique", "mozambique app store"],
    ao: ["angola", "angola app store"],
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
    cd: ["democratic republic of the congo"],
    cg: ["republic of the congo", "congo"],
    bi: ["burundi"],
    cv: ["cabo verde", "cape verde"],
    km: ["comoros"],
    gq: ["equatorial guinea"],
    sz: ["eswatini", "swaziland"],
    ls: ["lesotho"],
    ly: ["libya"],
    mu: ["mauritius"],
    sc: ["seychelles"],
    st: ["são tomé and príncipe", "sao tome and principe"],
    gw: ["guinea-bissau"],
  };

  const SUGGESTED_SPAM_BLOCKLIST = [
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
    "bhutan app store",
    "maldives app store",
    "afghanistan app store",
    "africa",
    "sub-saharan africa",
    "north africa",
    "algeria",
    "angola",
    "benin",
    "botswana",
    "burkina faso",
    "burundi",
    "cabo verde",
    "cameroon",
    "central african republic",
    "chad",
    "comoros",
    "congo",
    "democratic republic of the congo",
    "côte d'ivoire",
    "djibouti",
    "egypt",
    "equatorial guinea",
    "eritrea",
    "eswatini",
    "ethiopia",
    "gabon",
    "gambia",
    "ghana",
    "guinea",
    "guinea-bissau",
    "kenya",
    "lesotho",
    "liberia",
    "libya",
    "madagascar",
    "malawi",
    "mali",
    "mauritania",
    "mauritius",
    "morocco",
    "mozambique",
    "namibia",
    "niger",
    "nigeria",
    "rwanda",
    "são tomé and príncipe",
    "senegal",
    "seychelles",
    "sierra leone",
    "somalia",
    "south africa",
    "south sudan",
    "sudan",
    "tanzania",
    "togo",
    "tunisia",
    "uganda",
    "zambia",
    "zimbabwe",
    "nigeria app store",
    "ghana app store",
    "kenya app store",
    "ethiopia app store",
    "south africa app store",
    "egypt app store",
    "morocco app store",
    "algeria app store",
    "tunisia app store",
    "senegal app store",
    "cameroon app store",
    "uganda app store",
    "tanzania app store",
    "zimbabwe app store",
    "angola app store",
    "mozambique app store",
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