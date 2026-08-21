#!/usr/bin/env node
// Script eseguito da GitHub Actions ogni N minuti.
//
// Flusso:
//   1. Legge ogni fonte RSS (lib/sources.mjs)
//   2. Per ogni item nuovo: calcola asset, direzione attesa e score
//   3. Inserisce in Supabase (dedup via content_hash, UNIQUE constraint)
//   4. Se impact_score >= soglia -> invia alert Telegram + Email
//   5. Per ogni evento con verdetto ancora PENDING, aggiorna la timeline di
//      prezzo (prima / +1m / +3m / +5m) e, quando +5m e' disponibile,
//      determina il verdetto finale CONFIRMED/NOT_CONFIRMED.
//
// Nota sui tempi: il verdetto finale richiede che siano passati almeno 5
// minuti REALI dalla pubblicazione, quindi appare al piu' presto nel run
// successivo a quello in cui i 5 minuti sono trascorsi (il workflow gira
// ogni 5 minuti) — nella pratica entro 5-10 minuti dalla notizia, non
// istantaneo.
//
// Uso:
//   node scripts/ingest.mjs            run normale (scrive DB, invia alert)
//   node scripts/ingest.mjs --check    dry-run: testa solo le fonti RSS

import Parser from "rss-parser";
import { createClient } from "@supabase/supabase-js";
import { SOURCES } from "../lib/sources.mjs";
import { contentHash, detectAssets, scoreImpact } from "../lib/scoring.mjs";
import { primaryTrackableAsset, expectedDirection } from "../lib/direction.mjs";
import { sendTelegramAlert, sendEmailAlert, ALERT_THRESHOLD } from "../lib/alerts.mjs";
import { fetchIntraday, nearestPrice, pctChange } from "../lib/prices.mjs";
import { translateToItalian } from "../lib/translate.mjs";

const CHECK_ONLY = process.argv.includes("--check");
const LOOKBACK_MINUTES = Number(process.env.LOOKBACK_MINUTES ?? 20);
const CONFIRM_WINDOW_MINUTES = Number(process.env.CONFIRM_WINDOW_MINUTES ?? 45);
// Soglia sotto la quale un movimento e' considerato rumore, non conferma.
// Semplificazione: stessa soglia per tutti gli asset tracciati (oro, DXY,
// yield, S&P) — se noti troppi falsi CONFIRMED/NOT_CONFIRMED, differenziala
// per asset qui.
const NOISE_THRESHOLD_PCT = Number(process.env.NOISE_THRESHOLD_PCT ?? 0.05);

// Mappa asset primario (AssetTag) -> chiave SYMBOLS in lib/prices.mjs
const SYMBOL_KEY_BY_ASSET = {
  GOLD: "GOLD",
  USD: "USD",
  US_YIELDS: "US_YIELDS_10Y",
  EQUITIES: "EQUITIES",
};

const parser = new Parser({
  timeout: 15_000,
  headers: { "User-Agent": "Mozilla/5.0 (market-watch/1.0; +https://vercel.app)" },
});

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Mancano SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY nell'ambiente.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchSource(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return { source, items: feed.items ?? [], error: null };
  } catch (err) {
    return { source, items: [], error: String(err?.message ?? err) };
  }
}

async function runCheck() {
  console.log(`Verifica ${SOURCES.length} fonti (in parallelo)...\n`);
  const results = await Promise.all(SOURCES.map(fetchSource));
  for (const { source, items, error } of results) {
    if (error) {
      console.log(`[ROTTA]  ${source.id.padEnd(22)} ${source.url}\n         -> ${error}`);
    } else {
      console.log(`[OK]     ${source.id.padEnd(22)} ${items.length} item (es. "${items[0]?.title ?? "n/a"}")`);
    }
  }
}

