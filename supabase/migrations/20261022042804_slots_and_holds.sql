-- Слоти доступності терапевтів, утримання й функція hold_slot.
-- Рішення — docs/decisions/0001-slot-hold-data-model.md; план — openspec/changes/impl-hold/design.md (D2–D4).
-- AC: AC-HOLD-01…08, AC-HOLD-17, AC-HOLD-18, AC-HOLD-24, AC-HOLD-25, AC-HOLD-26, AC-HOLD-32, AC-HOLD-33.

-- ── Таблиця slots ───────────────────────────────────────────────────────────
-- Доступність готується сидом (supabase/seed.sql); у застосунку слоти не створюються й не змінюються.
create table public.slots (
  id           uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.profiles (id) on delete cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  -- Кожен слот — 60 хвилин і починається на початку години (припущення PM).
  constraint slots_duration_check check (ends_at = starts_at + interval '60 minutes'),
  constraint slots_hour_start_check check (date_trunc('hour', starts_at) = starts_at),
  constraint slots_therapist_start_key unique (therapist_id, starts_at)
);

comment on table public.slots is
  'Слот доступності терапевта (60 хв). Зріз 1: лише сид.';

alter table public.slots enable row level security;

revoke all on table public.slots from anon, authenticated;
grant select on table public.slots to authenticated;
grant select, insert, update, delete on table public.slots to service_role;

-- Планувальник і адміністратор бачать усі слоти; терапевт — лише свої (AC-HOLD-09).
create policy slots_select_staff_or_own
  on public.slots
  for select
  to authenticated
  using (
    (select private.is_staff())
    or therapist_id = (select auth.uid())
  );

-- ── Таблиця holds ───────────────────────────────────────────────────────────
-- Утримання слоту за клієнтом; з confirmed_at — підтверджений сеанс. Статус не зберігається:
-- «Confirmed» — є confirmed_at; «Held» — now() < expires_at; інакше «Expired» (без фонової задачі).
create table public.holds (
  id           uuid primary key default gen_random_uuid(),
  slot_id      uuid not null references public.slots (id) on delete cascade,
  client_id    uuid not null references public.clients (id) on delete restrict,
  created_at   timestamptz not null,
  expires_at   timestamptz not null,
  confirmed_at timestamptz,
  -- Рівно 24 години (1440 хв) від створення, зокрема через перехід на літній/зимовий час.
  constraint holds_expiry_check check (expires_at = created_at + interval '1440 minutes')
);

create index holds_slot_id_idx on public.holds (slot_id);
create index holds_client_id_idx on public.holds (client_id);

comment on table public.holds is
  'Утримання слоту за клієнтом (24 год); confirmed_at — сеанс. Пише лише private.hold_slot_impl / confirm_hold_impl.';

alter table public.holds enable row level security;

revoke all on table public.holds from anon, authenticated;
-- insert / update для authenticated свідомо не видаємо: прямий запит обійшов би перевірки hold_slot.
grant select on table public.holds to authenticated;
grant select, insert, update, delete on table public.holds to service_role;

create policy holds_select_staff_or_own_slot
  on public.holds
  for select
  to authenticated
  using (
    (select private.is_staff())
    or exists (
      select 1
      from public.slots as s
      where s.id = holds.slot_id
        and s.therapist_id = (select auth.uid())
    )
  );

-- Терапевт бачить клієнтів, пов'язаних з утриманнями чи сеансами в його слотах (матриця прав «лише власні»).
create policy clients_select_own_therapist
  on public.clients
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.holds as h
      join public.slots as s on s.id = h.slot_id
      where h.client_id = clients.id
        and s.therapist_id = (select auth.uid())
    )
  );

-- ── hold_slot ───────────────────────────────────────────────────────────────
-- Перевірка + запис однією транзакцією. search_path = '' — усі об'єкти зі схемою.
-- Блокування рядків слоту, потім клієнта серіалізує одночасні утримання (AC-HOLD-04, AC-HOLD-25);
-- порядок блокувань завжди однаковий, тож взаємоблокувань немає.
create or replace function private.hold_slot_impl(p_slot_id uuid, p_client_id uuid)
returns public.holds
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_slot public.slots;
  -- Точність до хвилини (припущення PM): о 14:29 — «Held», о 14:30 — «Expired» (AC-HOLD-05, AC-HOLD-06).
  v_created_at timestamptz := pg_catalog.date_trunc('minute', pg_catalog.now());
  v_hold public.holds;
begin
  -- Анонім і користувач без профілю теж отримують відмову: is_staff() NULL-safe (AC-HOLD-08).
  if (select auth.uid()) is null or not private.is_staff() then
    raise exception 'HOLD_FORBIDDEN';
  end if;

  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found then
    raise exception 'SLOT_NOT_FOUND';
  end if;

  -- Активне утримання або сеанс у слоті (AC-HOLD-03, AC-HOLD-04, AC-HOLD-17).
  if exists (
    select 1
    from public.holds as h
    where h.slot_id = p_slot_id
      and (h.confirmed_at is not null or h.expires_at > pg_catalog.now())
  ) then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  -- Слот уже почався, з моменту початку включно (AC-HOLD-07, AC-HOLD-32).
  if pg_catalog.now() >= v_slot.starts_at then
    raise exception 'SLOT_STARTED';
  end if;

  perform 1 from public.clients where id = p_client_id for update;
  if not found then
    raise exception 'CLIENT_NOT_FOUND';
  end if;

  -- Утримання й сеанси клієнта не перетинаються; прострочені не враховуються;
  -- кінець одного в момент початку іншого — не перетин ('[)') (AC-HOLD-25, AC-HOLD-26).
  if exists (
    select 1
    from public.holds as h
    join public.slots as s on s.id = h.slot_id
    where h.client_id = p_client_id
      and (h.confirmed_at is not null or h.expires_at > pg_catalog.now())
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

revoke execute on function private.hold_slot_impl(uuid, uuid) from public, anon;
grant execute on function private.hold_slot_impl(uuid, uuid) to authenticated;

-- Публічна точка входу для supabase.rpc('hold_slot', …); лише делегує в private.
create or replace function public.hold_slot(p_slot_id uuid, p_client_id uuid)
returns public.holds
language sql
volatile
security invoker
set search_path = ''
as $$
  select * from private.hold_slot_impl(p_slot_id, p_client_id);
$$;

revoke execute on function public.hold_slot(uuid, uuid) from public, anon;
grant execute on function public.hold_slot(uuid, uuid) to authenticated;
