import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { genPassword, parseCsv } from '../lib/util'
import { callCreateUsers } from './Users.jsx'

export default function Import({ profile }) {
  const [rows, setRows] = useState([])
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e) {
    const f = e.target.files[0]; if (!f) return
    setRows(parseCsv(await f.text())); setReport(null)
  }

  async function run() {
    setBusy(true)
    const { data: groups } = await supabase.from('groups').select('id,name')
    const gid = (n) => groups.find((g) => g.name.toLowerCase() === (n || '').toLowerCase())?.id || null
    const out = []
    // 1) djeca (jedno dijete po retku, deduplikacija po imenu)
    const childIds = {}
    for (const r of rows) {
      const name = r.dijete; if (!name || childIds[name.toLowerCase()]) continue
      const { data, error } = await supabase.from('children').insert({
        kindergarten_id: profile.kindergarten_id, full_name: name,
        birth_date: r.datum_rodenja || null, group_id: gid(r.grupa),
      }).select().single()
      if (error) out.push({ what: `Dijete ${name}`, ok: false, error: error.message })
      else { childIds[name.toLowerCase()] = data.id; out.push({ what: `Dijete ${name}`, ok: true }) }
    }
    // 2) roditelji (+ veza s djetetom + generirana lozinka)
    const parents = rows.filter((r) => r.roditelj && r.email).map((r) => ({
      fullName: r.roditelj, email: r.email, phone: r.telefon, role: 'roditelj',
      password: genPassword(), childId: childIds[(r.dijete || '').toLowerCase()],
    }))
    const creds = []
    for (let i = 0; i < parents.length; i += 50) {
      const chunk = parents.slice(i, i + 50)
      try {
        const res = await callCreateUsers(chunk)
        res.forEach((x, j) => {
          out.push({ what: `Roditelj ${x.email}`, ok: x.ok, error: x.error })
          if (x.ok) creds.push({ ime: chunk[j].fullName, email: chunk[j].email, lozinka: chunk[j].password })
        })
      } catch (err) { out.push({ what: `Skupina ${i / 50 + 1}`, ok: false, error: err.message }) }
    }
    setReport({ out, creds }); setBusy(false)
  }

  function downloadCreds() {
    const csv = 'ime;email;lozinka\n' + report.creds.map((c) => `${c.ime};${c.email};${c.lozinka}`).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
    a.download = 'pristupni_podaci.csv'; a.click()
  }

  return (
    <>
      <h2>Uvoz iz CSV-a</h2>
      <div className="card">
        <p>CSV stupci (prvi redak): <code>dijete; datum_rodenja; grupa; roditelj; email; telefon</code></p>
        <p className="muted">Datum u formatu GGGG-MM-DD. Naziv grupe mora postojati. Jedan redak = jedan roditelj (isto dijete u dva retka = dva roditelja).</p>
        <input type="file" accept=".csv,text/csv" onChange={onFile} />
        {rows.length > 0 && <>
          <p><b>{rows.length}</b> redaka spremno za uvoz. Prvih 5:</p>
          <pre>{JSON.stringify(rows.slice(0, 5), null, 1)}</pre>
          <button className="primary" disabled={busy} onClick={run}>{busy ? 'Uvozim…' : 'Pokreni uvoz'}</button>
        </>}
      </div>
      {report && (
        <div className="card">
          <p>✅ {report.out.filter((o) => o.ok).length} uspješno · ❌ {report.out.filter((o) => !o.ok).length} grešaka</p>
          {report.creds.length > 0 && <button className="primary" onClick={downloadCreds}>⬇️ Preuzmi pristupne podatke (CSV)</button>}
          <ul>{report.out.filter((o) => !o.ok).map((o, i) => <li key={i} className="err">{o.what}: {o.error}</li>)}</ul>
        </div>
      )}
    </>
  )
}
