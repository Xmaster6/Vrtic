import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Children({ profile }) {
  const [children, setChildren] = useState([])
  const [groups, setGroups] = useState([])
  const [parents, setParents] = useState([])
  const [form, setForm] = useState({ full_name: '', birth_date: '', group_id: '' })
  const [linkFor, setLinkFor] = useState(null)
  const [parentId, setParentId] = useState('')

  const load = async () => {
    const { data } = await supabase.from('children')
      .select('*, groups(name), child_parents(parent_id, profiles(full_name))').order('full_name')
    setChildren(data || [])
  }
  useEffect(() => {
    load()
    supabase.from('groups').select('id,name').order('name').then(({ data }) => setGroups(data || []))
    supabase.from('profiles').select('id,full_name').eq('role', 'roditelj').order('full_name')
      .then(({ data }) => setParents(data || []))
  }, [])

  async function add(e) {
    e.preventDefault()
    await supabase.from('children').insert({
      kindergarten_id: profile.kindergarten_id, full_name: form.full_name,
      birth_date: form.birth_date || null, group_id: form.group_id || null,
    })
    setForm({ full_name: '', birth_date: '', group_id: '' }); load()
  }
  async function setGroup(id, group_id) {
    await supabase.from('children').update({ group_id: group_id || null }).eq('id', id); load()
  }
  async function link() {
    if (!parentId) return
    await supabase.from('child_parents').upsert({ child_id: linkFor, parent_id: parentId })
    setLinkFor(null); setParentId(''); load()
  }
  async function unlink(child_id, parent_id) {
    await supabase.from('child_parents').delete().eq('child_id', child_id).eq('parent_id', parent_id); load()
  }
  async function remove(id) {
    if (!confirm('Obrisati dijete?')) return
    await supabase.from('children').delete().eq('id', id); load()
  }

  return (
    <>
      <h2>Djeca</h2>
      <form className="card row" onSubmit={add}>
        <label>Ime i prezime<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
        <label>Datum rođenja<input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></label>
        <label>Grupa
          <select value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}>
            <option value="">—</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <button className="primary">Dodaj</button>
      </form>

      <table className="card">
        <thead><tr><th>Dijete</th><th>Grupa</th><th>Roditelji</th><th></th></tr></thead>
        <tbody>
          {children.map((c) => (
            <tr key={c.id}>
              <td>{c.full_name}</td>
              <td>
                <select value={c.group_id || ''} onChange={(e) => setGroup(c.id, e.target.value)}>
                  <option value="">—</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </td>
              <td>
                {(c.child_parents || []).map((p) => (
                  <span className="chip" key={p.parent_id}>{p.profiles?.full_name}
                    <button className="x" onClick={() => unlink(c.id, p.parent_id)}>×</button></span>
                ))}
                {linkFor === c.id ? (
                  <span>
                    <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                      <option value="">Odaberi roditelja…</option>
                      {parents.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                    <button className="link" onClick={link}>Spremi</button>
                  </span>
                ) : <button className="link" onClick={() => setLinkFor(c.id)}>+ roditelj</button>}
              </td>
              <td><button className="link danger" onClick={() => remove(c.id)}>Obriši</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
