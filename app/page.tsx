import { getSupabaseAnon } from "@/lib/supabase";
import type { NewsEvent } from "@/lib/types";
import { StatTile } from "@/components/StatTile";
import { EventFeed } from "@/components/EventFeed";
import { GoldChart } from "@/components/GoldChart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadInitialData() {
  const supabase = getSupabaseAnon();
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data, error } = await supabase
    .from("news_events")
    .select("*")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(80);

  if (error) throw error;
  return (data ?? []) as NewsEvent[];
}

export default async function Page() {
  let events: NewsEvent[] = [];
  let setupError: string | null = null;

  try {
    events = await loadInitialData();
  } catch (err) {
    setupError = String(err instanceof Error ? err.message : err);
  }

  const todayCount = events.length;
  const avgScore = events.length
    ? Math.round(events.reduce((s, e) => s + e.impact_score, 0) / events.length)
    : 0;
  const criticalCount = events.filter((e) => e.impact_level === "CRITICAL").length;
  const lastUpdate = events[0] ? new Date(events[0].published_at) : null;

  if (setupError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-semibold text-ink-primary">Setup non completato</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Il dashboard non riesce a leggere Supabase. Verifica che{" "}
          <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> siano
          configurate nelle Environment Variables di Vercel (o nel file <code className="rounded bg-white/10 px-1">.env.local</code> in locale).
        </p>
        <p className="mt-4 font-mono text-xs text-ink-muted">{setupError}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink-primary">
            Market Watch <span className="text-brand-gold">·</span> Gold & Macro News Radar
          </h1>
          <p className="mt-0.5 text-[12px] text-ink-secondary">
            Fonti monitorate ogni 5 minuti — Fed, Tesoro USA, ECB, BLS, newswire
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line-border px-3 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-good" />
          <span className="text-[11px] text-ink-secondary">Live</span>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Eventi (24h)" value={String(todayCount)} />
        <StatTile label="Impatto medio" value={`${avgScore}/100`} />
        <StatTile
          label="Alert critici (24h)"
          value={String(criticalCount)}
          accentClassName={criticalCount > 0 ? "text-status-critical" : undefined}
        />
        <StatTile
          label="Ultimo evento"
          value={
            lastUpdate
              ? lastUpdate.toLocaleTimeString("it-IT", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })
              : "—"
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
            Feed notizie
          </h2>
          <EventFeed initialEvents={events} />
        </div>
        <div>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
            Sottostante — Oro
          </h2>
          <GoldChart />
        </div>
      </section>

      <footer className="mt-10 border-t border-line-grid pt-4 text-[11px] text-ink-muted">
        Impatto stimato da regole euristiche su fonte e parole chiave; la percentuale di reazione
        reale (5m) conferma o smentisce la stima usando il prezzo effettivo dell&apos;underlying.
        Non e&apos; consulenza finanziaria.
      </footer>
    </main>
  );
}
