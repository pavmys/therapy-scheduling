-- Ролі зрізу 1 (admin / scheduler / therapist) і картки клієнтів.
-- Рішення — docs/decisions/0001-slot-hold-data-model.md; план — openspec/changes/impl-hold/design.md (D1–D4).
-- AC: AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16, AC-HOLD-34, AC-HOLD-35.

-- ── Ролі ────────────────────────────────────────────────────────────────────
-- Порядок із заголовка 20261012000000_profiles_and_roles.sql: constraint → дані → default → новий constraint.
alter table public.profiles drop constraint profiles_role_check;
update public.profiles set role = 'therapist' where role = 'member';
-- Найменш привілейована роль: тригер on_auth_user_created вставляє профіль із цим default.
alter table public.profiles alter column role set default 'therapist';
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'scheduler', 'therapist'));

-- ── Хелпер «планувальник або адміністратор» ────────────────────────────────
-- coalesce: для аноніма чи користувача без профілю current_app_role() повертає NULL,
-- і `not private.is_staff()` без нього не спрацював би як заборона.
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() in ('admin', 'scheduler'), false);
$$;

revoke execute on function private.is_staff() from public, anon;
grant execute on function private.is_staff() to authenticated;

-- Планувальник і адміністратор бачать усі профілі (список терапевтів); решта — як раніше, лише свій.
create policy profiles_select_staff
  on public.profiles
  for select
  to authenticated
  using ((select private.is_staff()));

-- ── Таблиця clients ─────────────────────────────────────────────────────────
create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  email      text not null,
  created_at timestamptz not null default now(),
  constraint clients_full_name_check check (btrim(full_name) <> ''),
  -- Email зберігається нормалізованим (малі літери, без пробілів по краях) і має рівно один @
  -- з непорожніми частинами — ті самі правила, що в src/lib/clients/validate.ts.
  constraint clients_email_check check (
    email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
  ),
  constraint clients_email_key unique (email)
);

comment on table public.clients is
  'Картка клієнта зрізу 1: лише ім''я та email. Створюють планувальник або адміністратор.';

alter table public.clients enable row level security;

revoke all on table public.clients from anon, authenticated;
grant select on table public.clients to authenticated;
-- id і created_at заповнюють defaults: користувач передає лише ім'я та email.
grant insert (full_name, email) on table public.clients to authenticated;
grant select, insert, update, delete on table public.clients to service_role;

-- Терапевт отримає доступ до «своїх» клієнтів разом із таблицею утримань (наступна міграція).
create policy clients_select_staff
  on public.clients
  for select
  to authenticated
  using ((select private.is_staff()));

create policy clients_insert_staff
  on public.clients
  for insert
  to authenticated
  with check ((select private.is_staff()));
