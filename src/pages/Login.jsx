import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ error: initial }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initial || '')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Pogrešan email ili lozinka.')
    setBusy(false)
  }
  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <h1>🏫 Vrtić admin</h1>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
        <label>Lozinka<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="err">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Prijava…' : 'Prijava'}</button>
      </form>
    </div>
  )
}
