export function StatTile({
  label,
  value,
  sub,
  accentClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  accentClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-line-border bg-surface-chart px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-wider text-ink-muted">{label}</div>
      <div className={`mt-1.5 font-mono text-2xl font-semibold ${accentClassName ?? "text-ink-primary"}`}>
        {value}
      </div>
      {sub ? <div className="mt-1 text-[11px] text-ink-secondary">{sub}</div> : null}
    </div>
  );
}
