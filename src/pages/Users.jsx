import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { genPassword, ROLE_LABEL } from '../lib/util'

export async function callCreateUsers(users) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ users }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Greška servera')
  return json.results
}

export default function Users({ profile }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ fullName: '', email: '', role: 'roditelj', password: genPassword() })
  const [msg, setMsg] = useState('')
  const [created, setCreated] = useState(null)
  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data || [])
  }
  useEffect(() => { load() }, [])

  async function add(e) {
    e.preventDefault(); setMsg('')
    try {
      const [r] = await callCreateUsers([form])
      if (!r.ok) throw new Error(r.error)
      setCreated({ email: form.email, password: form.password })
      setForm({ fullName: '', email: '', role: 'roditelj', password: genPassword() }); load()
    } catch (err) { setMsg('❌ ' + err.message) }
  }
  async function setRole(id, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) alert(error.message); load()
  }
  return (
    <>
      <h2>Korisnici</h2>
      <form className="card" onSubmit={add}>
        <div className="row">
          <label>Ime i prezime<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Uloga
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>Lozinka<input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></label>
        </div>
        {msg && <p className="err">{msg}</p>}
        {created && <p className="ok">✅ Kreirano. Pošalji korisniku: <b>{created.email}</b> / <b>{created.password}</b></p>}
        <button className="primary">Kreiraj korisnika</button>
      </form>
      <table className="card">
        <thead><tr><th>Ime</th><th>Telefon</th><th>Uloga</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.full_name}</td><td>{u.phone || '—'}</td>
              <td>
                <select value={u.role} disabled={u.id === profile.id} onChange={(e) => setRole(u.id, e.target.value)}>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
