# server/index.js
'use strict';

// Minimal Express + Passport + Session + CORS skeleton
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const SQLiteStoreFactory = require('connect-sqlite3');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const crypto = require('crypto');

const db = require('./src/db');
const Users = require('./src/dao/users-dao');
const Game = require('./src/dao/game-dao');
const { validate, schemas } = require('./src/validate');

const app = express();
const PORT = 3001;

app.use(morgan('dev'));
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// --- Session + Passport
const SQLiteStore = SQLiteStoreFactory(session);
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './db' }),
  secret: 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true },
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await Users.getUser(username, password); // verifies scrypt hash
    return done(null, user);
  } catch (err) {
    return done(null, false, { message: 'Invalid credentials' });
  }
}));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const u = await Users.getUserById(id);
    done(null, u);
  } catch (e) { done(e); }
});

const isLoggedIn = (req, res, next) => req.isAuthenticated() ? next() : res.status(401).json({ error: 'Not authenticated' });

// --- Auth
app.post('/api/login', validate(schemas.login), passport.authenticate('local'), (req, res) => res.json(req.user));
app.get('/api/session', (req, res) => res.json(req.user ?? null));
app.post('/api/logout', (req, res) => req.logout(() => res.status(204).end()));

// --- Profile (coins)
app.get('/api/profile', isLoggedIn, async (req, res) => {
  const profile = await Users.getProfile(req.user.id);
  res.json(profile);
});

// --- Gameplay (logged)
app.post('/api/matches', isLoggedIn, async (req, res, next) => {
  try { res.json(await Game.startMatch(req.user.id)); } catch (e) { next(e); }
});
app.get('/api/matches/:id', isLoggedIn, validate(schemas.idParam, 'params'), async (req, res, next) => {
  try { res.json(await Game.getMatch(+req.params.id, req.user.id)); } catch (e) { next(e); }
});
app.post('/api/matches/:id/guess-letter', isLoggedIn,
  validate(schemas.idParam, 'params'), validate(schemas.guessLetter),
  async (req, res, next) => { try { res.json(await Game.guessLetter(+req.params.id, req.user.id, req.body.letter)); } catch (e) { next(e); } });
app.post('/api/matches/:id/guess-sentence', isLoggedIn,
  validate(schemas.idParam, 'params'), validate(schemas.guessSentence),
  async (req, res, next) => { try { res.json(await Game.guessSentence(+req.params.id, req.user.id, req.body.sentence)); } catch (e) { next(e); } });
app.post('/api/matches/:id/abandon', isLoggedIn, validate(schemas.idParam, 'params'),
  async (req, res, next) => { try { res.json(await Game.abandon(+req.params.id, req.user.id)); } catch (e) { next(e); } });

// --- Anonymous mode
app.post('/api/anon/matches', async (req, res, next) => { try { res.json(await Game.startMatch(null, true)); } catch (e) { next(e); } });
app.get('/api/anon/matches/:id', validate(schemas.idParam, 'params'), async (req, res, next) => { try { res.json(await Game.getMatch(+req.params.id, null, true)); } catch (e) { next(e); } });
app.post('/api/anon/matches/:id/guess-letter', validate(schemas.idParam, 'params'), validate(schemas.guessLetter), async (req, res, next) => { try { res.json(await Game.guessLetter(+req.params.id, null, req.body.letter, true)); } catch (e) { next(e); } });
app.post('/api/anon/matches/:id/guess-sentence', validate(schemas.idParam, 'params'), validate(schemas.guessSentence), async (req, res, next) => { try { res.json(await Game.guessSentence(+req.params.id, null, req.body.sentence, true)); } catch (e) { next(e); } });
app.post('/api/anon/matches/:id/abandon', validate(schemas.idParam, 'params'), async (req, res, next) => { try { res.json(await Game.abandon(+req.params.id, null, true)); } catch (e) { next(e); } });

// --- Butterfly
const { freq10 } = require('./src/letters');
app.get('/api/butterfly', (req, res) => res.json(freq10()));

// --- Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'bad_request' });
});

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));

// "Alice in Wonderland" quote:
// "Curiouser and curiouser!"


