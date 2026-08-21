// Invio alert su Telegram (istantaneo) ed Email (Resend, backup/log).
// Entrambe le funzioni non lanciano eccezioni bloccanti: loggano e ritornano
// { ok, error } cosi' un canale che fallisce non impedisce l'altro.

const LEVEL_EMOJI = {
  CRITICAL: "🔴",
  HIGH: "🟠",
  MEDIUM: "🟡",
  LOW: "⚪",
};

// NEUTRAL ha una sua icona esplicita (non vuota): uno spazio vuoto nel
// messaggio sembrava un pezzo mancante/rotto invece di "nessuna direzione
// attesa chiara" (bug segnalato su un alert reale, notizia PBOC).
const DIRECTION_ARROW = { UP: "⬆️", DOWN: "⬇️", NEUTRAL: "↔️" };

// Regione citata nella notizia, usata per scegliere il ticker esatto
// (convenzione TradingView) invece di un'etichetta generica come "AZIONARIO"
// o "DOLLARO" — richiesto esplicitamente: l'alert deve dire DOVE operare,
// non descrivere una categoria.
const REGION_KEYWORDS = [
  [/\bjapan\b|\bboj\b|nikkei|\btokyo\b/i, "JP"],
  [/\bchina\b|\bchinese\b|\bpboc\b|\byuan\b|renminbi|\bshanghai\b/i, "CN"],
  [/eurozone|euro area|\becb\b/i, "EU"],
  [/\buk\b|\bbritain\b|\bbritish\b|\bboe\b|bank of england|\blondon\b/i, "UK"],
  [/\bu\.s\.|\busa\b|united states|\bfed\b|federal reserve|\bs&p\b|dow jones|\bnasdaq\b|wall street/i, "US"],
];

function detectRegion(text) {
  for (const [re, code] of REGION_KEYWORDS) {
    if (re.test(text)) return code;
  }
  return null;
}

// Le 6 coppie major, mostrate insieme quando la notizia riguarda il dollaro
// senza una controparte specifica (es. inflazione USA, decisione Fed) — su
// richiesta esplicita, invece di un'unica etichetta generica "DOLLARO".
//
// USD_BASE: il dollaro e' la PRIMA valuta della coppia -> si muove nella
// STESSA direzione di DXY (dollaro su => USDJPY su).
// USD_QUOTE: il dollaro e' la SECONDA valuta -> si muove nella direzione
// OPPOSTA a DXY (dollaro su => EURUSD giu', perche' l'euro si indebolisce
// rispetto a un dollaro piu' forte). Bug segnalato: una freccia unica su
// tutta la lista era sbagliata per meta' delle coppie — ora ogni coppia ha
// la propria freccia calcolata correttamente.
const USD_BASE_PAIRS = ["USDJPY", "USDCHF", "USDCAD"];
const USD_QUOTE_PAIRS = ["EURUSD", "GBPUSD", "AUDUSD"];
const OPPOSITE_DIRECTION = { UP: "DOWN", DOWN: "UP", NEUTRAL: "NEUTRAL" };

function usdMajorsWithArrows(dollarDirection) {
  const sameArrow = DIRECTION_ARROW[dollarDirection] ?? "";
  if (dollarDirection === "NEUTRAL" || !dollarDirection) {
    return [`DXY${sameArrow}`, ...USD_QUOTE_PAIRS, ...USD_BASE_PAIRS].join(" · ");
  }
  const oppArrow = DIRECTION_ARROW[OPPOSITE_DIRECTION[dollarDirection]] ?? "";
  const parts = [
    `DXY${sameArrow}`,
    ...USD_QUOTE_PAIRS.map((p) => `${p}${oppArrow}`),
    ...USD_BASE_PAIRS.map((p) => `${p}${sameArrow}`),
  ];
  return parts.join(" · ");
}

const EQUITIES_TICKER_BY_REGION = { JP: "NI225", CN: "CN50", EU: "GER40", UK: "UK100", US: "US500" };
const USD_TICKER_BY_REGION = { JP: "USDJPY", CN: "USDCNH", EU: "EURUSD", UK: "GBPUSD" };

// Ritorna il ticker (o la lista di ticker) esatto da cercare per operare.
// null se l'evento non ha un asset primario tracciabile.
function resolveTicker(event) {
  const region = detectRegion(`${event.title ?? ""} ${event.summary ?? ""}`);
  switch (event.underlying_symbol) {
    case "GOLD":
      return "XAUUSD"; // mercato unico, la regione non cambia lo strumento
    case "US_YIELDS":
      return "US10Y"; // riferimento: non e' uno strumento diretto da CFD/forex, si tradano futures ZN/ZB o ETF
    case "EQUITIES":
      return EQUITIES_TICKER_BY_REGION[region] ?? "US500";
    case "USD":
      return USD_TICKER_BY_REGION[region] ?? null; // null -> lista majors, gestita sotto
    default:
      return null;
  }
}

// Formato pensato per essere letto in 2-3 secondi su telefono: solo ticker,
// direzione attesa, livello, e cosa e' successo. Il resto (score dettagliato,
// conferma prezzo) sta nella dashboard, non qui.
export function formatAlertText(event) {
  const emoji = LEVEL_EMOJI[event.impact_level] ?? "⚪";
  const time = new Date(event.published_at).toLocaleString("it-IT", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
  const arrow = event.underlying_symbol ? DIRECTION_ARROW[event.expected_direction] : "";
  const ticker = resolveTicker(event);

  let headerBody;
  if (event.underlying_symbol === "USD" && !ticker) {
    // Dollaro senza controparte specifica: ogni coppia ha la propria freccia
    // (vedi usdMajorsWithArrows) invece di una freccia unica ambigua.
    headerBody = usdMajorsWithArrows(event.expected_direction);
  } else if (ticker) {
    headerBody = arrow ? `${ticker} ${arrow}` : ticker;
  } else {
    headerBody = null;
  }

  const header = headerBody
    ? `${emoji} ${headerBody} — ${event.impact_level}`
    : `${emoji} ${event.impact_level}`;

  return [header, event.title, `${time} · ${event.source}`, event.url || ""].filter(Boolean).join("\n");
}

export async function sendTelegramAlert(event) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID mancanti" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: formatAlertText(event),
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Telegram HTTP ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function sendEmailAlert(event) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;
  // Senza dominio verificato su Resend, l'UNICO mittente accettato e'
  // esattamente onboarding@resend.dev — qualsiasi altro indirizzo @resend.dev
  // (es. "alerts@resend.dev", il default precedente) viene rifiutato in
  // silenzio. Bug reale trovato: nessuna email arrivava mai per questo.
  const from = process.env.ALERT_EMAIL_FROM || "Market Watch <onboarding@resend.dev>";
  if (!apiKey || !to) {
    return { ok: false, error: "RESEND_API_KEY o ALERT_EMAIL_TO mancanti" };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const emoji = LEVEL_EMOJI[event.impact_level] ?? "⚪";
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `${emoji} [${event.impact_level}] ${event.title}`,
      text: formatAlertText(event),
    });
    if (error) return { ok: false, error: String(error) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Soglia minima di impact_score per inviare un alert push.
// Sotto soglia l'evento resta comunque visibile in dashboard.
export const ALERT_THRESHOLD = Number(process.env.ALERT_THRESHOLD ?? 50);
