export type AssetTag =
  | "GOLD"
  | "USD"
  | "US_YIELDS"
  | "EQUITIES"
  | "OIL"
  | "CRYPTO"
  | "RATES_GLOBAL";

export type ImpactLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Direction = "UP" | "DOWN" | "NEUTRAL";

export type Confirmation =
  | "PENDING"
  | "CONFIRMED"
  | "NOT_CONFIRMED"
  | "NOT_APPLICABLE"
  | "INCONCLUSIVE";

export interface NewsEvent {
  id: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  source: string;
  source_tier: "FAST" | "STANDARD" | "SLOW";
  title: string;
  summary: string | null;
  url: string;
  assets: AssetTag[];
  impact_score: number; // 0-100
  impact_level: ImpactLevel;
  raw_category: string | null; // e.g. "fed", "treasury", "macro_data", "trump_statement"

  underlying_symbol: AssetTag | null; // asset primario tracciato per la timeline prezzo
  expected_direction: Direction; // direzione attesa sull'asset primario (euristica)

  price_before: number | null; // prezzo ~1 min prima della notizia
  price_plus_1m: number | null;
  price_plus_3m: number | null;
  price_plus_5m: number | null;

  confirmation: Confirmation; // verdetto: il mercato si e' mosso come atteso?
  confirmed_at: string | null;
}
