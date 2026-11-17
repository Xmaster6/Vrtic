# Vrtić – web admin panel

## 1. Supabase (jednom)
1. SQL Editor → pokreni `security_migration.sql` (iz mobilnog projekta).
2. Authentication → Providers → Email → **isključi "Allow new users to sign up"**.
3. Settings → API: zapiši URL, `anon` ključ i `service_role` ključ.

## 2. Vercel
1. Stavi ovaj folder na GitHub (repo `vrtic-web-panel`), na vercel.com → Add New Project → Import.
   (ili: `npm i -g vercel && vercel` iz ovog foldera)
2. Environment Variables:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`  ← service role samo ovdje, bez VITE_ prefiksa
3. Deploy → dobiješ adresu `https://ime-projekta.vercel.app`.

## Lokalno
`npm install`, kopiraj `.env.example` u `.env.local`, `npx vercel dev` (da radi /api) ili `npm run dev` (bez kreiranja korisnika).

## CSV uvoz
Stupci: `dijete;datum_rodenja;grupa;roditelj;email;telefon` – vidi `primjer_uvoz.csv`.
Nakon uvoza preuzmi CSV s pristupnim podacima i podijeli ih roditeljima.
