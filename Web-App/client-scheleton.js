// client/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// "Alice in Wonderland" quote:
// "Curiouser and curiouser!"


// client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext.jsx'
import * as API from './api.js'
import NavBar from './components/NavBar.jsx'
import Home from './pages/Home.jsx'
import LoginPage from './pages/LoginPage.jsx'
import GameScreen from './pages/GameScreen.jsx'

export default function App(){
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell/>
      </BrowserRouter>
    </AuthProvider>
  )
}

function Shell(){
  const { user, refreshSession } = useAuth()
  useEffect(()=>{ refreshSession() },[])
  return (
    <div className="container-fluid p-3">
      <NavBar/>
      <Routes>
        <Route index element={<Home/>}/>
        <Route path="/login" element={ user ? <Navigate to="/"/> : <LoginPage/> }/>
        <Route path="/play" element={ user ? <GameScreen mode="logged"/> : <Navigate to="/login"/> }/>
        <Route path="/anon" element={<GameScreen mode="anon"/>}/>
        <Route path="*" element={<h3>Not found</h3>} />
      </Routes>
    </div>
  )
}

// "Alice in Wonderland" quote:
// "We're all mad here."


// client/src/auth/AuthContext.jsx
import { createContext, useContext, useMemo, useState } from 'react'
import * as API from '../api.js'

const Ctx = createContext(null)
export function AuthProvider({ children }){
  const [user, setUser] = useState(null)
  async function login(credentials){ const u = await API.login(credentials); setUser(u); return u }
  async function logout(){ await API.logout(); setUser(null) }
  async function refreshSession(){ const u = await API.getSession(); setUser(u) }
  const value = useMemo(()=>({ user, login, logout, refreshSession }),[user])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useAuth = ()=> useContext(Ctx)

// "Alice in Wonderland" quote:
// "It’s no use going back to yesterday, because I was a different person then."


// client/src/api.js
const BASE = 'http://localhost:3001'

async function j(r){ if(!r.ok){ let e; try{ e=await r.json() }catch{ e={error:r.statusText} } throw e } return r.json() }

export async function login({username,password}){
  const r = await fetch(BASE+'/api/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})})
  return j(r)
}
export async function logout(){ await fetch(BASE+'/api/logout',{method:'POST',credentials:'include'}) }
export async function getSession(){ const r= await fetch(BASE+'/api/session',{credentials:'include'}); return r.ok? r.json(): null }

// Gameplay (logged)
export async function startMatch(){ const r = await fetch(BASE+'/api/matches',{method:'POST',credentials:'include'}); return j(r) }
export async function getMatch(id){ const r = await fetch(`${BASE}/api/matches/${id}`,{credentials:'include'}); return j(r) }
export async function guessLetter(id, letter){ const r = await fetch(`${BASE}/api/matches/${id}/guess-letter`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({letter})}); return j(r) }
export async function guessSentence(id, sentence){ const r = await fetch(`${BASE}/api/matches/${id}/guess-sentence`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({sentence})}); return j(r) }
export async function abandon(id){ const r = await fetch(`${BASE}/api/matches/${id}/abandon`,{method:'POST',credentials:'include'}); return j(r) }

// Gameplay (anonymous)
export async function startMatchAnon(){ const r = await fetch(BASE+'/api/anon/matches',{method:'POST'}); return j(r) }
export async function getMatchAnon(id){ const r = await fetch(`${BASE}/api/anon/matches/${id}`); return j(r) }
export async function guessLetterAnon(id, letter){ const r = await fetch(`${BASE}/api/anon/matches/${id}/guess-letter`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({letter})}); return j(r) }
export async function guessSentenceAnon(id, sentence){ const r = await fetch(`${BASE}/api/anon/matches/${id}/guess-sentence`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sentence})}); return j(r) }
export async function abandonAnon(id){ const r = await fetch(`${BASE}/api/anon/matches/${id}/abandon`,{method:'POST'}); return j(r) }