# server/src/db.js
'use strict';
const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'db');
const DB_FILE = path.join(DB_DIR, 'game.db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new sqlite3.Database(DB_FILE, (err) => { if (err) throw err; });
module.exports = db;

// "Alice in Wonderland" quote:
// "We're all mad here."


# server/src/dao/users-dao.js
'use strict';
const crypto = require('crypto');
const db = require('../db');

function getUserById(id){
  return new Promise((resolve,reject)=>{
    db.get('SELECT id, username, name, coins FROM users WHERE id=?', [id], (err,row)=>{
      if(err) reject(err); else resolve(row);
    });
  });
}

function getUser(username, password){
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username=?', [username], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject(new Error('Invalid username or password'));
      crypto.scrypt(password, row.salt, 32, (err2, hash) => {
        if (err2) return reject(err2);
        const ok = crypto.timingSafeEqual(hash, Buffer.from(row.hash, 'hex'));
        if (!ok) return reject(new Error('Invalid username or password'));
        resolve({ id: row.id, username: row.username, name: row.name, coins: row.coins });
      });
    });
  });
}

function getProfile(id){ return getUserById(id); }

module.exports = { getUser, getUserById, getProfile };

// "Alice in Wonderland" quote:
// "It’s no use going back to yesterday, because I was a different person then."


# server/src/dao/game-dao.js
'use strict';
const db = require('../db');
const { LETTER_COSTS, isVowel, maskForClient } = require('../letters');

const ONE_MIN = 60_000;

function pickSentence(mode){
  return new Promise((resolve,reject)=>{
    db.get('SELECT id, text FROM sentences WHERE mode=? ORDER BY RANDOM() LIMIT 1', [mode], (err,row)=>{
      if(err) reject(err); else resolve(row);
    });
  });
}

async function startMatch(userId, anon=false){
  const s = await pickSentence(anon ? 'anon' : 'logged');
  const now = Date.now();
  return new Promise((resolve, reject)=>{
    db.run('INSERT INTO matches(user_id, sentence_id, started_at, status, revealed, vowel_used, remaining_coins) VALUES(?,?,?,?,?,?,?)',
      [userId, s.id, now, 'running', '', 0, null], function(err){
        if(err) reject(err); else {
          resolve({ matchId: this.lastID, grid: maskForClient(s.text, []), deadline: now + ONE_MIN, status: 'running', remainingCoins: null, vowelUsed: false });
        }
      });
  });
}

// NOTE: Implement full logic later. For now, stubs are provided to let you wire the client.
async function getMatch(id, userId, anon=false){
  return new Promise((resolve,reject)=>{
    db.get('SELECT m.*, s.text FROM matches m JOIN sentences s ON s.id=m.sentence_id WHERE m.id=?', [id], (err,row)=>{
      if(err) return reject(err);
      if(!row) return reject(new Error('not found'));
      const mask = maskForClient(row.text, (row.revealed||'').split(',').filter(Boolean));
      const payload = { matchId: row.id, grid: mask, deadline: row.started_at + ONE_MIN, status: row.status, remainingCoins: row.remaining_coins, vowelUsed: !!row.vowel_used };
      if(row.status!=='running') payload.sentence = row.text.toUpperCase();
      resolve(payload);
    });
  });
}

async function guessLetter(id, userId, letter, anon=false){ throw new Error('TODO: implement guessLetter'); }
async function guessSentence(id, userId, sentence, anon=false){ throw new Error('TODO: implement guessSentence'); }
async function abandon(id, userId, anon=false){ throw new Error('TODO: implement abandon'); }

module.exports = { startMatch, getMatch, guessLetter, guessSentence, abandon };

// "Alice in Wonderland" quote:
// "Begin at the beginning," the King said, very gravely, "and go on till you come to the end: then stop."


# server/src/letters.js
'use strict';

const VOWELS = new Set(['A','E','I','O','U']);
const LETTER_COSTS = Object.assign(Object.create(null), {
  A:10, E:10, I:10, O:10, U:10,
  T:5, N:5, S:5, R:5, H:5, D:5, L:5,
  C:4, M:4, F:4, G:4, P:4,
  B:3, Y:3, W:3,
  K:2, V:2,
  X:1, J:1, Q:1, Z:1,
});

