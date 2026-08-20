import { ASSET_STYLE, IMPACT_STYLE } from "@/lib/assetStyle";
import type { AssetTag, ImpactLevel } from "@/lib/types";

export function ImpactBadge({ level, score }: { level: ImpactLevel; score: number }) {
  const s = IMPACT_STYLE[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${s.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label} · {score}/100
    </span>
  );
}

export function AssetBadge({ asset }: { asset: AssetTag }) {
  const s = ASSET_STYLE[asset];
  if (!s) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function SourceTierBadge({ tier }: { tier: "FAST" | "STANDARD" | "SLOW" }) {
  const map = {
    FAST: "text-status-good border-status-good/40",
    STANDARD: "text-ink-secondary border-line-axis",
    SLOW: "text-ink-muted border-line-axis",
  } as const;
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${map[tier]}`}>
      {tier}
    </span>
  );
}
