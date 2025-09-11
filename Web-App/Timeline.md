Perfetto, iniziamo a lavorare in modo “da esame”. Qui sotto trovi una timeline concreta (fino alla deadline del **16/09 23:59**), l’approccio architetturale, uno **schema DB + API** di riferimento e i punti di validazione. Se vuoi, nel prossimo messaggio posso generarti gli stub di progetto (server `index.mjs`, `dao.js`, schema SQL e scaffolding React) già pronti per partire.

# Timeline (realistica per 4–5 giorni)

**Giorno 1 — Setup & design**

* Clona repo dell’assignment, verifica i due comandi di avvio richiesti.
* Crea struttura **two servers**: `server/` (Express+SQLite) e `client/` (React 19). Configura **CORS con credenziali** sul server e `fetch(..., {credentials:'include'})` sul client. &#x20;
* Progetta **DB** (utenti, frasi, partite, tentativi). Scrivi SQL “create+seed”: 3 utenti come da traccia (uno a 0 giochi, uno a monete esaurite, uno “normale”).
* Stendi la **bozza API** (vedi sotto) e gli **stati di match**.

**Giorno 2 — Autenticazione + profilo**

* Implementa **Passport Local** con sessione e `express-session` (cookie httpOnly; in dev anche non-secure). Rotte: `POST /api/login`, `GET /api/session` (me), `POST /api/logout`. Proteggi le API con middleware `isLoggedIn`.&#x20;
* Implementa profilo: `GET /api/profile` (monete correnti).

**Giorno 3 — Core gioco (server)**

* `POST /api/matches` (start): seleziona frase 30–50 char, imposta **scadenza a +60s**, stato iniziale (mask + posizioni degli spazi).
* `POST /api/matches/:id/guess-letter`: applica **costo per lettera** (mostrato al client), **raddoppio se assente**, **un’unica vocale per match**, non far mai scendere le monete sotto 0.
* `POST /api/matches/:id/guess-sentence`: vittoria → +100 monete, match chiuso.
* `POST /api/matches/:id/abandon`: chiude senza penalità.
* **Timeout server-side**: se `now() > ends_at` all’accesso successivo o via job, chiudi match con **–20** (o fino ad azzerare).
* `GET /api/matches/:id`: stato corrente (mask, seconds left), **senza mai inviare la frase completa** finché il match non è finito (evita “cheating”).
* `GET /api/butterfly`: 10 lettere casuali + frequenza.

**Giorno 4 — Front-end SPA**

* Setup **Router**: rotte `/, /login, /play, /anon, /result`.&#x20;
* **AuthContext**: login/logout, `useEffect` su `/api/session` per persistenza.&#x20;
* Schermata di gioco: griglia mascherata, **timer 60s**, tastiera con **costo lettera visibile**, badge “vocale già usata”, barra monete, componente **Butterfly**.
* Modal “indovina frase” (nessun costo).
* Versione **anonima**: 3 frasi dedicate, nessuna moneta (API separate o flag).

**Giorno 5 — Rifiniture & consegna**

* Validazioni (client+server), gestione errori fetch (`response.ok`, tipi conteuti), toast UX.&#x20;
* README: API, tabelle DB, rotte React, componenti, screenshot partita in corso, credenziali utenti.
* Seed: >=20 frasi (oltre alle 3 per anonimo).
* `git tag final` e test con i comandi della traccia.

---

# Architettura consigliata

* **Two servers** in sviluppo: React dev server su `:5173`, Express su `:3000`, CORS con `credentials:true` e `origin:'http://localhost:5173'`; lato client **tutte** le fetch con `{ credentials: 'include' }`. &#x20;
* **Session-based auth** con Passport: cookie httpOnly, `serializeUser/deserializeUser`, `isLoggedIn` su rotte protette.&#x20;
* **React Router** per pagine e stato di navigazione; `useNavigate`, `useParams`.&#x20;
* **Fetch**: gestisci errori controllando `response.ok`, poi `.json()`, con `catch` per errori di rete.&#x20;

---

# Schema dati (SQLite)

