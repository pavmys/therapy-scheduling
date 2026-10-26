-- «Свій клієнт» для терапевта (зріз 2; design.md impl-client-cards, D3; ADR 0005).
-- AC: AC-CARD-04, AC-CARD-05, AC-CARD-08, AC-CARD-09. Терапевт бачить картки лише тих клієнтів, у яких з ним є
-- утримання зі статусом «Held» або сеанс зі статусом «Confirmed» (глосарій PM). Раніше політика пускала й клієнтів
-- з простроченим утриманням («Expired»), що порушує AC-CARD-08.

-- ── Хелпер ──────────────────────────────────────────────────────────────────
-- security definer: читає holds і slots в обхід RLS — без вкладених політик. search_path = '' — усі об'єкти зі схемою.
-- «Confirmed» — є confirmed_at; «Held» — не підтверджене й ще не прострочене (expires_at > now(), як у ADR 0001).
create or replace function private.is_own_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.holds as h
    join public.slots as s on s.id = h.slot_id
    where h.client_id = p_client_id
      and s.therapist_id = (select auth.uid())
      and (h.confirmed_at is not null or h.expires_at > now())
  );
$$;

revoke execute on function private.is_own_client(uuid) from public, anon;
grant execute on function private.is_own_client(uuid) to authenticated;

-- ── Політика select для терапевта ───────────────────────────────────────────
-- Та сама назва й операція; перевірку ролі therapist з 20261026193437_profiles_role_nullable.sql зберігаємо.
-- Політики staff (clients_select_staff, clients_insert_staff) без змін; update і delete — немає.
drop policy clients_select_own_therapist on public.clients;
create policy clients_select_own_therapist
  on public.clients
  for select
  to authenticated
  using (
    true -- MUTATION (revert): без перевірки ролі
    or (select private.is_own_client(clients.id)) -- MUTATION (revert): будь-хто бачить усі картки
  );