export async function getButterfly(){ const r = await fetch(BASE+'/api/butterfly'); return j(r) }

// "Alice in Wonderland" quote:
// "Who in the world am I? Ah, that's the great puzzle."


// client/src/components/NavBar.jsx
import { Navbar, Nav, Button } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function NavBar(){
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <Navbar bg="dark" variant="dark" expand="sm" className="px-3 mb-3 rounded-3">
      <Navbar.Brand as={Link} to="/">Guess a Sentence</Navbar.Brand>
      <Nav className="ms-auto">
        {user ? (
          <>
            <Button variant="outline-light" className="me-2" onClick={()=>navigate('/play')}>Play</Button>
            <Button variant="outline-warning" onClick={logout}>Logout</Button>
          </>
        ) : (
          <>
            <Button variant="outline-light" className="me-2" as={Link} to="/anon">Try Anon</Button>
            <Button variant="warning" as={Link} to="/login">Login</Button>
          </>
        )}
      </Nav>
    </Navbar>
  )
}

// "Alice in Wonderland" quote:
// "Why, sometimes I've believed as many as six impossible things before breakfast."


// client/src/pages/Home.jsx
import { useAuth } from '../auth/AuthContext.jsx'
import { Link } from 'react-router-dom'
export default function Home(){
  const { user } = useAuth()
  return (
    <div className="p-3">
      <h2>Welcome {user? user.username : 'stranger'}</h2>
      <p>Play the game by guessing letters (with costs) or the full sentence in 60 seconds.</p>
      <div className="d-flex gap-2">
        {user && <Link className="btn btn-primary" to="/play">Play (logged)</Link>}
        <Link className="btn btn-outline-secondary" to="/anon">Play as Guest</Link>
      </div>
    </div>
  )
}

// "Alice in Wonderland" quote:
// "It would be so nice if something made sense for a change."


// client/src/pages/LoginPage.jsx
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function LoginPage(){
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const [err,setErr] = useState('')
  const { login } = useAuth()
  const nav = useNavigate()
  async function submit(e){
    e.preventDefault(); setErr('')
    try{ await login({username,password}); nav('/play') }catch(e){ setErr(e?.error||'Login failed') }
  }
  return (
    <form className="p-3" onSubmit={submit}>
      <h3>Login</h3>
      {err && <div className="alert alert-danger">{err}</div>}
      <div className="mb-2"><label className="form-label">Email</label><input className="form-control" type="email" value={username} onChange={e=>setUsername(e.target.value)} required/></div>
      <div className="mb-3"><label className="form-label">Password</label><input className="form-control" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>
      <button className="btn btn-primary" type="submit">Login</button>
    </form>
  )
}

// "Alice in Wonderland" quote:
// "Who in the world am I?"


