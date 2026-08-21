// Traduzione titoli EN -> IT via MyMemory: gratis, nessuna registrazione,
// nessuna carta di credito richiesta (a differenza di DeepL, che nel 2026
// chiede carta anche per il piano "free"). In cambio: qualita' inferiore a
// un servizio a pagamento, e un limite giornaliero condiviso con altri
// utenti del servizio nel mondo (piu' alto se passi un'email, vedi sotto).
//
// Se la traduzione fallisce per qualsiasi motivo, ritorna null — non deve
// MAI bloccare l'invio dell'alert: si usa semplicemente il titolo originale.
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

export async function translateToItalian(text) {
  if (!text || !text.trim()) return null;

  const params = new URLSearchParams({ q: text, langpair: "en|it" });
  // Email opzionale: MyMemory alza il limite giornaliero gratuito se la
  // passi (nessuna registrazione, e' solo un parametro nella richiesta).
  if (process.env.TRANSLATE_CONTACT_EMAIL) {
    params.set("de", process.env.TRANSLATE_CONTACT_EMAIL);
  }

  // Timeout esplicito — stessa lezione imparata con Yahoo Finance (vedi
  // lib/prices.mjs): senza, una risposta lenta blocca lo script a tempo
  // indefinito.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${MYMEMORY_URL}?${params.toString()}`, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    const translated = json?.responseData?.translatedText;
    // MyMemory a volte risponde HTTP 200 con un messaggio di errore testuale
    // (es. quota giornaliera superata) invece di un errore HTTP vero — lo
    // scartiamo per non mostrarlo come se fosse una traduzione valida.
    if (!translated || /MYMEMORY WARNING|QUOTA/i.test(translated)) return null;
    return translated;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
