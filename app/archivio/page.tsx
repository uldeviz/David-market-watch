import { getSupabaseAnon } from "@/lib/supabase";
import type { NewsEvent } from "@/lib/types";
import { ArchiveFeed } from "@/components/ArchiveFeed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Nessun limite temporale (a differenza del feed principale, che guarda solo
// le ultime 24h): l'archivio deve mostrare tutto cio' che e' stato
// archiviato, non importa quando. Limite di righe come unico paracadute.
async function loadArchived() {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("news_events")
    .select("*")
    .eq("status", "ARCHIVED")
    .order("published_at", { ascending: false })
    .limit(300);

  if (error) throw error;
  return (data ?? []) as NewsEvent[];
}

export default async function ArchivioPage() {
  let events: NewsEvent[] = [];
  let loadError: string | null = null;

  try {
    events = await loadArchived();
  } catch (err) {
    loadError = String(err instanceof Error ? err.message : err);
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink-primary">Archivio</h1>
          <p className="mt-0.5 text-[12px] text-ink-secondary">
            Notizie archiviate dal feed principale, divise per giorno.
          </p>
        </div>
        <a
          href="/"
          className="text-[11px] text-ink-secondary underline-offset-2 hover:text-ink-primary hover:underline"
        >
          ← Torna al feed
        </a>
      </header>

      {loadError ? (
        <p className="font-mono text-xs text-status-critical">{loadError}</p>
      ) : (
        <ArchiveFeed initialEvents={events} />
      )}
    </main>
  );
}