// client/src/pages/GameScreen.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import * as API from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function GameScreen({ mode }){
  const [match,setMatch] = useState(null)
  const [input,setInput] = useState('')
  const [error,setError] = useState('')
  const poll = useRef(null)
  const anon = mode==='anon'

  useEffect(()=>{
    async function boot(){
      setError('')
      const m = anon? await API.startMatchAnon() : await API.startMatch()
      setMatch(m)
    }
    boot()
    return ()=>{ if(poll.current) clearInterval(poll.current) }
  },[mode])

  useEffect(()=>{
    if(!match) return
    // poll every 500ms to reflect server-side timeout/state
    poll.current = setInterval(async()=>{
      try{
        const updated = anon? await API.getMatchAnon(match.matchId) : await API.getMatch(match.matchId)
        setMatch(updated)
        if(updated.status !== 'running') { clearInterval(poll.current) }
      }catch(e){ setError(e?.error||'Network error') }
    },500)
    return ()=> clearInterval(poll.current)
  },[match?.matchId])

  const costs = match?.letterCosts || {}
  const revealedSet = useMemo(()=> new Set(match?.grid?.filter(ch=>/[A-Z]/.test(ch))), [match])
  const timeLeft = Math.max(0, (match?.deadline||0) - Date.now())

  async function onPick(L){
    if(!match || match.status!=='running') return
    try{
      const upd = anon? await API.guessLetterAnon(match.matchId,L) : await API.guessLetter(match.matchId,L)
      setMatch(upd)
    }catch(e){ setError(e?.error||'Invalid guess') }
  }
  async function onGuessSentence(){
    try{
      const upd = anon? await API.guessSentenceAnon(match.matchId,input) : await API.guessSentence(match.matchId,input)
      setMatch(upd); setInput('')
    }catch(e){ setError(e?.error||'Invalid sentence') }
  }
  async function onAbandon(){
    const upd = anon? await API.abandonAnon(match.matchId) : await API.abandon(match.matchId)
    setMatch(upd)
  }

  if(!match) return <p>Loading match…</p>

  return (
    <div className="p-2">
      {error && <div className="alert alert-warning">{error}</div>}
      <h4>Status: {match.status}</h4>
      <p>Time left: {(timeLeft/1000).toFixed(1)}s</p>
      {match.remainingCoins!==null && <p>Coins: {match.remainingCoins}</p>}
      <Board grid={match.grid}/>
      {match.status==='running' && (
        <>
          <LetterPicker costs={costs} revealedSet={revealedSet} vowelUsed={match.vowelUsed} coins={match.remainingCoins} onPick={onPick}/>
          <div className="input-group my-3" style={{maxWidth:600}}>
            <input className="form-control" value={input} onChange={e=>setInput(e.target.value)} placeholder="Guess the sentence"/>
            <button className="btn btn-primary" onClick={onGuessSentence}>Guess</button>
            <button className="btn btn-outline-danger" onClick={onAbandon}>Abandon</button>
          </div>
        </>
      )}
      {match.status!=='running' && match.sentence && (
        <div className="alert alert-info" style={{maxWidth:700}}>
          <b>Solution:</b> {match.sentence}
        </div>
      )}
      <Butterfly/>
    </div>
  )
}

function Board({ grid }){
  return (
    <div className="d-flex flex-wrap gap-1 mb-3" style={{maxWidth: 900}}>
      {grid.map((ch,i)=> (
        <span key={i} className="border rounded px-2 py-1 bg-light">{ch===' ' ? '\u00A0' : ch}</span>
      ))}
    </div>
  )
}

function LetterPicker({ costs, revealedSet, vowelUsed, coins, onPick }){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  return (
    <div className="d-flex flex-wrap gap-1" style={{maxWidth: 900}}>
      {letters.map(L=>{
        const isVowel = 'AEIOU'.includes(L)
        const disabled = revealedSet.has(L) || (isVowel && vowelUsed) || (coins!==null && coins<=0)
        const title = `Cost: ${costs[L] ?? (isVowel?10:1)}`
        return <button key={L} className="btn btn-sm btn-outline-secondary" disabled={disabled} onClick={()=>onPick(L)} title={title}>{L} ({costs[L] ?? (isVowel?10:1)})</button>
      })}
    </div>
  )
}

function Butterfly(){
  const [letters,setLetters] = useState([])
  useEffect(()=>{ (async()=>{ try{ setLetters(await API.getButterfly()) }catch{} })() },[])
  return (
    <div className="mt-4" style={{maxWidth: 600}}>
      <h5>Butterfly</h5>
      <p className="text-muted">10 randomly selected letters with frequency</p>
      <div className="d-flex flex-wrap gap-2">
        {letters.map(({letter,freq})=> (
          <span key={letter} className="badge bg-secondary">{letter}: {freq}</span>
        ))}
      </div>
    </div>
  )
}

// "Alice in Wonderland" quote:
// "Begin at the beginning," the King said, very gravely, "and go on till you come to the end: then stop."


// client/src/index.css
body{ background:#f7f7fb }
.container-fluid{ max-width: 1200px }

/* "Alice in Wonderland" quote:
"Why, sometimes I've believed as many as six impossible things before breakfast." */
