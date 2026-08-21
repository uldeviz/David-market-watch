import type { AssetTag, ImpactLevel, Confirmation, Direction } from "./types";

// Ordine categorico fisso — mai ciclato, mai riassegnato in base al filtro attivo.
// Corrisponde 1:1 ai token cat.1..cat.7 in tailwind.config.ts (palette validata).
export const ASSET_STYLE: Record<AssetTag, { label: string; className: string; dot: string }> = {
  GOLD: { label: "Oro", className: "text-cat-1 border-cat-1/40 bg-cat-1/10", dot: "bg-cat-1" },
  USD: { label: "Dollaro / DXY", className: "text-cat-2 border-cat-2/40 bg-cat-2/10", dot: "bg-cat-2" },
  US_YIELDS: { label: "Rendimenti USA", className: "text-cat-3 border-cat-3/40 bg-cat-3/10", dot: "bg-cat-3" },
  EQUITIES: { label: "Azionario", className: "text-cat-4 border-cat-4/40 bg-cat-4/10", dot: "bg-cat-4" },
  OIL: { label: "Petrolio", className: "text-cat-5 border-cat-5/40 bg-cat-5/10", dot: "bg-cat-5" },
  CRYPTO: { label: "Crypto", className: "text-cat-6 border-cat-6/40 bg-cat-6/10", dot: "bg-cat-6" },
  RATES_GLOBAL: { label: "Tassi Globali", className: "text-cat-7 border-cat-7/40 bg-cat-7/10", dot: "bg-cat-7" },
};

export const IMPACT_STYLE: Record<ImpactLevel, { label: string; className: string; dot: string }> = {
  LOW: { label: "LOW", className: "text-ink-muted border-line-axis bg-white/[0.03]", dot: "bg-ink-muted" },
  MEDIUM: { label: "MEDIUM", className: "text-status-warning border-status-warning/40 bg-status-warning/10", dot: "bg-status-warning" },
  HIGH: { label: "HIGH", className: "text-status-serious border-status-serious/40 bg-status-serious/10", dot: "bg-status-serious" },
  CRITICAL: { label: "CRITICAL", className: "text-status-critical border-status-critical/40 bg-status-critical/10", dot: "bg-status-critical" },
};

// Verdetto finale (il box "rosso o verde" richiesto): il mercato si e'
// mosso come atteso dalla direzione euristica? Colori riservati (status
// palette), sempre con etichetta testuale accanto — mai solo colore.
export const CONFIRMATION_STYLE: Record<Confirmation, { label: string; className: string; dot: string }> = {
  PENDING: {
    label: "In attesa di conferma",
    className: "text-ink-muted border-line-axis bg-white/[0.03]",
    dot: "bg-ink-muted animate-pulse",
  },
  CONFIRMED: {
    label: "Confermata dal prezzo",
    className: "text-status-good border-status-good/40 bg-status-good/10",
    dot: "bg-status-good",
  },
  NOT_CONFIRMED: {
    label: "Non confermata dal prezzo",
    className: "text-status-critical border-status-critical/40 bg-status-critical/10",
    dot: "bg-status-critical",
  },
  NOT_APPLICABLE: {
    label: "Nessun asset tracciabile",
    className: "text-ink-muted border-line-axis bg-white/[0.03]",
    dot: "bg-ink-muted",
  },
  INCONCLUSIVE: {
    label: "Dati prezzo incompleti",
    className: "text-status-warning border-status-warning/40 bg-status-warning/10",
    dot: "bg-status-warning",
  },
};

// className qui e' per la freccia stessa (colore), non per il testo accanto —
// la freccia era troppo piccola/poco visibile (segnalato su un test reale).
export const DIRECTION_STYLE: Record<Direction, { label: string; arrow: string; className: string }> = {
  UP: { label: "Rialzo atteso", arrow: "▲", className: "text-status-good" },
  DOWN: { label: "Ribasso atteso", arrow: "▼", className: "text-status-critical" },
  NEUTRAL: { label: "Direzione incerta", arrow: "↔", className: "text-ink-muted" },
};