**users**(id PK, email UNIQUE, name, salt, password\_hash, coins INTEGER NOT NULL)
**sentences**(id PK, text TEXT NOT NULL, mode TEXT CHECK(mode IN ('logged','anon')), length INTEGER)
**matches**(
  id PK, user\_id FK NULL (NULL per anon), sentence\_id FK,
  status TEXT CHECK(status IN ('running','won','lost','abandoned','timeout')),
  started\_at INTEGER, ends\_at INTEGER,
  mask TEXT, vowel\_used INTEGER DEFAULT 0, coins\_spent INTEGER DEFAULT 0
)
**guesses**(id PK, match\_id FK, tstamp INTEGER, kind TEXT CHECK(kind IN ('letter','sentence')), letter TEXT NULL, correct INTEGER NULL, cost INTEGER DEFAULT 0, proposal TEXT NULL)

> Nota: le **monete** stanno in `users.coins`; ogni esito aggiorna atomically il saldo. Il server **enforce** tutte le regole (tempo, costi, 1 vocale) — il client è solo UI.

---

# Bozza API (HTTP, JSON)

**Auth**

* `POST /api/login` {username,password} → 200 + user, set-cookie (session).&#x20;
* `GET /api/session` → user (se loggato), 401 altrimenti.
* `POST /api/logout` → 204.&#x20;

**Profilo**

* `GET /api/profile` → {coins, name, email} (protetta).

**Gioco (logged)**

* `POST /api/matches` → {id, mask, endsAt, coins, costsByLetter, vowelUsed\:false}
* `POST /api/matches/:id/guess-letter` {letter} → {mask, hits:\[idx...], coins, vowelUsed}
* `POST /api/matches/:id/guess-sentence` {sentence} → {result:'win'|'continue', coins, finalSentence?}
* `POST /api/matches/:id/abandon` → {status:'abandoned', finalSentence}
* `GET  /api/matches/:id` → stato corrente (senza rivelare la frase se non finita)

**Gioco (anon)**

* `POST /api/anon/matches` / `POST /api/anon/matches/:id/...` — stesse forme ma **senza monete**.

**Extra**

* `GET /api/butterfly` → \[{letter, freq}] (10 elementi casuali)

---

# Costi lettere & regole server

* Mappa costi mostrata in UI e applicata **server-side** (vocali **10**; consonanti da **5** a **1** in base alla frequenza — definisci una tabella fissa).
* Lettera assente → **costo raddoppiato** (clampi a 0 le monete se vai in negativo).
* **Una sola vocale per match**: rifiuta la seconda con 400 + messaggio.
* Timer: salva `ends_at` nel match. Se scaduto → status `timeout` e **–20** (o azzera se <20).
* “Indovina frase” non costa nulla; confronto **case-insensitive**; in caso di vittoria mostra frase completa.

---

# Front-end (React 19)

**Router & schermate**
`/` (home), `/login`, `/play` (logged), `/anon` (ospite), `/result/:id`.

**Componenti chiave**

* `GameScreen`: griglia (`mask`), tastiera con prezzi, badge vocale, barra monete, input tentativo frase, **timer 60s**.
* `Butterfly`: 10 lettere + frequenza (random).
* `AuthContext`: stato utente (login/logout, `getUserInfo` su mount).&#x20;
* Form: controllati o **useActionState** per ridurre boilerplate.&#x20;

**Fetch helper**

* Wrapper `api.js` con `fetch(url, {credentials:'include'})`, check `response.ok` e parse JSON; gestione errori centralizzata.&#x20;

---

# Validazione (client + server)

* **Server (Express)**: valida input con schema (lettera `^[A-Za-z]$`, frase 30–50 char, matchId numerico), rifiuta richieste su match chiuso/scaduto, controlla saldo e regole.
* **Client (React)**: disabilita tasti quando monete insufficienti, blocca seconda vocale, mostra costo prima del click, evidenzia errori di rete/validazione con messaggi chiari.
* **Sicurezza**: **mai** inviare la frase completa finché il match è “running”; usa cookie **httpOnly** e CORS con `credentials` (in dev).&#x20;

---

# Cosa ancora mi sarebbe utile da te

* (Se li hai) **slide finali** del corso + un **progetto d’esempio** dello scorso anno.
* L’**elenco di 20+ frasi** (30–50 char) che vuoi usare e la **tabella prezzi** delle consonanti (posso proporti una default).
* Eventuali preferenze UI (React-Bootstrap sì/no).

Vuoi che ti generi subito:

1. schema SQL + seed utenti/frasi,
2. `index.mjs` (Express + Passport + CORS + sessioni),
3. `api.js` client + skeleton `App.jsx` con Router e `AuthContext`?

Dimmi “vai con gli stub” e li preparo in un colpo solo.
