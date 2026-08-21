"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { NewsEvent } from "@/lib/types";
import { EventCard } from "./EventCard";

const POLL_MS = 45_000;
const MAX_KEPT = 150; // tetto alla lista tenuta in memoria/mostrata

export function EventFeed({ initialEvents }: { initialEvents: NewsEvent[] }) {
  const [events, setEvents] = useState<NewsEvent[]>(initialEvents);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [minLevel, setMinLevel] = useState<"ALL" | "MEDIUM" | "HIGH" | "CRITICAL">("ALL");

  // Cursore per il polling "delta": chiediamo solo cio' che e' cambiato da
  // qui in poi (nuove notizie + aggiornamenti di prezzo/verdetto su notizie
  // gia' viste), invece di riscaricare tutta la lista ogni volta — molto
  // piu' leggero sul traffico gratuito di Supabase.
  const cursorRef = useRef<string>(new Date().toISOString());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/events?after=${encodeURIComponent(cursorRef.current)}&limit=100`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (Array.isArray(json.events) && json.events.length > 0) {
        setEvents((prev) => {
          const byId = new Map(prev.map((e) => [e.id, e]));
          for (const e of json.events as NewsEvent[]) byId.set(e.id, e);
          return Array.from(byId.values())
            .sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at))
            .slice(0, MAX_KEPT);
        });
      }
      if (json.serverTime) cursorRef.current = json.serverTime;
      setLastSync(new Date());
    } catch {
      // silenzioso: il prossimo poll riprovera', il cursore non avanza
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Rimozione ottimistica dalla lista locale, MA se la richiesta fallisce
  // davvero la notizia torna visibile e un avviso lo dice chiaramente —
  // prima spariva comunque anche a salvataggio fallito (es. secret Supabase
  // mancante su Vercel), dando l'illusione di averla persa per sempre.
  const handleArchive = useCallback(async (id: string) => {
    let removed: NewsEvent | undefined;
    setEvents((prev) => {
      removed = prev.find((e) => e.id === id);
      return prev.filter((e) => e.id !== id);
    });
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      if (removed) {
        const r = removed;
        setEvents((prev) =>
          prev.some((e) => e.id === id)
            ? prev
            : [...prev, r].sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at))
        );
      }
      alert(
        "Archiviazione non riuscita — la notizia e' tornata visibile. Controlla che SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY siano configurate su Vercel (e che sia stato rifatto un deploy dopo averle aggiunte)."
      );
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    let removed: NewsEvent | undefined;
    setEvents((prev) => {
      removed = prev.find((e) => e.id === id);
      return prev.filter((e) => e.id !== id);
    });
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      if (removed) {
        const r = removed;
        setEvents((prev) =>
          prev.some((e) => e.id === id)
            ? prev
            : [...prev, r].sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at))
        );
      }
      alert(
        "Eliminazione non riuscita — la notizia e' tornata visibile. Controlla che SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY siano configurate su Vercel (e che sia stato rifatto un deploy dopo averle aggiunte)."
      );
    }
  }, []);

  const levelRank = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;
  const threshold = minLevel === "ALL" ? -1 : levelRank[minLevel];
  const filtered = events.filter((e) => levelRank[e.impact_level] > threshold || minLevel === "ALL");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          {(["ALL", "MEDIUM", "HIGH", "CRITICAL"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setMinLevel(lvl)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                minLevel === lvl
                  ? "border-white/30 bg-white/10 text-ink-primary"
                  : "border-line-border text-ink-muted hover:text-ink-secondary"
              }`}
            >
              {lvl === "ALL" ? "Tutti" : `${lvl}+`}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10px] text-ink-muted">
          sync {lastSync.toLocaleTimeString("it-IT", { timeZone: "Asia/Bangkok" })}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-border px-4 py-10 text-center text-sm text-ink-muted">
          Nessun evento in questa fascia. Il sistema controlla le fonti ogni 5 minuti.
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} onArchive={handleArchive} onDelete={handleDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}
