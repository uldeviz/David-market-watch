import crypto from "node:crypto";

// Punteggio base per categoria fonte (0-100). Calibrare nel tempo confrontando
// impact_score/expected_direction con il verdetto reale in "confirmation"
// (vedi price_before/price_plus_5m in news_events).
const CATEGORY_BASE_SCORE = {
  fed_monetary: 80,
  treasury: 50,
  fed: 40,
  macro_data: 50,
  ecb: 35,
  newswire: 25,
  gold_specific: 20,
  macro_general: 15,
  // Trump: storicamente market-moving anche fuori calendario (tariffe,
  // attacchi alla Fed, escalation geopolitiche annunciate via social).
  trump_statement: 45,
  whitehouse: 35,
};

// Parole chiave che alzano il punteggio se compaiono in titolo/summary.
// weight = punti aggiunti (cap finale a 100).
const KEYWORD_WEIGHTS = [
  [/\bemergency\b/i, 25],
  [/\bsurpris(e|ing)\b/i, 25],
  [/\bunscheduled\b/i, 20],
  [/\bintervention\b/i, 25],
  [/\bbuyback/i, 15],
  [/\brate cut\b/i, 20],
  [/\brate hike\b/i, 20],
  [/\bshutdown\b/i, 15],
  [/\bdefault\b/i, 30],
  [/\bdowngrad(e|ed)\b/i, 20],
  [/\bsanctions?\b/i, 15],
  [/\bwar\b/i, 20],
  [/\binvasion\b/i, 25],
  [/\brecord (high|low)\b/i, 10],
  [/\bunexpected(ly)?\b/i, 15],
  [/\bcpi\b/i, 15],
  [/\b(nfp|non-farm|nonfarm)\b/i, 15],
  [/\bfomc\b/i, 20],
  [/\bpowell\b/i, 10],
  [/\bbessent\b/i, 10],
  [/\byellen\b/i, 10],
  [/\bgeopolitic/i, 10],
  [/\btariffs?\b/i, 12],
  [/\bballistic|missile|strike\b/i, 20],
  [/\btrump\b/i, 8],
  [/\btrump (says|said|announces|threatens|signs|orders|warns)\b/i, 15],
  [/\btruth social\b/i, 5],
  [/\bfires? (the )?(fed )?chair|threatens? to fire\b/i, 20],
];

const ASSET_KEYWORDS = {
  GOLD: /\bgold|xau|bullion|precious metal/i,
  USD: /\bdollar|dxy|greenback|\bfed\b|treasury|\byield/i,
  US_YIELDS: /\byield|treasury (note|bond)|10-year|30-year|auction|buyback/i,
  EQUITIES: /\bs&p|nasdaq|dow jones|equities|stocks?\b/i,
  OIL: /\boil|crude|opec|wti|brent/i,
  CRYPTO: /\bbitcoin|crypto|ethereum|btc\b/i,
  RATES_GLOBAL: /\becb|boe|boj|bank of (england|japan)|rate decision/i,
};

export function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function contentHash(source, title) {
  const norm = normalizeTitle(title);
  return crypto.createHash("sha256").update(`${source}::${norm}`).digest("hex");
}

export function detectAssets(text, defaultAssets) {
  const found = [];
  for (const [asset, re] of Object.entries(ASSET_KEYWORDS)) {
    if (re.test(text)) found.push(asset);
  }
  return found.length > 0 ? Array.from(new Set(found)) : defaultAssets;
}

export function scoreImpact({ category, title, summary }) {
  const text = `${title} ${summary ?? ""}`;
  let score = CATEGORY_BASE_SCORE[category] ?? 15;
  for (const [re, weight] of KEYWORD_WEIGHTS) {
    if (re.test(text)) score += weight;
  }
  score = Math.max(0, Math.min(100, score));

  let level = "LOW";
  if (score >= 80) level = "CRITICAL";
  else if (score >= 60) level = "HIGH";
  else if (score >= 30) level = "MEDIUM";

  return { score, level };
}
