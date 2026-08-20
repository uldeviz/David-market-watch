// Prezzi "underlying" per confermare l'impatto reale di una notizia.
//
// Usa l'endpoint pubblico (non ufficiale, gratuito, no API key) di Yahoo
// Finance. E' rate-limited e puo' cambiare senza preavviso: se in futuro
// smette di funzionare, sostituisci fetchIntraday() con un provider a
// chiave gratuita (es. Twelve Data, 800 richieste/giorno gratis) senza
// toccare il resto del codice.

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

// Simbolo Yahoo per ciascun underlying che vogliamo tracciare.
// Nota: ^TNX e ^TYX sono quotati a 1/10 del rendimento reale (42.5 = 4.25%).
export const SYMBOLS = {
  GOLD: { yahoo: "GC=F", label: "Gold Futures (COMEX)", scale: 1 },
  USD: { yahoo: "DX-Y.NYB", label: "US Dollar Index (DXY)", scale: 1 },
  US_YIELDS_10Y: { yahoo: "^TNX", label: "US 10Y Yield", scale: 0.1 },
  US_YIELDS_30Y: { yahoo: "^TYX", label: "US 30Y Yield", scale: 0.1 },
  EQUITIES: { yahoo: "^GSPC", label: "S&P 500", scale: 1 },
};

// Ritorna una serie [{ts, close}] degli ultimi `rangeMinutes` a granularita' 1m.
export async function fetchIntraday(symbolKey, rangeMinutes = 30) {
  const cfg = SYMBOLS[symbolKey];
  if (!cfg) throw new Error(`Simbolo non configurato: ${symbolKey}`);

  const url = `${YAHOO_CHART_URL}/${encodeURIComponent(cfg.yahoo)}?range=1d&interval=1m`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (market-watch/1.0)" },
  });
  if (!res.ok) throw new Error(`Yahoo chart HTTP ${res.status} per ${symbolKey}`);
  const json = await res.json();

  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Nessun dato Yahoo per ${symbolKey}`);

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];

  const series = timestamps
    .map((ts, i) => ({ ts: ts * 1000, close: closes[i] }))
    .filter((p) => typeof p.close === "number")
    .map((p) => ({ ts: p.ts, close: p.close * cfg.scale }));

  const cutoff = Date.now() - rangeMinutes * 60_000;
  return series.filter((p) => p.ts >= cutoff);
}

// Trova il prezzo piu' vicino a un timestamp target (ms) in una serie.
export function nearestPrice(series, targetTs) {
  if (!series.length) return null;
  let best = series[0];
  let bestDiff = Math.abs(series[0].ts - targetTs);
  for (const p of series) {
    const diff = Math.abs(p.ts - targetTs);
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best.close;
}

export function pctChange(from, to) {
  if (from == null || to == null || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}
