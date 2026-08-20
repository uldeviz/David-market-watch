"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { IMPACT_STYLE } from "@/lib/assetStyle";
import type { ImpactLevel } from "@/lib/types";

const POLL_MS = 60_000;

const IMPACT_HEX: Record<ImpactLevel, string> = {
  LOW: "#898781",
  MEDIUM: "#fab219",
  HIGH: "#ec835a",
  CRITICAL: "#d03b3b",
};

type SeriesPoint = { ts: number; close: number };
type MarkerEvent = {
  id: string;
  title: string;
  impact_level: ImpactLevel;
  impact_score: number;
  published_at: string;
};

function nearestClose(series: SeriesPoint[], ts: number) {
  if (!series.length) return null;
  let best = series[0];
  let bestDiff = Math.abs(series[0].ts - ts);
  for (const p of series) {
    const d = Math.abs(p.ts - ts);
    if (d < bestDiff) {
      best = p;
      bestDiff = d;
    }
  }
  return best.close;
}

export function GoldChart() {
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [events, setEvents] = useState<MarkerEvent[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/gold-series", { cache: "no-store" });
      const json = await res.json();
      setSeries(Array.isArray(json.series) ? json.series : []);
      setEvents(Array.isArray(json.events) ? json.events : []);
      setError(json.error ?? null);
    } catch {
      setError("Impossibile raggiungere il feed prezzi.");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const markers = useMemo(
    () =>
      events.map((e) => {
        const ts = new Date(e.published_at).getTime();
        return { ...e, ts, price: nearestClose(series, ts) };
      }),
    [events, series]
  );

  const chartData = series.map((p) => ({ ts: p.ts, close: p.close }));

  return (
    <div className="rounded-lg border border-line-border bg-surface-chart px-4 py-3.5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-ink-primary">Oro — Futures COMEX (4h)</h3>
          <p className="text-[11px] text-ink-muted">I marcatori indicano notizie rilevanti sull'oro</p>
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="rounded border border-line-border px-2 py-1 text-[11px] text-ink-secondary hover:text-ink-primary"
        >
          {showTable ? "Vedi grafico" : "Vedi come tabella"}
        </button>
      </div>

      {error ? <p className="mb-2 text-[11px] text-status-serious">{error}</p> : null}

      {showTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-ink-muted">
                <th className="py-1 pr-3 font-medium">Ora</th>
                <th className="py-1 pr-3 font-medium">Prezzo</th>
                <th className="py-1 pr-3 font-medium">Evento</th>
                <th className="py-1 font-medium">Impatto</th>
              </tr>
            </thead>
            <tbody>
              {markers.map((m) => (
                <tr key={m.id} className="border-t border-line-grid">
                  <td className="py-1.5 pr-3 font-mono text-ink-secondary">
                    {new Date(m.ts).toLocaleTimeString("it-IT", { timeZone: "Asia/Bangkok" })}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-ink-secondary">
                    {m.price != null ? m.price.toFixed(2) : "n/d"}
                  </td>
                  <td className="py-1.5 pr-3 text-ink-primary">{m.title}</td>
                  <td className="py-1.5" style={{ color: IMPACT_HEX[m.impact_level] }}>
                    {m.impact_level} ({m.impact_score})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3987e5" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#3987e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#2c2c2a" strokeDasharray="2 3" />
              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ts) =>
                  new Date(ts).toLocaleTimeString("it-IT", {
                    timeZone: "Asia/Bangkok",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
                stroke="#383835"
                tick={{ fill: "#898781", fontSize: 10 }}
                axisLine={{ stroke: "#383835" }}
                tickLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                stroke="#383835"
                tick={{ fill: "#898781", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a19",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelFormatter={(ts) =>
                  new Date(Number(ts)).toLocaleString("it-IT", { timeZone: "Asia/Bangkok" })
                }
                formatter={(value: number) => [value.toFixed(2), "Gold"]}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#3987e5"
                strokeWidth={2}
                fill="url(#goldFill)"
                dot={false}
                isAnimationActive={false}
              />
              {markers.map((m) =>
                m.price != null ? (
                  <ReferenceDot
                    key={m.id}
                    x={m.ts}
                    y={m.price}
                    r={4}
                    fill={IMPACT_HEX[m.impact_level]}
                    stroke="#1a1a19"
                    strokeWidth={1.5}
                  />
                ) : null
              )}
            </AreaChart>
          </ResponsiveContainer>

          <div className="mt-2 flex flex-wrap gap-3">
            {(Object.keys(IMPACT_STYLE) as ImpactLevel[]).map((lvl) => (
              <span key={lvl} className="flex items-center gap-1.5 text-[10px] text-ink-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: IMPACT_HEX[lvl] }} />
                {IMPACT_STYLE[lvl].label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
