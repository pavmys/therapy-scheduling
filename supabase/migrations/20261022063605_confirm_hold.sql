-- Підтвердження утримання: утримання стає сеансом (confirmed_at).
-- Рішення — docs/decisions/0001-slot-hold-data-model.md; план — openspec/changes/impl-hold/design.md (D3).
-- AC: AC-HOLD-12, AC-HOLD-13, AC-HOLD-14, AC-HOLD-19, AC-HOLD-22, AC-HOLD-23, AC-HOLD-27, AC-HOLD-36.

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

  if v_hold.confirmed_at is not null then
    raise exception 'HOLD_ALREADY_CONFIRMED';
  end if;

  -- З моменту expires_at утримання прострочене (AC-HOLD-06, AC-HOLD-13).
  if pg_catalog.now() >= v_hold.expires_at then
    raise exception 'HOLD_EXPIRED';
  end if;

  -- Слот уже почався, з моменту початку включно; утримання лишається «Held» до прострочення
  -- (AC-HOLD-22; о 09:59 для слоту о 10:00 — підтверджується, AC-HOLD-23).
  select s.starts_at into v_starts_at from public.slots as s where s.id = v_hold.slot_id;
  if pg_catalog.now() >= v_starts_at then
    raise exception 'SLOT_STARTED_CONFIRM';
  end if;

  update public.holds
  set confirmed_at = pg_catalog.now()
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
