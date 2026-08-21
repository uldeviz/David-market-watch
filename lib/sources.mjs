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
  // NOTA su Trump: non esiste un RSS ufficiale e gratuito dei suoi post
  // (ne' Truth Social ne' il sito della Casa Bianca ne offrono uno stabile
  // — entrambi i mirror provati davano 404). Le dichiarazioni davvero
  // market-moving vengono comunque riprese quasi sempre entro 1-2 minuti
  // dalle fonti FAST qui sopra (ForexLive, FXStreet), che restano quindi
  // la copertura reale per questo caso.
];
