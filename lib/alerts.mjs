// Invio alert su Telegram (istantaneo) ed Email (Resend, backup/log).
// Entrambe le funzioni non lanciano eccezioni bloccanti: loggano e ritornano
// { ok, error } cosi' un canale che fallisce non impedisce l'altro.

const LEVEL_EMOJI = {
  CRITICAL: "🔴",
  HIGH: "🟠",
  MEDIUM: "🟡",
  LOW: "⚪",
};

const DIRECTION_ARROW = { UP: "⬆️", DOWN: "⬇️", NEUTRAL: "" };

// Etichette brevi in italiano per l'asset primario — duplica lib/assetStyle.ts
// perche' questo file gira in Node puro (script CLI), che non compila .ts.
const ASSET_LABEL_IT = {
  GOLD: "ORO",
  USD: "DOLLARO",
  US_YIELDS: "RENDIMENTI USA",
  EQUITIES: "AZIONARIO",
};

// Formato pensato per essere letto in 2-3 secondi su telefono: solo asset,
// direzione attesa, livello, e cosa e' successo. Il resto (score dettagliato,
// tutti gli asset coinvolti, conferma prezzo) sta nella dashboard, non qui.
export function formatAlertText(event) {
  const emoji = LEVEL_EMOJI[event.impact_level] ?? "⚪";
  const time = new Date(event.published_at).toLocaleString("it-IT", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
  const assetLabel = event.underlying_symbol ? ASSET_LABEL_IT[event.underlying_symbol] : null;
  const arrow = event.underlying_symbol ? DIRECTION_ARROW[event.expected_direction] : "";
  const header = assetLabel
    ? `${emoji} ${assetLabel} ${arrow} — ${event.impact_level}`
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
  const from = process.env.ALERT_EMAIL_FROM || "Market Watch <alerts@resend.dev>";
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
