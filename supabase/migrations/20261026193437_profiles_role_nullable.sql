-- Користувач, який увійшов, але ще не має ролі (зріз 2, AC-CARD-11; design.md impl-client-cards, D1).
-- Новий користувач Auth більше не отримує роль 'therapist' автоматично: role = NULL, доки адміністратор її не призначить.

-- ── 1. Гілки терапевта — лише для ролі therapist ────────────────────────────
-- Раніше гілка терапевта перевіряла лише auth.uid(): користувач, з якого зняли роль therapist, а слоти чи утримання
-- лишились, і далі читав би слоти, утримання й картки клієнтів. Перестворюємо політики з тією самою назвою й
-- операцією, додавши перевірку ролі; гілки staff не змінюються.
drop policy slots_select_staff_or_own on public.slots;
create policy slots_select_staff_or_own
  on public.slots
  for select
  to authenticated
  using (
    (select private.is_staff())
    or (
      (select private.current_app_role()) = 'therapist'
      and therapist_id = (select auth.uid())
    )
  );

drop policy holds_select_staff_or_own_slot on public.holds;
create policy holds_select_staff_or_own_slot
  on public.holds
  for select
  to authenticated
  using (
    (select private.is_staff())
    or (
      (select private.current_app_role()) = 'therapist'
      and exists (
        select 1
        from public.slots as s
        where s.id = holds.slot_id
          and s.therapist_id = (select auth.uid())
      )
    )
  );

drop policy clients_select_own_therapist on public.clients;
create policy clients_select_own_therapist
  on public.clients
  for select
  to authenticated
  using (
    (select private.current_app_role()) = 'therapist'
    and exists (
      select 1
      from public.holds as h
      join public.slots as s on s.id = h.slot_id
      where h.client_id = clients.id
        and s.therapist_id = (select auth.uid())
    )
  );

-- ── 2. Набір ролей: NULL — «ще без ролі» ────────────────────────────────────
-- Порядок із заголовка 20261012000000_profiles_and_roles.sql: constraint → дані → default → новий constraint.
alter table public.profiles drop constraint profiles_role_check;
-- Дані: наявних рядків не змінюємо — у всіх користувачів сиду роль є.
-- Тригер on_auth_user_created вставляє профіль без role — тепер це NULL, а не 'therapist'.
alter table public.profiles alter column role drop default, alter column role drop not null;
alter table public.profiles add constraint profiles_role_check
  check (role is null or role in ('admin', 'scheduler', 'therapist'));

-- Колонковий grant update (full_name) з першої міграції не розширюємо: користувач не призначає роль сам собі.
-- private.current_app_role() для користувача без ролі повертає NULL, private.is_staff() — false.
