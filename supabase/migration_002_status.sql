-- Migrazione 002: aggiunge lo stato ACTIVE/ARCHIVED per il feature
-- "Archivia / Elimina" nella dashboard.
--
-- ACTIVE   -> mostrata nel feed principale (default per tutte le righe esistenti)
-- ARCHIVED -> spostata nella pagina /archivio, non cancellata
--
-- "Elimina" nella UI non usa questo campo: cancella la riga per sempre
-- (DELETE diretto), non passa mai per ARCHIVED.
--
-- Esegui questo script UNA VOLTA nell'SQL Editor di Supabase (come hai
-- gia' fatto per schema.sql all'inizio).

alter table public.news_events
  add column if not exists status text not null default 'ACTIVE'
  check (status in ('ACTIVE', 'ARCHIVED'));

create index if not exists idx_news_events_status on public.news_events (status);
