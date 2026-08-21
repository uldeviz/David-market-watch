-- Migrazione 003: colonna per il titolo tradotto in italiano.
-- NULL finche' la traduzione non e' disponibile (o se e' fallita per quella
-- notizia) — in quel caso Telegram/email/dashboard mostrano il titolo
-- originale in inglese, mai un errore.
--
-- Esegui una volta nell'SQL Editor di Supabase.

alter table public.news_events
  add column if not exists title_it text;
