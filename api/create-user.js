// Vercel serverless funkcija. Service role ključ postoji SAMO ovdje (env var na serveru).
// Prije svega provjerava da je pozivatelj prijavljeni ADMIN, i vrtić uzima iz njegovog profila
// (klijent ne može odrediti u koji vrtić ili s kojom ulogom iznad dopuštene).
import { createClient } from '@supabase/supabase-js'

const ROLES = ['admin', 'odgajatelj', 'roditelj']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return res.status(500).json({ error: 'Server nije konfiguriran' })

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Niste prijavljeni' })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: caller, error: callerErr } = await admin.auth.getUser(token)
  if (callerErr || !caller?.user) return res.status(401).json({ error: 'Neispravna sesija' })

  const { data: profile } = await admin
    .from('profiles').select('role, kindergarten_id').eq('id', caller.user.id).single()
  if (!profile || profile.role !== 'admin' || !profile.kindergarten_id)
    return res.status(403).json({ error: 'Samo administrator može kreirati korisnike' })

  const users = Array.isArray(req.body?.users) ? req.body.users : [req.body]
  if (users.length === 0 || users.length > 500)
    return res.status(400).json({ error: 'Neispravan broj korisnika (max 500)' })

  const results = []
  for (const u of users) {
    const email = String(u?.email || '').trim().toLowerCase()
    const fullName = String(u?.fullName || '').trim()
    const password = String(u?.password || '')
    const role = ROLES.includes(u?.role) ? u.role : 'roditelj'
    const phone = u?.phone ? String(u.phone).trim() : null

    if (!email || !fullName || password.length < 8) {
      results.push({ email, ok: false, error: 'Nedostaje ime/email ili lozinka kraća od 8 znakova' })
      continue
    }
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName },
    })
    if (error) { results.push({ email, ok: false, error: error.message }); continue }

    const { error: pErr } = await admin.from('profiles').upsert({
      id: data.user.id, full_name: fullName, role, phone,
      kindergarten_id: profile.kindergarten_id,
    })
    if (pErr) { results.push({ email, ok: false, error: pErr.message }); continue }

    // opcionalno povezivanje s djetetom (za CSV uvoz roditelja)
    if (u.childId) {
      await admin.from('child_parents').upsert({ child_id: u.childId, parent_id: data.user.id })
    }
    results.push({ email, ok: true, id: data.user.id })
  }
  return res.status(200).json({ results })
}
