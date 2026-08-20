-- Market Watch — schema Supabase
-- Esegui questo file in: Supabase Dashboard > SQL Editor > New query > Run

create extension if not exists pgcrypto;

-- ============================================================
-- news_events: ogni notizia rilevata, con scoring di impatto e
-- la timeline di prezzo prima/dopo per verificare l'impatto reale.
-- ============================================================
create table if not exists news_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), -- si aggiorna da solo (trigger sotto)
  published_at timestamptz not null,
  source text not null,
  source_tier text not null check (source_tier in ('FAST','STANDARD','SLOW')),
  title text not null,
  summary text,
  url text,
  content_hash text not null unique, -- dedup: hash(source + title normalizzato)
  assets text[] not null default '{}',
  impact_score int not null default 0 check (impact_score between 0 and 100),
  impact_level text not null default 'LOW' check (impact_level in ('LOW','MEDIUM','HIGH','CRITICAL')),
  raw_category text,

  -- Asset primario tracciato per la timeline di prezzo (uno tra GOLD, USD,
  -- US_YIELDS, EQUITIES — gli unici con una serie di prezzo gratuita).
  underlying_symbol text,

  -- Direzione attesa sull'asset primario, da euristica (lib/direction.mjs).
  expected_direction text not null default 'NEUTRAL'
    check (expected_direction in ('UP','DOWN','NEUTRAL')),

  -- Timeline di prezzo: prima della notizia, poi +1m / +3m / +5m dopo.
  price_before numeric,
  price_plus_1m numeric,
  price_plus_3m numeric,
  price_plus_5m numeric,

  -- Verdetto finale: il mercato si e' mosso come atteso?
  -- PENDING = in attesa dati | CONFIRMED (verde) | NOT_CONFIRMED (rosso)
  -- NOT_APPLICABLE = nessun asset tracciabile o direzione neutra
  -- INCONCLUSIVE = dati prezzo mancanti oltre la finestra utile
  confirmation text not null default 'PENDING'
    check (confirmation in ('PENDING','CONFIRMED','NOT_CONFIRMED','NOT_APPLICABLE','INCONCLUSIVE')),
  confirmed_at timestamptz
);

create index if not exists idx_news_events_published_at on news_events (published_at desc);
create index if not exists idx_news_events_updated_at on news_events (updated_at desc);
create index if not exists idx_news_events_impact_score on news_events (impact_score desc);
create index if not exists idx_news_events_assets on news_events using gin (assets);
create index if not exists idx_news_events_confirmation on news_events (confirmation);

-- Aggiorna updated_at automaticamente ad ogni UPDATE (es. quando arriva il
-- prezzo +1m/+3m/+5m o il verdetto finale) — la dashboard usa questo campo
-- per chiedere solo "cosa e' cambiato da un minuto fa" invece di riscaricare
-- tutto ad ogni polling, per restare ben dentro il traffico gratuito.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_news_events_updated_at on news_events;
create trigger trg_news_events_updated_at
  before update on news_events
  for each row execute function set_updated_at();

-- ============================================================
-- alerts_sent: log degli alert inviati (evita doppi invii)
-- ============================================================
create table if not exists alerts_sent (
  id uuid primary key default gen_random_uuid(),
  news_event_id uuid not null references news_events(id) on delete cascade,
  channel text not null check (channel in ('telegram','email')),
  sent_at timestamptz not null default now(),
  status text not null default 'ok'
);

create unique index if not exists idx_alerts_unique on alerts_sent (news_event_id, channel);

-- ============================================================
-- Row Level Security: la dashboard (anon key) puo' solo leggere.
-- Solo lo script di ingestion (service role key) puo' scrivere.
-- ============================================================
alter table news_events enable row level security;
alter table alerts_sent enable row level security;

drop policy if exists "public read news_events" on news_events;
create policy "public read news_events" on news_events
  for select using (true);

-- alerts_sent non serve alla dashboard: nessuna policy select pubblica.
