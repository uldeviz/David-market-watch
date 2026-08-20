# Market Watch — Gold & Macro News Radar

Sistema gratuito che monitora fonti macro (Fed, Tesoro USA, ECB, BLS, Trump,
newswire) in tempo quasi reale, assegna un punteggio di impatto (0-100) e una
direzione attesa (rialzo/ribasso) a ogni notizia, invia alert su Telegram +
Email quando supera una soglia, e la mostra su una dashboard live come un box
per evento con: notizia, asset, direzione attesa, prezzo prima/+1m/+3m/+5m e
un'etichetta verde/rossa che dice se il mercato si è mosso come previsto.

## Architettura

```
GitHub Actions (ogni 5 min)          Vercel (dashboard, sola lettura)
        |                                       |
   scripts/ingest.mjs  ---->  Supabase  <----  app/page.tsx, /api/*
        |                    (Postgres)
        v
  Telegram + Email (Resend)
```

Perché così: le funzioni serverless di Vercel non supportano cron gratuiti
sotto il minuto/pochi minuti sul piano Hobby. GitHub Actions esegue il
polling reale (il "cervello"), scrive su Supabase; Vercel ospita solo la
dashboard che legge quei dati. Zero costi in entrambi i casi, entro i
limiti dei piani free (vedi sotto).

## Setup — passo per passo

### 1. Supabase (database, gratis)
1. Crea un account su supabase.com e un nuovo progetto.
2. Vai su **SQL Editor > New query**, incolla il contenuto di
   `supabase/schema.sql` ed esegui (Run).
3. Vai su **Project Settings > API** e copia:
   - `Project URL` → userai questo valore sia come `SUPABASE_URL` che
     `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (sotto "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`
     (**mai** esporla nel browser o nel repo — solo come secret GitHub)

Nota: i progetti Supabase free si mettono in pausa dopo 7 giorni senza
attività. Con l'ingestion ogni 5 minuti questo non succederà mai.

### 2. Bot Telegram (alert istantanei, gratis)
1. Apri Telegram, cerca **@BotFather**, invia `/newbot`, segui i passi.
2. Ottieni il **token** (formato `123456:ABC-DEF...`) → `TELEGRAM_BOT_TOKEN`.
3. Scrivi un messaggio qualsiasi al tuo nuovo bot (deve iniziare lui la
   conversazione con te), poi apri nel browser:
   `https://api.telegram.org/bot<IL_TUO_TOKEN>/getUpdates`
   e leggi `"chat":{"id": ...}` → quello è `TELEGRAM_CHAT_ID`.

### 3. Resend (email, gratis fino a 100/giorno)
1. Crea un account su resend.com, genera una **API key** → `RESEND_API_KEY`.
2. Senza verificare un dominio, il sender di default `onboarding@resend.dev`
   può inviare **solo** all'email con cui ti sei registrato su Resend. Se
   `ALERT_EMAIL_TO` è un indirizzo diverso, le email falliranno silenziosamente
   finché non verifichi un dominio tuo in **Domains** (gratis, richiede
   accesso ai DNS del dominio). Se ti serve solo Telegram per ora, puoi
   lasciare Resend non configurato: il sistema continua a funzionare, salta
   solo l'invio email (lo logga come warning).

### 4. Repository GitHub + Actions
1. Crea un nuovo repository (consigliato: **pubblico** — vedi nota costi
   sotto) e pusha questi file.
