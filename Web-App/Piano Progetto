# Piano Progetto Esame Web Application — Timeline & Checklist

> Adattato alla traccia **“Guess a Sentence” (Exam #3 – 2024/25)**. Stack: **React 19 (Vite, StrictMode) + Express 22.x + SQLite + Passport sessioni**. Pattern **two servers** con CORS in dev. DB pre-caricato con ≥3 utenti e ≥20 frasi ( +3 per anonimo).

---

## 1) Stack e Architettura

* **Frontend:** React 19 (Vite), React Router, Context per auth e match-state, componenti funzionali con hooks, forms controllati.
* **Backend:** Node 22.x + Express, `express-session` + `passport-local`, `express-validator`, `cors` (sviluppo), `morgan`.
* **DB:** SQLite (script `schema.sql` e `seed.sql`).
* **Comunicazione:** REST JSON, fetch con `credentials: 'include'` (session cookie).
* **Timer & anti-cheat:** il server non invia l’intera frase finché non serve. Il **timer è autoritativo sul server** (stato derivato da `started_at`), il client mostra un countdown.
* **DevX:** ESLint + Prettier, npm scripts; nodemon lato server.

### Struttura repo

```
webapp-exam/
├─ client/
│  ├─ src/
│  │  ├─ api/            # wrapper fetch (sessions, matches, letters, butterfly)
│  │  ├─ components/     # Grid, Keyboard, Butterfly, Timer, Coins, Toaster
│  │  ├─ pages/          # Login, Home, Play (guest/logged), Match
│  │  ├─ context/        # AuthContext, MatchContext
│  │  ├─ hooks/
│  │  ├─ App.jsx
│  │  └─ main.jsx
│  └─ index.html
├─ server/
│  ├─ index.mjs          # avvio Express
│  ├─ app.mjs            # configurazione app
│  ├─ routes/            # routers REST (sessions, matches, butterfly)
│  ├─ controllers/
│  ├─ dao/               # accesso DB (users, sentences, matches, guesses)
│  ├─ auth/              # passport strategy + serialize/deserialize
│  ├─ middlewares/
│  ├─ sql/               # schema.sql, seed.sql
│  └─ db.sqlite
├─ docs/
└─ README.md
```

---

## 2) Timeline fino alla **deadline 2025-09-16 23:59** (Timezone: Europe/Rome)

**Oggi (2025-09-12) – Kickoff (2–3h)**

* Import template Classroom, setup repo, scripts e CORS in dev.
* Definisci **stato di gioco** e **macchina a stati** (ongoing|won|abandoned|timeout).
* Schema dati definitivo e `schema.sql`.

**2025-09-13 – API di base & DB (mezza giornata)**

* DAO: users, sentences, matches, guesses.
* Rotte sessione (`/api/sessions`).
* Rotte match: create/start, `GET /current`, guess letter, guess sentence, abandon.
* Computo costi lettere e vincolo “una vocale per match”.
* Seed: 3 utenti (coin 0 / alcune partite / zero partite), ≥20 frasi +3 guest.

**2025-09-14 – Frontend scheletro**

* Router, layout, Login/Home/Play/Match.
* `AuthContext`, `MatchContext`.
* Componenti: Grid (spazi già presenti), Coins, Timer (usa remaining dal server), Keyboard (blocca vocali dopo 1).
* Butterfly (10 lettere casuali + frequenza).

**2025-09-15 – Integrazione & regole gioco**

* Collega fetch; mostra costi lettera; doppio costo su miss; blocca se coins ≤0.
* Gestisci fine tempo (server → stato `timeout`, -20 o tutti i restanti).
* Mostra frase completa a fine match.

**2025-09-16 – QA, README, rifiniture**

* Validazioni (client+server), messaggi d’errore chiari, A11y base.
* Screenshot match in corso nel README, credenziali utenti.
* Tag `final` su ultimo commit, verifica clean install.

Buffer micro: sera del 15 per bugfix.

---

## 3) Contratto API (dettaglio)

**Autenticazione (sessione)**

* `POST /api/sessions` → `{ username, password }` → 200 `{id,name,coins}` (set-cookie) / 401.
* `GET /api/sessions/current` → 200 `{id,name,coins}` / 401.
* `DELETE /api/sessions/current` → 204.

**Match (utente loggato)**

* `POST /api/matches` → avvia nuovo match se `coins>0` e nessun match ongoing: 201 `{matchId, masked, spaces, coins, remaining, vowelUsed, guessedLetters, wrongLetters}`.
* `GET /api/matches/current` → stato corrente (o 404 se nessun match aperto). Il server calcola `remaining= max(0, 60 - now+started_at)` e chiude su 0.
* `POST /api/matches/current/guess-letter` body `{ letter }` → 200 con stato aggiornato. Regole:

  * costo = `cost(letter)` (vocale=10; consonanti 1–5 per frequenza).
  * se **miss**, costo raddoppia; se costo>coins ⇒ coins=0.
  * rivela tutte le occorrenze.
  * una sola vocale per match → 400 se seconda vocale.
  * se coins=0 ⇒ 403 nessun altro tentativo.
* `POST /api/matches/current/guess-sentence` body `{ sentence }` → se **esatta**: chiude `won`, `coins += 100`; altrimenti 200 con messaggio e match continua.
* `POST /api/matches/current/abandon` → chiude `abandoned` senza penalità → 204.
* **Chiusura per timeout** (server): al primo accesso dopo scadenza, chiude `timeout` e applica penalità `min(20, coins)`.

**Guest mode (non loggato)**

* `POST /api/guest/matches` → avvia match su una delle 3 frasi guest. Nessun coin, nessuna penalità/premio; stessa logica di reveal e timer.
* `GET /api/guest/matches/current`, `POST .../guess-letter`, `POST .../guess-sentence`, `POST .../abandon`.

**Butterfly**

* `GET /api/butterfly` → 200 `{ letters: [{ch:'A', freq:8.17}, ...] }` con **10 lettere casuali** (no duplicati) e relative frequenze.

> Tutte le risposte includono solo **informazioni strettamente necessarie**: la frase completa è inviata **solo** a match concluso.

---

## 4) Regole di costo lettere (proposta)

* **Vocali (A,E,I,O,U)**: 10.
* **Consonanti (5→1 per frequenza)**:

  * 5: R, S, T, N, L
  * 4: D, H, C, M
  * 3: F, G, Y, W, P, B
  * 2: V, K
  * 1: J, X, Q, Z

Mantieni le regole nel server (modulo `pricing.mjs`). Mostra una legenda costi nella UI.

---

## 5) Schema Dati (DDL proposta)

```sql
-- Utenti
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 100
);

-- Frasi
CREATE TABLE sentences (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('registered','guest'))
);

-- Match (sia loggati che guest). Per guest, user_id NULL e guest_token NOT NULL
CREATE TABLE matches (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NULL REFERENCES users(id),
  guest_token TEXT NULL,
  sentence_id INTEGER NOT NULL REFERENCES sentences(id),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('ongoing','won','abandoned','timeout')),
  vowel_used INTEGER NOT NULL DEFAULT 0,
  coins_start INTEGER NOT NULL,
  coins_end INTEGER,
  guessed_letters TEXT NOT NULL DEFAULT '', -- stringa di lettere uniche
  wrong_letters TEXT NOT NULL DEFAULT ''
);

-- Azioni di gioco (audit)
CREATE TABLE guesses (
  id INTEGER PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id),
  kind TEXT NOT NULL CHECK (kind IN ('letter','sentence')),
  letter TEXT,
  success INTEGER,
  cost INTEGER NOT NULL DEFAULT 0,
  proposed_sentence TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 6) Organizzazione UI/Router

**Rotte (desktop-first):**

* `/` Home: spiegazione gioco + CTA “Play as Guest” / “Login & Play”.
* `/login` Login con redirect al gioco.
* `/play` (protetta): stato corrente o bottone “New Match”.
* `/match/:id` Vista match: Grid, Keyboard con costi, Coins, Timer, form “Guess sentence”, Butterfly.
* `/guest` e `/guest/match/:id` per modalità anonima.

**Componenti principali:** Layout, Navbar (coins/utente), Grid (spazi già presenti), Keyboard (disabilita duplicate & 2a vocale), Timer (usa `remaining` dal server, aggiorna ogni secondo), Butterfly (10 lettere + freq), MessageArea/Toaster.

---

## 7) Validazioni & Sicurezza

* **Server**: `express-validator` su input; rate-limit soft (per endpoint guess); controllo stato match; blocco 2a vocale; chiusura per timeout lato server; non esporre `text` prima della fine.
* **Client**: disabilita tasti non validi (già usati, seconda vocale, quando coins=0), gestisci errori API, nessun reload pagina.
* **CORS dev**: consenti origin `http://localhost:5173`; cookie `httpOnly`; `secure` solo in prod.

---

## 8) README & consegna

* **Server-side**: elenco API con request/response, tabelle DB.
* **Client-side**: elenco rotte e componenti.
* **Overall**: screenshot match in corso; credenziali utenti seed.
* **Consegna**: niente `node_modules`; test clean install; tag **`final`** pushato.

---

## 9) Prossimi passi

1. Confermare questa bozza (o inviami un esame passato da usare come check di qualità).
2. Generare scheletro project (client/server) e file `schema.sql`/`seed.sql`.
3. Implementare API `sessions` + `matches` con regole di gioco.
4. Implementare UI Match + Butterfly, integrare fetch e countdown.
