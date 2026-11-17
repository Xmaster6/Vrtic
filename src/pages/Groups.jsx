import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Groups({ profile }) {
  const [groups, setGroups] = useState([])
  const [teachers, setTeachers] = useState([])
  const [form, setForm] = useState({ name: '', icon: '👦', color: '#5C8BFF' })
  const load = async () => {
    const { data } = await supabase.from('groups').select('*, group_teachers(teacher_id, profiles(full_name))').order('name')
    setGroups(data || [])
  }
  useEffect(() => {
    load()
    supabase.from('profiles').select('id,full_name').eq('role', 'odgajatelj').order('full_name')
      .then(({ data }) => setTeachers(data || []))
  }, [])

  async function add(e) {
    e.preventDefault()
    await supabase.from('groups').insert({ ...form, kindergarten_id: profile.kindergarten_id })
    setForm({ name: '', icon: '👦', color: '#5C8BFF' }); load()
  }
  async function addTeacher(group_id, teacher_id) {
    if (!teacher_id) return
    await supabase.from('group_teachers').upsert({ group_id, teacher_id }); load()
  }
  async function removeTeacher(group_id, teacher_id) {
    await supabase.from('group_teachers').delete().eq('group_id', group_id).eq('teacher_id', teacher_id); load()
  }
  async function remove(id) {
    if (!confirm('Obrisati grupu?')) return
    await supabase.from('groups').delete().eq('id', id); load()
  }
  return (
    <>
      <h2>Grupe</h2>
      <form className="card row" onSubmit={add}>
        <label>Naziv<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Ikona<input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} style={{ width: 70 }} /></label>
        <label>Boja<input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></label>
        <button className="primary">Dodaj grupu</button>
      </form>
      {groups.map((g) => (
        <div className="card" key={g.id}>
          <div className="row between">
            <strong style={{ color: g.color }}>{g.icon} {g.name}</strong>
            <button className="link danger" onClick={() => remove(g.id)}>Obriši</button>
          </div>
          <div>Odgajatelji: {(g.group_teachers || []).map((t) => (
            <span className="chip" key={t.teacher_id}>{t.profiles?.full_name}
              <button className="x" onClick={() => removeTeacher(g.id, t.teacher_id)}>×</button></span>
          ))}
            <select value="" onChange={(e) => addTeacher(g.id, e.target.value)}>
              <option value="">+ dodaj odgajatelja</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
        </div>
      ))}
    </>
  )
}