async function runIngest() {
  const supabase = getSupabase();
  const cutoff = Date.now() - LOOKBACK_MINUTES * 60_000;
  let inserted = 0;
  let alerted = 0;

  // Le fonti vengono lette tutte insieme (non una alla volta): con 12+
  // fonti, farlo in sequenza poteva superare abbondantemente i 4 minuti di
  // timeout del job se anche solo un paio erano lente — successo nel primo
  // test reale. In parallelo il tempo totale e' quello della fonte piu'
  // lenta, non la somma di tutte.
  const fetched = await Promise.all(SOURCES.map(fetchSource));

  for (const { source, items, error } of fetched) {
    if (error) {
      console.warn(`[fonte rotta] ${source.id}: ${error}`);
      continue;
    }

    for (const item of items) {
      const publishedAt = item.isoDate ? new Date(item.isoDate) : new Date();
      if (publishedAt.getTime() < cutoff) continue;
      if (!item.title) continue;

      const hash = contentHash(source.id, item.title);
      const text = `${item.title} ${item.contentSnippet ?? ""}`;
      const assets = detectAssets(text, source.defaultAssets);
      const { score, level } = scoreImpact({
        category: source.category,
        title: item.title,
        summary: item.contentSnippet ?? "",
      });

      // Se la notizia non nomina esplicitamente nessun asset tracciabile,
      // usiamo comunque l'asset "tipico" della fonte come riferimento
      // (es. ForexLive -> oro) invece di lasciare l'alert senza intestazione,
      // che era confuso e inutile (bug osservato nel primo test reale).
      const primaryAsset = primaryTrackableAsset(assets) || primaryTrackableAsset(source.defaultAssets);
      const direction = expectedDirection(text, primaryAsset);

      const row = {
        published_at: publishedAt.toISOString(),
        source: source.name,
        source_tier: source.tier,
        title: item.title,
        summary: item.contentSnippet ?? null,
        url: item.link ?? null,
        content_hash: hash,
        assets,
        impact_score: score,
        impact_level: level,
        raw_category: source.category,
        underlying_symbol: primaryAsset,
        expected_direction: direction,
        confirmation: primaryAsset ? "PENDING" : "NOT_APPLICABLE",
      };

      const { data, error: insertError } = await supabase
        .from("news_events")
        .insert(row)
        .select()
        .single();

      if (insertError) {
        // 23505 = unique_violation -> gia' visto, va bene, si ignora.
        if (insertError.code !== "23505") {
          console.warn(`[insert error] ${source.id}: ${insertError.message}`);
        }
        continue;
      }

      inserted++;
      console.log(`[nuovo] (${score}/100 ${level}, atteso ${direction} su ${primaryAsset ?? "n/a"}) ${item.title}`);

      // Traduzione solo qui (dopo insert riuscito, quindi solo su notizie
      // davvero nuove) — se lo facessimo per ogni item del feed, ritraduciremmo
      // le stesse notizie gia' viste ad ogni run finche' restano nella
      // finestra di lookback, sprecando il limite giornaliero gratuito.
      // Se fallisce (rete, quota, timeout) restiamo con null: alert e
      // dashboard mostrano semplicemente il titolo originale in inglese.
      const titleIt = await translateToItalian(item.title);
      if (titleIt) {
        data.title_it = titleIt;
        const { error: translateError } = await supabase
          .from("news_events")
          .update({ title_it: titleIt })
          .eq("id", data.id);
        if (translateError) console.warn(`[traduzione] salvataggio fallito: ${translateError.message}`);
      }

      if (score >= ALERT_THRESHOLD) {
        const [tg, em] = await Promise.all([sendTelegramAlert(data), sendEmailAlert(data)]);
        const logs = [];
        if (tg.ok) logs.push({ news_event_id: data.id, channel: "telegram", status: "ok" });
        else console.warn(`[telegram fallito] ${tg.error}`);
        if (em.ok) logs.push({ news_event_id: data.id, channel: "email", status: "ok" });
        else console.warn(`[email fallita] ${em.error}`);
        if (logs.length) {
          await supabase.from("alerts_sent").insert(logs);
          alerted++;
        }
      }
    }
  }

  console.log(`\nNuovi eventi: ${inserted} | Alert inviati: ${alerted}`);
  await updatePriceTimelines(supabase);
}

