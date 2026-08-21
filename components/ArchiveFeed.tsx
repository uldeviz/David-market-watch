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

  const handleRestore = useCallback(async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
    } catch {
      // silenzioso
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await fetch(`/api/events/${id}`, { method: "DELETE" });
    } catch {
      // silenzioso
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
