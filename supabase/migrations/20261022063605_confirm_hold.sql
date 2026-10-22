-- Підтвердження утримання: утримання стає сеансом (confirmed_at).
-- Рішення — docs/decisions/0001-slot-hold-data-model.md; план — openspec/changes/impl-hold/design.md (D3).
-- AC: AC-HOLD-12, AC-HOLD-13, AC-HOLD-14, AC-HOLD-19, AC-HOLD-22, AC-HOLD-23, AC-HOLD-27, AC-HOLD-36.
-- Також оновлює private.hold_slot_impl: час перевірок — clock_timestamp() після блокувань (кінець файлу).

-- Перевірка + запис однією транзакцією; search_path = '' — усі об'єкти зі схемою.
-- Блокування рядка утримання серіалізує повторні й одночасні підтвердження (AC-HOLD-36).
create or replace function private.confirm_hold_impl(p_hold_id uuid)
returns public.holds
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hold public.holds;
  v_starts_at timestamptz;
  v_now timestamptz;
begin
  -- Будь-який планувальник чи адміністратор (AC-HOLD-19, AC-HOLD-27); терапевт, анонім
  -- і користувач без профілю — відмова (is_staff() NULL-safe) (AC-HOLD-14).
  if (select auth.uid()) is null or not private.is_staff() then
    raise exception 'CONFIRM_FORBIDDEN';
  end if;

  select * into v_hold from public.holds where id = p_hold_id for update;
  if not found then
    raise exception 'HOLD_NOT_FOUND';
  end if;

  -- Після очікування блокування now() — ще час початку транзакції; беремо фактичний час.
  v_now := pg_catalog.clock_timestamp();

  if v_hold.confirmed_at is not null then
    raise exception 'HOLD_ALREADY_CONFIRMED';
  end if;

  -- З моменту expires_at утримання прострочене (AC-HOLD-06, AC-HOLD-13).
  if v_now >= v_hold.expires_at then
    raise exception 'HOLD_EXPIRED';
  end if;

  -- Слот уже почався, з моменту початку включно; утримання лишається «Held» до прострочення
  -- (AC-HOLD-22; о 09:59 для слоту о 10:00 — підтверджується, AC-HOLD-23).
  select s.starts_at into v_starts_at from public.slots as s where s.id = v_hold.slot_id;
  if v_now >= v_starts_at then
    raise exception 'SLOT_STARTED_CONFIRM';
  end if;

  update public.holds
  set confirmed_at = v_now
  where id = p_hold_id
  returning * into v_hold;

  return v_hold;
end;
$$;

revoke execute on function private.confirm_hold_impl(uuid) from public, anon;
grant execute on function private.confirm_hold_impl(uuid) to authenticated;

-- Публічна точка входу для supabase.rpc('confirm_hold', …); лише делегує в private.
create or replace function public.confirm_hold(p_hold_id uuid)
returns public.holds
language sql
volatile
security invoker
set search_path = ''
as $$
  select * from private.confirm_hold_impl(p_hold_id);
$$;

revoke execute on function public.confirm_hold(uuid) from public, anon;
grant execute on function public.confirm_hold(uuid) to authenticated;

-- ── hold_slot_impl: фактичний час після блокувань ───────────────────────────
-- Та сама функція, що в 20261022042804_slots_and_holds.sql, але перевірки «активне утримання»,
-- «слот почався» і created_at беруть clock_timestamp() після блокування слоту й клієнта:
-- now() фіксується на початку транзакції й після очікування блокування застарілий.
create or replace function private.hold_slot_impl(p_slot_id uuid, p_client_id uuid)
returns public.holds
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_slot public.slots;
  v_now timestamptz;
  v_created_at timestamptz;
  v_hold public.holds;
begin
  if (select auth.uid()) is null or not private.is_staff() then
    raise exception 'HOLD_FORBIDDEN';
  end if;

  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found then
    raise exception 'SLOT_NOT_FOUND';
  end if;

  perform 1 from public.clients where id = p_client_id for update;
  if not found then
    raise exception 'CLIENT_NOT_FOUND';
  end if;

  -- Порядок блокувань той самий (слот → клієнт); час — після обох.
  v_now := pg_catalog.clock_timestamp();
  -- Точність до хвилини (припущення PM): о 14:29 — «Held», о 14:30 — «Expired» (AC-HOLD-05, AC-HOLD-06).
  v_created_at := pg_catalog.date_trunc('minute', v_now);

  -- Активне утримання або сеанс у слоті (AC-HOLD-03, AC-HOLD-04, AC-HOLD-17).
  if exists (
    select 1
    from public.holds as h
    where h.slot_id = p_slot_id
      and (h.confirmed_at is not null or h.expires_at > v_now)
  ) then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  -- Слот уже почався, з моменту початку включно (AC-HOLD-07, AC-HOLD-32).
  if v_now >= v_slot.starts_at then
    raise exception 'SLOT_STARTED';
  end if;

  -- Утримання й сеанси клієнта не перетинаються; прострочені не враховуються;
  -- кінець одного в момент початку іншого — не перетин ('[)') (AC-HOLD-25, AC-HOLD-26).
  if exists (
    select 1
    from public.holds as h
    join public.slots as s on s.id = h.slot_id
    where h.client_id = p_client_id
      and (h.confirmed_at is not null or h.expires_at > v_now)
      and pg_catalog.tstzrange(s.starts_at, s.ends_at, '[)')
          && pg_catalog.tstzrange(v_slot.starts_at, v_slot.ends_at, '[)')
  ) then
    raise exception 'CLIENT_OVERLAP';
  end if;

  insert into public.holds (slot_id, client_id, created_at, expires_at)
  values (p_slot_id, p_client_id, v_created_at, v_created_at + interval '1440 minutes')
  returning * into v_hold;

  return v_hold;
end;
$$;

-- create or replace зберігає наявні права; повторюємо їх явно.
revoke execute on function private.hold_slot_impl(uuid, uuid) from public, anon;
grant execute on function private.hold_slot_impl(uuid, uuid) to authenticated;

