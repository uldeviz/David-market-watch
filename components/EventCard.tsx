import type { NewsEvent } from "@/lib/types";
import { AssetBadge, ImpactBadge, SourceTierBadge } from "./Badges";
import { ASSET_STYLE, CONFIRMATION_STYLE, DIRECTION_STYLE } from "@/lib/assetStyle";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatPrice(v: number | null) {
  return v == null ? "—" : v.toFixed(2);
}

// Colore del delta rispetto al prezzo "prima" — informativo, non e' il
// verdetto (quello e' il badge di conferma in fondo al box).
function deltaClass(before: number | null, value: number | null) {
  if (before == null || value == null) return "text-ink-muted";
  if (value === before) return "text-ink-secondary";
  return value > before ? "text-status-good" : "text-status-critical";
}

function PricePoint({ label, before, value }: { label: string; before: number | null; value: number | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded border border-line-grid px-2 py-1.5">
      <span className="text-[9px] uppercase tracking-wider text-ink-muted">{label}</span>
      <span className={`font-mono text-[12px] font-semibold ${deltaClass(before, value)}`}>
        {formatPrice(value)}
      </span>
    </div>
  );
}

export function EventCard({ event }: { event: NewsEvent }) {
  const confirmationStyle = CONFIRMATION_STYLE[event.confirmation];
  const directionStyle = DIRECTION_STYLE[event.expected_direction];
  const underlyingLabel = event.underlying_symbol ? ASSET_STYLE[event.underlying_symbol]?.label : null;
  const hasTimeline = event.underlying_symbol != null;

  return (
    <li className="rounded-lg border border-line-border bg-surface-chart px-4 py-3.5 transition-colors hover:border-white/20">
      <div className="mb-2 flex items-start justify-between gap-3">
        <ImpactBadge level={event.impact_level} score={event.impact_score} />
        <span className="shrink-0 font-mono text-[11px] text-ink-muted">{formatTime(event.published_at)}</span>
      </div>

      <a
        href={event.url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="block text-[13.5px] font-medium leading-snug text-ink-primary hover:underline"
      >
        {event.title}
      </a>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {event.assets.map((a) => (
          <AssetBadge key={a} asset={a} />
        ))}
        <SourceTierBadge tier={event.source_tier} />
        <span className="text-[11px] text-ink-muted">{event.source}</span>
      </div>

      {hasTimeline ? (
        <>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-secondary">
            <span aria-hidden>{directionStyle.arrow}</span>
            <span>
              {directionStyle.label} su <span className="font-medium text-ink-primary">{underlyingLabel}</span>
              <span className="text-ink-muted"> (euristica)</span>
            </span>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1.5">
            <PricePoint label="Prima" before={event.price_before} value={event.price_before} />
            <PricePoint label="+1 min" before={event.price_before} value={event.price_plus_1m} />
            <PricePoint label="+3 min" before={event.price_before} value={event.price_plus_3m} />
            <PricePoint label="+5 min" before={event.price_before} value={event.price_plus_5m} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-[11px] text-ink-muted">Nessun asset con prezzo tracciabile per questo evento.</p>
      )}

      <div className="mt-2.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${confirmationStyle.className}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${confirmationStyle.dot}`} />
          {confirmationStyle.label}
        </span>
      </div>
    </li>
  );
}