// Riempie price_before / +1m / +3m / +5m per ogni evento ancora PENDING e,
// quando +5m e' disponibile, scrive il verdetto finale.
async function updatePriceTimelines(supabase) {
  const from = new Date(Date.now() - CONFIRM_WINDOW_MINUTES * 60_000).toISOString();

  const { data: pending, error } = await supabase
    .from("news_events")
    .select("*")
    .eq("confirmation", "PENDING")
    .gte("published_at", from)
    .limit(50);

  if (error) {
    console.warn(`[timeline] errore lettura pending: ${error.message}`);
    return;
  }
  if (!pending?.length) {
    console.log("Nessun evento in attesa di conferma prezzo.");
    return;
  }

  const seriesCache = {};
  const now = Date.now();
  let confirmed = 0;
  let notConfirmed = 0;

  for (const event of pending) {
    const symbolKey = SYMBOL_KEY_BY_ASSET[event.underlying_symbol];
    if (!symbolKey) {
      await supabase
        .from("news_events")
        .update({ confirmation: "NOT_APPLICABLE", confirmed_at: new Date().toISOString() })
        .eq("id", event.id);
      continue;
    }

    try {
      if (!seriesCache[symbolKey]) {
        seriesCache[symbolKey] = await fetchIntraday(symbolKey, 240);
      }
      const series = seriesCache[symbolKey];
      const publishedTs = new Date(event.published_at).getTime();
      const ageMinutes = (now - publishedTs) / 60_000;

      const update = {};
      if (event.price_before == null) {
        update.price_before = nearestPrice(series, publishedTs - 60_000);
      }
      if (event.price_plus_1m == null && ageMinutes >= 1) {
        update.price_plus_1m = nearestPrice(series, publishedTs + 60_000);
      }
      if (event.price_plus_3m == null && ageMinutes >= 3) {
        update.price_plus_3m = nearestPrice(series, publishedTs + 3 * 60_000);
      }
      if (event.price_plus_5m == null && ageMinutes >= 5) {
        update.price_plus_5m = nearestPrice(series, publishedTs + 5 * 60_000);
      }

      const priceBefore = update.price_before ?? event.price_before;
      const priceAt5m = update.price_plus_5m ?? event.price_plus_5m;

      if (priceBefore != null && priceAt5m != null) {
        const delta = pctChange(priceBefore, priceAt5m);
        let actualDirection = "NEUTRAL";
        if (delta != null) {
          if (delta > NOISE_THRESHOLD_PCT) actualDirection = "UP";
          else if (delta < -NOISE_THRESHOLD_PCT) actualDirection = "DOWN";
        }

        if (event.expected_direction === "NEUTRAL") {
          update.confirmation = "NOT_APPLICABLE";
        } else if (actualDirection === event.expected_direction) {
          update.confirmation = "CONFIRMED";
          confirmed++;
        } else {
          update.confirmation = "NOT_CONFIRMED";
          notConfirmed++;
        }
        update.confirmed_at = new Date().toISOString();
      } else if (ageMinutes > CONFIRM_WINDOW_MINUTES) {
        // Finestra scaduta e dati ancora incompleti (probabile buco nel feed prezzi).
        update.confirmation = "INCONCLUSIVE";
        update.confirmed_at = new Date().toISOString();
      }

      if (Object.keys(update).length) {
        await supabase.from("news_events").update(update).eq("id", event.id);
      }
    } catch (err) {
      console.warn(`[timeline] ${event.id} (${symbolKey}): ${String(err)}`);
    }
  }

  console.log(`Timeline prezzi aggiornata: ${confirmed} confermati, ${notConfirmed} non confermati (su ${pending.length} in coda).`);
}

(async () => {
  if (CHECK_ONLY) {
    await runCheck();
  } else {
    await runIngest();
  }
})()
  .then(() => {
    // Uscita esplicita: senza questa riga il processo Node puo' restare
    // "vivo" anche a lavoro finito (un handle aperto, es. lato client
    // Supabase, tiene occupato l'event loop) e GitHub Actions aspetta fino
    // al timeout del job (4 minuti) prima di segnare il run "Cancelled" —
    // osservato in un run reale che aveva gia' finito e loggato tutto in
    // pochi secondi.
    process.exit(0);
  })
  .catch((err) => {
    console.error("Errore fatale:", err);
    process.exit(1);
  });
