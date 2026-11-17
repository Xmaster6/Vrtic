import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage, fmtDate, TYPE_LABEL } from '../lib/util'

export default function Announcements({ profile }) {
  const [list, setList] = useState([])
  const [groups, setGroups] = useState([])
  const [form, setForm] = useState({ title: '', content: '', type: 'objava', groupId: '', pinned: false })
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef()

  const load = async () => {
    const { data } = await supabase.from('announcements')
      .select('*, announcement_images(image_url, display_order), groups(name)')
      .order('created_at', { ascending: false }).limit(50)
    setList(data || [])
  }
  useEffect(() => {
    load()
    supabase.from('groups').select('id,name').order('name').then(({ data }) => setGroups(data || []))
  }, [])

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg('')
    try {
      const urls = []
      for (const f of files) {
        const blob = await compressImage(f)
        const path = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
        const { error } = await supabase.storage.from('announcements').upload(path, blob, { contentType: 'image/jpeg' })
        if (error) throw error
        urls.push(supabase.storage.from('announcements').getPublicUrl(path).data.publicUrl)
      }
      const { data: a, error } = await supabase.from('announcements').insert({
        kindergarten_id: profile.kindergarten_id, title: form.title, content: form.content,
        author_id: profile.id, group_id: form.groupId || null, pinned: form.pinned, type: form.type,
      }).select().single()
      if (error) throw error
      if (urls.length) {
        const { error: e2 } = await supabase.from('announcement_images')
          .insert(urls.map((u, i) => ({ announcement_id: a.id, image_url: u, display_order: i })))
        if (e2) throw e2
      }
      setForm({ title: '', content: '', type: 'objava', groupId: '', pinned: false })
      setFiles([]); if (fileRef.current) fileRef.current.value = ''
      setMsg('✅ Objava je objavljena.'); load()
    } catch (err) { setMsg('❌ ' + (err.message || err)) }
    setBusy(false)
  }

  async function remove(id) {
    if (!confirm('Obrisati objavu?')) return
    await supabase.from('announcements').delete().eq('id', id); load()
  }
  async function togglePin(a) {
    await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id); load()
  }

  return (
    <>
      <h2>Objave</h2>
      <form className="card" onSubmit={submit}>
        <div className="row">
          <label>Vrsta
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>Grupa
            <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">Cijeli vrtić</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
        </div>
        <label>Naslov<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
        <label>Tekst<textarea rows="6" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required /></label>
        <label>Slike (automatski se optimiziraju)
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => setFiles([...e.target.files])} />
        </label>
        {files.length > 0 && <small>{files.length} odabrano</small>}
        <label className="check"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> Prikvači na vrh</label>
        {msg && <p>{msg}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Objavljujem…' : 'Objavi'}</button>
      </form>

      {list.map((a) => (
        <div className="card" key={a.id}>
          <div className="row between">
            <strong>{a.pinned && '📌 '}{a.title}</strong>
            <small>{TYPE_LABEL[a.type] || ''} · {a.groups?.name || 'Cijeli vrtić'} · {fmtDate(a.created_at)}</small>
          </div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{a.content}</p>
          <div className="thumbs">
            {[...(a.announcement_images || [])].sort((x, y) => x.display_order - y.display_order)
              .map((i) => <img key={i.image_url} src={i.image_url} loading="lazy" />)}
          </div>
          <button className="link" onClick={() => togglePin(a)}>{a.pinned ? 'Odkvači' : 'Prikvači'}</button>
          <button className="link danger" onClick={() => remove(a.id)}>Obriši</button>
        </div>
      ))}
    </>
  )
}