function isVowel(L){ return VOWELS.has(L); }
function maskForClient(sentence, revealedArr){
  const revealed = new Set(revealedArr.map(c=>c.toUpperCase()));
  const up = sentence.toUpperCase();
  return [...up].map(ch => ch===' ' ? ' ' : (revealed.has(ch) ? ch : '_'));
}

function freq10(){
  const FREQ = [ ['E',12.7],['T',9.1],['A',8.2],['O',7.5],['I',7.0],['N',6.7],['S',6.3],['H',6.1],['R',6.0],['D',4.3],['L',4.0],['C',2.8],['U',2.8],['M',2.4],['W',2.4],['F',2.2],['G',2.0],['Y',2.0],['P',1.9],['B',1.5],['V',1.0],['K',0.8],['J',0.15],['X',0.15],['Q',0.1],['Z',0.07] ];
  const shuffled = [...FREQ].sort(()=>Math.random()-0.5).slice(0,10);
  return shuffled.map(([letter,freq])=>({letter,freq}));
}

module.exports = { LETTER_COSTS, isVowel, maskForClient, freq10 };

// "Alice in Wonderland" quote:
// "Who in the world am I? Ah, that's the great puzzle."


# server/src/validate.js
'use strict';
const { z } = require('zod');

const schemas = {
  login: z.object({ username: z.string().trim().min(3).max(64), password: z.string().min(1).max(128) }),
  idParam: z.object({ id: z.string().regex(/^\d+$/).transform(Number) }),
  guessLetter: z.object({ letter: z.string().trim().length(1).transform(s=>s.toUpperCase()).refine(s=>/^[A-Z]$/.test(s), 'letter must be A..Z') }),
  guessSentence: z.object({ sentence: z.string().trim().min(1).max(100).refine(s=>/^[A-Za-z ]+$/.test(s), 'only letters and spaces') }),
};

function validate(schema, where='body'){
  return (req,res,next)=>{
    const data = where==='params' ? req.params : where==='query' ? req.query : req.body;
    const r = schema.safeParse(data);
    if(!r.success) return res.status(400).json({ error:'validation_error', details: r.error.issues });
    if(where==='params') req.params = r.data; else if(where==='query') req.query = r.data; else req.body = r.data;
    next();
  };
}

module.exports = { validate, schemas };

// "Alice in Wonderland" quote:
// "It was much pleasanter at home, when one wasn't always growing larger and smaller."


# server/db/init.sql
-- SQLite schema & seed for Guess-a-Sentence
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS sentences (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('logged','anon')),
  len INTEGER GENERATED ALWAYS AS (length(text)) VIRTUAL
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  sentence_id INTEGER NOT NULL REFERENCES sentences(id),
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  status TEXT NOT NULL CHECK(status IN ('running','won','abandoned','timeout')),
  revealed TEXT NOT NULL DEFAULT '',
  vowel_used INTEGER NOT NULL DEFAULT 0 CHECK(vowel_used IN (0,1)),
  remaining_coins INTEGER
);

-- Minimal seed (replace salts/hashes in real project)
INSERT OR IGNORE INTO users(id,username,name,salt,hash,coins) VALUES
  (1,'alice@example.com','Alice','salt1','c0ffee',100),
  (2,'bob@example.com','Bob','salt2','c0ffee',0),
  (3,'carol@example.com','Carol','salt3','c0ffee',75);

INSERT OR IGNORE INTO sentences(id,text,mode) VALUES
  (1,'THE QUICK BROWN FOX JUMPS OVER LAZY DOGS','logged'),
  (2,'MANY HANDS MAKE LIGHT WORK AND HAPPY TEAMS','logged'),
  (3,'PRACTICE MAKES PERFECT KEEP CALM AND CODE ON','logged'),
  (101,'HAVE A NICE DAY AND ENJOY THIS SIMPLE GAME','anon'),
  (102,'TRY YOUR BEST TO GUESS THIS SHORT SENTENCE','anon'),
  (103,'FUN TIMES AHEAD KEEP GUESSING LETTERS NOW','anon');

-- "Alice in Wonderland" quote:
-- "Why, sometimes I've believed as many as six impossible things before breakfast."
