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

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function textMatchesTerms(text, terms) {
    if (!text) return false;
    const haystack = String(text);
    return terms.some((term) => {
      if (!term) return false;
      const pattern = new RegExp(
        `(^|[^\\p{L}\\p{N}])${escapeRegExp(term)}(?=$|[^\\p{L}\\p{N}])`,
        "iu"
      );
      return pattern.test(haystack);
    });
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

  // Longer keys first so "democratic republic of the congo" beats "congo".
  const LOCATION_NAME_TO_ISO = (() => {
    const entries = [
      // Regions (no ISO flag)
      ["south asia", null],
      ["sub-saharan africa", null],
      ["north africa", null],
      ["africa", null],
      ["europe", null],
      ["middle east", null],
      ["southeast asia", null],
      ["east asia", null],
      ["central asia", null],
      ["latin america", null],
      ["north america", null],
      ["caribbean", null],
      ["oceania", null],

      // Common countries + X about-account spellings
      ["united states of america", "US"],
      ["united states", "US"],
      ["usa", "US"],
      ["u.s.a.", "US"],
      ["u.s.", "US"],
      ["america", "US"],
      ["united kingdom", "GB"],
      ["great britain", "GB"],
      ["england", "GB"],
      ["scotland", "GB"],
      ["wales", "GB"],
      ["northern ireland", "GB"],
      ["uk", "GB"],
      ["u.k.", "GB"],
      ["democratic republic of the congo", "CD"],
      ["republic of the congo", "CG"],
      ["cote d'ivoire", "CI"],
      ["côte d'ivoire", "CI"],
      ["ivory coast", "CI"],
      ["são tomé and príncipe", "ST"],
      ["sao tome and principe", "ST"],
      ["cabo verde", "CV"],
      ["cape verde", "CV"],
      ["guinea-bissau", "GW"],
      ["guinea bissau", "GW"],
      ["central african republic", "CF"],
      ["south africa", "ZA"],
      ["south sudan", "SS"],
      ["sri lanka", "LK"],
      ["hong kong", "HK"],
      ["macau", "MO"],
      ["macao", "MO"],
      ["taiwan", "TW"],
      ["palestine", "PS"],
      ["uae", "AE"],
      ["u.a.e.", "AE"],
      ["united arab emirates", "AE"],
      ["saudi arabia", "SA"],
      ["south korea", "KR"],
      ["north korea", "KP"],
      ["korea", "KR"],
      ["new zealand", "NZ"],
      ["czech republic", "CZ"],
      ["czechia", "CZ"],
      ["bosnia and herzegovina", "BA"],
      ["trinidad and tobago", "TT"],
      ["antigua and barbuda", "AG"],
      ["saint kitts and nevis", "KN"],
      ["saint vincent and the grenadines", "VC"],
      ["dominican republic", "DO"],
      ["el salvador", "SV"],
      ["costa rica", "CR"],
      ["puerto rico", "PR"],
      ["papua new guinea", "PG"],
      ["solomon islands", "SB"],
      ["marshall islands", "MH"],
      ["burkina faso", "BF"],
      ["equatorial guinea", "GQ"],
      ["eswatini", "SZ"],
      ["swaziland", "SZ"],

      ["india", "IN"],
      ["pakistan", "PK"],
      ["bangladesh", "BD"],
      ["nepal", "NP"],
      ["bhutan", "BT"],
      ["maldives", "MV"],
      ["afghanistan", "AF"],
      ["nigeria", "NG"],
      ["niger", "NE"],
      ["ghana", "GH"],
      ["kenya", "KE"],
      ["ethiopia", "ET"],
      ["egypt", "EG"],
      ["morocco", "MA"],
      ["algeria", "DZ"],
      ["tunisia", "TN"],
      ["senegal", "SN"],
      ["cameroon", "CM"],
      ["uganda", "UG"],
      ["tanzania", "TZ"],
      ["zimbabwe", "ZW"],
      ["mozambique", "MZ"],
      ["angola", "AO"],
      ["rwanda", "RW"],
      ["sudan", "SD"],
      ["somalia", "SO"],
      ["mali", "ML"],
      ["chad", "TD"],
      ["madagascar", "MG"],
      ["botswana", "BW"],
      ["namibia", "NA"],
      ["zambia", "ZM"],
      ["malawi", "MW"],
      ["liberia", "LR"],
      ["sierra leone", "SL"],
      ["togo", "TG"],
      ["benin", "BJ"],
      ["gabon", "GA"],
      ["guinea", "GN"],
      ["gambia", "GM"],
      ["mauritania", "MR"],
      ["eritrea", "ER"],
      ["djibouti", "DJ"],
      ["burundi", "BI"],
      ["comoros", "KM"],
      ["lesotho", "LS"],
      ["libya", "LY"],
      ["mauritius", "MU"],
      ["seychelles", "SC"],
      ["congo", "CG"],

      ["canada", "CA"],
      ["mexico", "MX"],
      ["brazil", "BR"],
      ["argentina", "AR"],
      ["chile", "CL"],
      ["colombia", "CO"],
      ["peru", "PE"],
      ["venezuela", "VE"],
      ["ecuador", "EC"],
      ["bolivia", "BO"],
      ["paraguay", "PY"],
      ["uruguay", "UY"],
      ["panama", "PA"],
      ["guatemala", "GT"],
      ["honduras", "HN"],
      ["nicaragua", "NI"],
      ["cuba", "CU"],
      ["jamaica", "JM"],
      ["haiti", "HT"],

      ["germany", "DE"],
      ["france", "FR"],
      ["spain", "ES"],
      ["italy", "IT"],
      ["portugal", "PT"],
      ["netherlands", "NL"],
      ["belgium", "BE"],
      ["switzerland", "CH"],
      ["austria", "AT"],
      ["sweden", "SE"],
      ["norway", "NO"],
      ["denmark", "DK"],
      ["finland", "FI"],
      ["ireland", "IE"],
      ["poland", "PL"],
      ["romania", "RO"],
      ["hungary", "HU"],
      ["greece", "GR"],
      ["turkey", "TR"],
      ["türkiye", "TR"],
      ["turkiye", "TR"],
      ["ukraine", "UA"],
      ["russia", "RU"],
      ["russian federation", "RU"],

      ["china", "CN"],
      ["japan", "JP"],
      ["indonesia", "ID"],
      ["philippines", "PH"],
      ["vietnam", "VN"],
      ["thailand", "TH"],
      ["malaysia", "MY"],
      ["singapore", "SG"],
      ["myanmar", "MM"],
      ["cambodia", "KH"],
      ["laos", "LA"],
      ["mongolia", "MN"],

      ["australia", "AU"],
      ["israel", "IL"],
      ["iran", "IR"],
      ["iraq", "IQ"],
      ["jordan", "JO"],
      ["lebanon", "LB"],
      ["syria", "SY"],
      ["yemen", "YE"],
      ["oman", "OM"],
      ["qatar", "QA"],
      ["kuwait", "KW"],
      ["bahrain", "BH"],

      ["iceland", "IS"],
      ["luxembourg", "LU"],
      ["malta", "MT"],
      ["cyprus", "CY"],
      ["croatia", "HR"],
      ["serbia", "RS"],
      ["slovenia", "SI"],
      ["slovakia", "SK"],
      ["bulgaria", "BG"],
      ["albania", "AL"],
      ["north macedonia", "MK"],
      ["macedonia", "MK"],
      ["montenegro", "ME"],
      ["kosovo", "XK"],
      ["georgia", "GE"],
      ["armenia", "AM"],
      ["azerbaijan", "AZ"],
      ["kazakhstan", "KZ"],
      ["uzbekistan", "UZ"],
      ["turkmenistan", "TM"],
      ["kyrgyzstan", "KG"],
      ["tajikistan", "TJ"],
    ];

    entries.sort((a, b) => b[0].length - a[0].length);
    return entries;
  })();

  function isoToFlagEmoji(iso) {
    if (!iso || typeof iso !== "string" || iso.length !== 2) {
      return "";
    }

    const upper = iso.toUpperCase();
    if (!/^[A-Z]{2}$/.test(upper)) {
      return "";
    }

    const base = 0x1f1e6;
    return String.fromCodePoint(
      base + upper.charCodeAt(0) - 65,
      base + upper.charCodeAt(1) - 65
    );
  }

  function titleCaseLocation(name) {
    return String(name)
      .split(/\s+/)
      .map((word) => {
        if (!word) {
          return word;
        }
        if (word.includes("'")) {
          return word
            .split("'")
            .map((part) =>
              part
                ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
                : part
            )
            .join("'");
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  }

  /**
   * Parse a free-text about field into a displayable location.
   * Returns { flag, text, iso } or null.
   */
  function resolveLocationText(raw) {
    if (!raw || typeof raw !== "string") {
      return null;
    }

    const cleaned = raw
      .replace(/\s+app\s+store\s*$/i, "")
      .replace(/\s+play\s+store\s*$/i, "")
      .replace(/\s+google\s+play\s*$/i, "")
      .trim();

    if (!cleaned) {
      return null;
    }

    const lower = cleaned.toLowerCase();

    for (const [name, iso] of LOCATION_NAME_TO_ISO) {
      const pattern = new RegExp(
        `(^|[^\\p{L}\\p{N}])${escapeRegExp(name)}(?=$|[^\\p{L}\\p{N}])`,
        "iu"
      );
      if (pattern.test(lower)) {
        const flag = iso ? isoToFlagEmoji(iso) : "";
        const text = titleCaseLocation(name);
        return { flag, text, iso: iso || null };
      }
    }

    // Unknown string — still show the raw region/country name without a flag.
    return { flag: "", text: cleaned, iso: null };
  }

  /**
   * Compact location badge for a resolved about-account entry.
   * Prefers basedIn; falls back to connectedVia.
   * @returns {{ flag: string, text: string, title: string, display: string } | null}
   */
  function locationBadgeForAccount(entry) {
    if (!entry || entry.status !== "resolved" || entry.empty) {
      return null;
    }

    const candidates = [];
    if (entry.basedIn) {
      candidates.push(entry.basedIn);
    }
    if (entry.connectedVia) {
      candidates.push(entry.connectedVia);
    }

    for (const candidate of candidates) {
      const resolved = resolveLocationText(candidate);
      if (!resolved) {
        continue;
      }

      const title = formatAccountLabel(entry);
      const display = resolved.flag
        ? `${resolved.flag} ${resolved.text}`
        : resolved.text;

      return {
        flag: resolved.flag,
        text: resolved.text,
        title: title || display,
        display,
      };
    }

    return null;
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
    locationBadgeForAccount,
    resolveLocationText,
    isoToFlagEmoji,
    shouldHideByAccount,
    SUGGESTED_SPAM_BLOCKLIST,
    SOUTH_ASIA_ALIASES,
    AFRICA_ALIASES,
  };
})();

