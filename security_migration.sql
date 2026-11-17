-- ============================================================
-- SECURITY + WEB PANEL MIGRACIJA
-- Pokreni jednom u Supabase SQL Editoru (siguran za ponovno pokretanje)
-- ============================================================

-- 1) KRITIČNO: korisnik više ne može sam sebi promijeniti ulogu / vrtić -------
create or replace function public.protect_profile_fields()
returns trigger as $$
begin
  -- auth.uid() je NULL kad radi service role (naš server) -> dopušteno
  if auth.uid() is not null
     and (new.role is distinct from old.role
          or new.kindergarten_id is distinct from old.kindergarten_id)
     and coalesce(public.get_my_role(), '') <> 'admin' then
    raise exception 'Nemate ovlasti za promjenu uloge ili vrtića';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute procedure public.protect_profile_fields();

-- 2) Admin može ažurirati profile u svom vrtiću -----------------------------
drop policy if exists "Admin ažurira profile vrtića" on public.profiles;
create policy "Admin ažurira profile vrtića" on public.profiles for update
  using (get_my_role() = 'admin' and kindergarten_id = get_my_kindergarten_id());

-- 3) Novi auth korisnik uvijek dobiva sigurne zadane vrijednosti -------------
-- (uloga i vrtić se postavljaju samo s servera preko service role ključa;
--  metadata s klijenta se NE smije slušati - inače bi se netko mogao
--  registrirati kao admin)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, kindergarten_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Novi korisnik'),
    'roditelj',
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 4) Grupni chat: samo članovi grupe (+ admin) ------------------------------
drop policy if exists "Vidi poruke" on public.messages;
create policy "Vidi poruke" on public.messages for select
  using (
    group_id in (select id from public.groups
                 where kindergarten_id = get_my_kindergarten_id())
    and (
      get_my_role() = 'admin'
      or group_id in (select group_id from public.group_teachers
                      where teacher_id = auth.uid())
      or group_id in (select c.group_id from public.children c
                      join public.child_parents cp on cp.child_id = c.id
                      where cp.parent_id = auth.uid())
    )
  );

drop policy if exists "Šalje poruke" on public.messages;
create policy "Šalje poruke" on public.messages for insert
  with check (
    auth.uid() = author_id
    and (
      get_my_role() = 'admin'
      or group_id in (select group_id from public.group_teachers
                      where teacher_id = auth.uid())
      or group_id in (select c.group_id from public.children c
                      join public.child_parents cp on cp.child_id = c.id
                      where cp.parent_id = auth.uid())
    )
  );

-- 5) Roditelj ne može sam sebi odobriti zahtjev ------------------------------
-- (postojeća politika već traži admin/odgajatelj za UPDATE - samo potvrda)

-- 6) Pomoćna funkcija: odobri zahtjev i poveži roditelja s djetetom atomarno --
create or replace function public.approve_parent_request(request_id uuid)
returns void as $$
declare r public.child_parent_requests;
begin
  if get_my_role() not in ('admin', 'odgajatelj') then
    raise exception 'Nemate ovlasti';
  end if;
  select * into r from public.child_parent_requests where id = request_id;
  if r.id is null then raise exception 'Zahtjev ne postoji'; end if;
  insert into public.child_parents (child_id, parent_id)
    values (r.child_id, r.parent_id) on conflict do nothing;
  update public.child_parent_requests set status = 'approved' where id = request_id;
end;
$$ language plpgsql security definer;

-- 7) VAŽNO (ručno u Supabase Dashboardu):
--    Authentication -> Providers -> Email -> ISKLJUČI "Allow new users to sign up"
--    (admin kreira račune preko web panela; admin API radi i s isključenom registracijom)
