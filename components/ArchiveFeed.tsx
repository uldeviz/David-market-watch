"use client";

import { useCallback, useState } from "react";
import type { NewsEvent } from "@/lib/types";
import { EventCard } from "./EventCard";

// Raggruppa le notizie archiviate per giorno (fuso Bangkok, coerente col
// resto della dashboard), piu' recenti prima — sia i gruppi che le notizie
// dentro ogni gruppo.
function groupByDay(events: NewsEvent[]) {
  const groups = new Map<string, NewsEvent[]>();
  for (const e of events) {
    const key = new Date(e.published_at).toLocaleDateString("it-IT", {
      timeZone: "Asia/Bangkok",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return Array.from(groups.entries());
}

export function ArchiveFeed({ initialEvents }: { initialEvents: NewsEvent[] }) {
  const [events, setEvents] = useState<NewsEvent[]>(initialEvents);

  // Stessa protezione del feed principale: se il salvataggio fallisce
  // davvero, la notizia torna visibile invece di sembrare persa.
  const handleRestore = useCallback(async (id: string) => {
    let removed: NewsEvent | undefined;
    setEvents((prev) => {
      removed = prev.find((e) => e.id === id);
      return prev.filter((e) => e.id !== id);
    });
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      if (removed) {
        const r = removed;
        setEvents((prev) => (prev.some((e) => e.id === id) ? prev : [...prev, r]));
      }
      alert("Ripristino non riuscito — la notizia e' tornata visibile qui. Controlla la configurazione Supabase su Vercel.");
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
        setEvents((prev) => (prev.some((e) => e.id === id) ? prev : [...prev, r]));
      }
      alert("Eliminazione non riuscita — la notizia e' tornata visibile qui. Controlla la configurazione Supabase su Vercel.");
    }
  }, []);

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line-border px-4 py-10 text-center text-sm text-ink-muted">
        Nessuna notizia archiviata.
      </div>
    );
  }

  const groups = groupByDay(events);

  return (
    <div className="flex flex-col gap-6">
      {groups.map(([day, dayEvents]) => (
        <div key={day}>
          <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{day}</h3>
          <ul className="flex flex-col gap-2.5">
            {dayEvents.map((e) => (
              <EventCard key={e.id} event={e} onRestore={handleRestore} onDelete={handleDelete} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
