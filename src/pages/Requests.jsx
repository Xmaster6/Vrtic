import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmtDate } from '../lib/util'

export default function Requests() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const load = async () => {
    const { data } = await supabase.from('child_parent_requests')
      .select('id, status, created_at, children(full_name), profiles:parent_id(full_name, phone)')
      .eq('status', 'pending').order('created_at')
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  async function approve(id) {
    const { error } = await supabase.rpc('approve_parent_request', { request_id: id })
    if (error) setErr(error.message); else load()
  }
  async function reject(id) {
    await supabase.from('child_parent_requests').update({ status: 'rejected' }).eq('id', id); load()
  }
  return (
    <>
      <h2>Zahtjevi roditelja</h2>
      {err && <p className="err">{err}</p>}
      {rows.length === 0 && <p className="muted">Nema zahtjeva na čekanju. 🎉</p>}
      {rows.map((r) => (
        <div className="card row between" key={r.id}>
          <div>
            <strong>{r.profiles?.full_name}</strong> traži povezivanje s djetetom <strong>{r.children?.full_name}</strong>
            <br /><small>{r.profiles?.phone || ''} · {fmtDate(r.created_at)}</small>
          </div>
          <div>
            <button className="primary" onClick={() => approve(r.id)}>Odobri</button>{' '}
            <button className="link danger" onClick={() => reject(r.id)}>Odbij</button>
          </div>
        </div>
      ))}
    </>
  )
}
