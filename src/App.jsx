import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login.jsx'
import Announcements from './pages/Announcements.jsx'
import Requests from './pages/Requests.jsx'
import Children from './pages/Children.jsx'
import Users from './pages/Users.jsx'
import Groups from './pages/Groups.jsx'
import Import from './pages/Import.jsx'

const PAGES = [
  ['announcements', '📢 Objave', Announcements, ['admin', 'odgajatelj']],
  ['requests', '✅ Zahtjevi roditelja', Requests, ['admin', 'odgajatelj']],
  ['children', '🧒 Djeca', Children, ['admin', 'odgajatelj']],
  ['groups', '🏷️ Grupe', Groups, ['admin']],
  ['users', '👥 Korisnici', Users, ['admin']],
  ['import', '📥 Uvoz (CSV)', Import, ['admin']],
]

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [kg, setKg] = useState(null)
  const [page, setPage] = useState('announcements')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); return }
    ;(async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (!p || !['admin', 'odgajatelj'].includes(p.role)) {
        setError('Ovaj panel je samo za administratore i odgajatelje.')
        await supabase.auth.signOut(); return
      }
      setProfile(p)
      const { data: k } = await supabase.from('kindergartens').select('*').eq('id', p.kindergarten_id).single()
      setKg(k)
    })()
  }, [session])

  if (session === undefined) return <div className="center">Učitavanje…</div>
  if (!session || !profile) return <Login error={error} />

  const allowed = PAGES.filter((p) => p[3].includes(profile.role))
  const Current = (allowed.find((p) => p[0] === page) || allowed[0])[2]

  return (
    <div className="layout">
      <aside>
        <div className="brand">🏫 {kg?.name || 'Vrtić'}</div>
        <nav>
          {allowed.map(([id, label]) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>{label}</button>
          ))}
        </nav>
        <div className="me">
          <div>{profile.full_name}</div>
          <small>{profile.role}</small>
          <button className="link" onClick={() => supabase.auth.signOut()}>Odjava</button>
        </div>
      </aside>
      <main><Current profile={profile} kg={kg} /></main>
    </div>
  )
}