2. Vai su **Settings > Secrets and variables > Actions** e aggiungi come
   *Repository secrets*: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`,
   `ALERT_EMAIL_TO`, `ALERT_EMAIL_FROM`.
3. Come *Repository variable* (stessa pagina, tab Variables): `ALERT_THRESHOLD`
   (es. `50`).
4. Il workflow `.github/workflows/ingest.yml` parte da solo ogni 5 minuti.
   Per un primo test immediato: tab **Actions > Market Watch — Ingestion >
   Run workflow**.

**Nota costi importante**: GitHub Actions è illimitato e gratuito sui
repository **pubblici**. Sui repository **privati** il piano free include
2.000 minuti/mese — un run ogni 5 minuti consuma circa 8.000+ minuti/mese,
quindi supereresti il limite gratuito. Se vuoi tenere il repo privato,
alza l'intervallo del cron a `*/20 * * * *` (ogni 20 min, ~2.160 min/mese,
sotto soglia) accettando un po' più di latenza. Nessun secret o dato
personale finisce nel codice: solo i nomi delle fonti RSS e la logica di
scoring, quindi rendere il repo pubblico non espone nulla di sensibile.

### 5. Test locale (opzionale ma consigliato)
```bash
npm install
cp .env.local.example .env.local   # compila con i tuoi valori
node scripts/ingest.mjs --check    # testa solo le fonti RSS, non scrive nulla
node scripts/ingest.mjs            # run reale: scrive su Supabase, invia alert se sopra soglia
```

### 6. Dashboard su Vercel (con la tua mail diversa)
1. Importa lo stesso repository su vercel.com (nuovo progetto).
2. In **Settings > Environment Variables** aggiungi solo le due chiavi
   pubbliche: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   Non servono le altre — la dashboard è di sola lettura.
3. Deploy. La dashboard si aggiorna da sola (poll ogni 45-60s) man mano che
   GitHub Actions scrive nuovi eventi.

## Il box per notizia (dashboard)

Ogni evento mostra: titolo/notizia, badge asset coinvolti, direzione attesa
sull'asset primario (▲/▼/↔, etichettata "euristica" — è una stima, non un
fatto), quattro prezzi (prima della notizia, +1 min, +3 min, +5 min), e in
fondo l'etichetta di verdetto:
- **verde "Confermata dal prezzo"** — il mercato si è mosso nella direzione
  attesa, oltre la soglia di rumore (0,05% di default, `NOISE_THRESHOLD_PCT`)
- **rossa "Non confermata dal prezzo"** — si è mosso nella direzione opposta
  (o non abbastanza)
- **grigia "In attesa di conferma"** — mancano ancora dati (vedi tempi sotto)
- **grigia "Nessun asset tracciabile"** — la notizia non riguarda oro/USD/
  rendimenti/azionario in modo abbastanza chiaro da tracciare un prezzo
- **gialla "Dati prezzo incompleti"** — sono passati 45+ minuti e il feed
  prezzi ha lasciato un buco (raro, capita con Yahoo Finance non ufficiale)

**Tempi reali, non istantanei**: il verdetto finale richiede che siano
passati 5 minuti veri dalla notizia, e il workflow gira ogni 5 minuti — nel
caso peggiore il box resta "in attesa" fino a **10 minuti** dopo la notizia
prima di colorarsi di rosso o verde. I prezzi +1m/+3m si riempiono prima,
progressivamente, così vedi il box "vivo" anche prima del verdetto finale.

**Trump**: oltre alle fonti istituzionali, il sistema segue un mirror non
ufficiale di Truth Social (`trumpstruth.org`, gestito da terzi — non è un
feed ufficiale di Trump, che non esiste) e i comunicati della White House.
Se quella fonte va giù, le notizie più market-moving (tariffe, minacce alla
Fed) vengono comunque intercettate entro 1-2 minuti dalle fonti newswire
FAST (ForexLive, FXStreet), che seguono attivamente le sue dichiarazioni.
Il verificatore `--check` segnala se `trumpstruth.org` è raggiungibile.

## Verificare le fonti RSS

Gli URL in `lib/sources.mjs` sono standard ma i siti istituzionali a volte
cambiano path. Questo ambiente di sviluppo non ha accesso di rete diretto
verso siti esterni (solo verso i registri pacchetti), quindi non ho potuto
verificarli "live" qui — vanno controllati al primo run reale (`--check`)
da un ambiente con internet libero (il tuo PC o GitHub Actions stesso).
Se una fonte risulta rotta, correggi solo l'URL in quel file: il resto del
sistema non cambia.

## Tuning dello scoring

Tre file, ognuno modificabile senza toccare il resto:
- `lib/scoring.mjs` → `CATEGORY_BASE_SCORE` (punteggio base per fonte) e
  `KEYWORD_WEIGHTS` (parole chiave che alzano il punteggio)
- `lib/direction.mjs` → `DIRECTION_RULES` (quali parole chiave implicano
  rialzo/ribasso su quale asset) — **questa è la parte più euristica e più
  utile da calibrare**
- `NOISE_THRESHOLD_PCT` in `scripts/ingest.mjs` (env `NOISE_THRESHOLD_PCT`)
  → sotto questa soglia di movimento, il verdetto non conta come conferma

Il verdetto `confirmation` (CONFIRMED/NOT_CONFIRMED, visibile in dashboard)
è il tuo strumento di calibrazione: se una regola di `DIRECTION_RULES`
produce sistematicamente NOT_CONFIRMED, è sbagliata o troppo generica —
correggila o rimuovila.

## Limiti onesti da conoscere

- Le fonti sono tutte gratuite: nessuna newswire "istituzionale a pagamento"
  (Bloomberg/Reuters terminal) è inclusa. Il ritardo minimo realistico con
  fonti solo gratuite è di ordine di **1-5 minuti** dalla pubblicazione,
  non i secondi di un desk professionale — resta comunque molto più veloce
  di controllare i siti a mano.
- Il feed Yahoo Finance usato per il prezzo dell'oro è un endpoint non
  ufficiale, gratuito, senza chiave: può cambiare o avere rate-limit. Se
  smette di funzionare, `lib/prices.mjs` è l'unico file da toccare per
  passare a un provider a chiave gratuita (es. Twelve Data).
- Lo scoring è euristico (regole), non un modello calibrato: trattalo come
  un filtro di attenzione, non come segnale di trading automatico.
- La **direzione attesa** (▲/▼) è la parte meno affidabile del sistema: sono
  poche regole per parole chiave, non un modello. Su notizie ambigue o mai
  viste prima resta `NEUTRAL` di proposito (nessuna scommessa) invece di
  indovinare. Il verdetto verde/rosso misura quanto spesso quella specifica
  regola ha avuto ragione — usalo per correggerla, non prendere il singolo
  verdetto come certezza.
- La soglia di rumore (0,05%) è la stessa per tutti gli asset per semplicità:
  l'oro e lo S&P 500 non si muovono con la stessa volatilità "normale", quindi
  alcuni verdetti su asset meno volatili potrebbero risultare troppo facili
  da confermare. Se lo noti, differenzia la soglia per asset in
  `scripts/ingest.mjs`.
