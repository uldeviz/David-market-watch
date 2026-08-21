// Direzione attesa (bullish/bearish) sull'asset primario di una notizia.
//
// ATTENZIONE: e' un'euristica a regole, non un modello calibrato. Serve a
// generare l'aspettativa che poi il modulo prezzi verifica (o smentisce) col
// movimento reale — e' esattamente il meccanismo di calibrazione richiesto:
// se una regola sbaglia spesso, va corretta qui.
//
// Ogni regola matcha parole chiave nel testo e propone una direzione per
// alcuni asset (non tutti). Si applica solo la prima regola che ha
// un'indicazione per l'asset primario dell'evento; se nessuna regola si
// esprime su quell'asset, la direzione resta NEUTRAL (nessuna scommessa).

const DIRECTION_RULES = [
  [/rate cut|cuts? rates|dovish|easing/i, { GOLD: "UP", USD: "DOWN", US_YIELDS: "DOWN", EQUITIES: "UP" }],
  [/rate hike|hikes? rates|hawkish|tightening/i, { GOLD: "DOWN", USD: "UP", US_YIELDS: "UP", EQUITIES: "DOWN" }],
  [/buyback|quantitative easing|\bqe\b|debt monetization|liquidity injection/i, { GOLD: "UP", US_YIELDS: "DOWN", USD: "DOWN" }],
  [/downgrad(e|ed)|credit rating cut/i, { GOLD: "UP", USD: "DOWN", US_YIELDS: "UP" }],
  [/\bdefault\b/i, { GOLD: "UP", USD: "DOWN", EQUITIES: "DOWN" }],
  [/war\b|invasion|missile|air strikes?|conflict escalat/i, { GOLD: "UP", EQUITIES: "DOWN" }],
  [/sanctions?/i, { GOLD: "UP", EQUITIES: "DOWN" }],
  [/tariffs?/i, { GOLD: "UP", EQUITIES: "DOWN" }],
  [/shutdown/i, { GOLD: "UP", EQUITIES: "DOWN" }],
  [/beats? expectations|stronger than expected|surges?/i, { USD: "UP", GOLD: "DOWN", EQUITIES: "UP" }],
  [/misses? expectations|weaker than expected|plunges?|slumps?/i, { USD: "DOWN", GOLD: "UP", EQUITIES: "DOWN" }],
  [/fires? (the )?(fed )?chair|threatens? to fire/i, { GOLD: "UP", USD: "DOWN" }],
  [/record high\b/i, { GOLD: "UP" }],
  [/record low\b/i, { GOLD: "DOWN" }],

  // Linguaggio generico di prezzo sull'oro (rally/calo), controllato per
  // ultimo — dopo le regole con un catalizzatore specifico sopra. Senza
  // questo, notizie chiaramente rialziste/ribassiste ma senza una parola
  // chiave "da manuale" (es. "Gold hits three-month peak... rally extends")
  // restavano sempre NEUTRAL, anche se ovviamente non lo erano. Bug
  // segnalato su test reali.
  [/\b(rall(y|ies|ying)|surg(e|es|ing)|soar(s|ing)?|jump(s|ing)?|climb(s|ing)?|extends? gains?|bulls? test|hits? .*(record|fresh|new|multi-\w+ )?(high|peak))\b/i, { GOLD: "UP" }],
  [/\b(fall(s|ing)?|drop(s|ping)?|slid(e|es|ing)|tumbl(e|es|ing)|retreat(s|ing)?|sink(s|ing)?|slump(s|ing)?|bears? test|hits? .*(record|fresh|new|multi-\w+ )?low)\b/i, { GOLD: "DOWN" }],
];

// Ordine di priorita' per scegliere l'asset "primario" da tracciare —
// solo questi 4 hanno una serie di prezzo gratuita disponibile (lib/prices.mjs).
const TRACKABLE_ASSET_PRIORITY = ["GOLD", "USD", "US_YIELDS", "EQUITIES"];

export function primaryTrackableAsset(assets) {
  for (const a of TRACKABLE_ASSET_PRIORITY) {
    if (assets.includes(a)) return a;
  }
  return null;
}

export function expectedDirection(text, primaryAsset) {
  if (!primaryAsset) return "NEUTRAL";
  for (const [re, effects] of DIRECTION_RULES) {
    if (re.test(text) && effects[primaryAsset]) {
      return effects[primaryAsset];
    }
  }
  return "NEUTRAL";
}
