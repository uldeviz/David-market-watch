// Elenco fonti RSS gratuite monitorate.
//
// IMPORTANTE: questi URL non sono stati verificati "live" in questa sessione
// (il fetch di verifica e' stato bloccato dall'ambiente). I siti istituzionali
// a volte cambiano il path del feed. Dopo il setup, esegui:
//   node scripts/ingest.mjs --check
// per testare tutte le fonti senza scrivere nulla nel DB ne' inviare alert,
// e correggi qui gli URL che risultano rotti.
//
// tier:
//   FAST     -> newswire/breaking, priorita' alta nello scoring
//   STANDARD -> comunicati ufficiali/istituzionali, latenza media
//   SLOW     -> aggregatori, contesto/conferma, non per essere "primi"

export const SOURCES = [
  {
    id: "fed_monetary",
    name: "Federal Reserve — Monetary Policy",
    url: "https://www.federalreserve.gov/feeds/press_monetary.xml",
    tier: "STANDARD",
    category: "fed_monetary",
    defaultAssets: ["USD", "US_YIELDS", "GOLD", "EQUITIES"],
  },
  {
    id: "fed_all",
    name: "Federal Reserve — All Press Releases",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    tier: "STANDARD",
    category: "fed",
    defaultAssets: ["USD", "US_YIELDS", "GOLD"],
  },
  {
    id: "treasury",
    name: "US Treasury — Press Releases",
    url: "https://home.treasury.gov/rss/press-releases",
    tier: "STANDARD",
    category: "treasury",
    defaultAssets: ["USD", "US_YIELDS", "GOLD"],
  },
  {
    id: "bls",
    name: "US Bureau of Labor Statistics — Releases",
    url: "https://www.bls.gov/feed/bls_latest.rss",
    tier: "STANDARD",
    category: "macro_data",
    defaultAssets: ["USD", "US_YIELDS", "GOLD", "EQUITIES"],
  },
  {
    id: "ecb",
    name: "European Central Bank — Press",
    url: "https://www.ecb.europa.eu/rss/press.html",
    tier: "STANDARD",
    category: "ecb",
    defaultAssets: ["USD", "RATES_GLOBAL", "EQUITIES"],
  },
  {
    id: "forexlive",
    name: "ForexLive — Breaking News",
    url: "https://www.forexlive.com/feed/",
    tier: "FAST",
    category: "newswire",
    defaultAssets: ["USD", "GOLD", "US_YIELDS", "EQUITIES"],
  },
  {
    id: "fxstreet",
    name: "FXStreet — News",
    url: "https://www.fxstreet.com/rss/news",
    tier: "FAST",
    category: "newswire",
    defaultAssets: ["USD", "GOLD", "US_YIELDS"],
  },
  {
    id: "kitco",
    name: "Kitco News",
    url: "https://www.kitco.com/rss/KitcoNews.xml",
    tier: "STANDARD",
    category: "gold_specific",
    defaultAssets: ["GOLD"],
  },
  {
    id: "zerohedge",
    name: "ZeroHedge",
    url: "https://feeds.feedburner.com/zerohedge/feed",
    tier: "SLOW",
    category: "macro_general",
    defaultAssets: ["USD", "GOLD", "EQUITIES", "CRYPTO"],
  },
  {
    id: "investing_commodities",
    name: "Investing.com — Commodities",
    url: "https://www.investing.com/rss/commodities.rss",
    tier: "SLOW",
    category: "gold_specific",
    defaultAssets: ["GOLD", "OIL"],
  },
  {
    id: "trump_truth_social",
    // Specchio non ufficiale, gestito da terzi, dei post di Trump su Truth
    // Social (Trump non ha un RSS ufficiale). Puo' essere lento/instabile o
    // sparire: se "--check" lo segna rotto, e' sicuro rimuoverlo — le fonti
    // FAST (ForexLive/FXStreet) coprono comunque le dichiarazioni piu' market-moving
    // entro 1-2 minuti.
    name: "Trump — Truth Social (mirror non ufficiale)",
    url: "https://trumpstruth.org/rss",
    tier: "FAST",
    category: "trump_statement",
    defaultAssets: ["USD", "GOLD", "EQUITIES"],
  },
  {
    id: "whitehouse",
    name: "White House — Briefing Room",
    url: "https://www.whitehouse.gov/briefing-room/feed/",
    tier: "STANDARD",
    category: "whitehouse",
    defaultAssets: ["USD", "GOLD", "EQUITIES"],
  },
];
