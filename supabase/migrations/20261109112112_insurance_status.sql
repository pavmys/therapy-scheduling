-- Статус перевірки страхування в картці клієнта (зріз 3; design.md impl-insurance-status, D1–D2).
-- AC: AC-INS-01…06. Статус позначає лише планувальник або адміністратор; терапевт бачить його в картках своїх
-- клієнтів (наявна політика clients_select_own_therapist), гість — нічого (grant для anon немає).

-- ── D1. Колонка ─────────────────────────────────────────────────────────────
-- default 'not_set': наявні картки зрізів 1–2 й нові картки стартують з «Not set» («Припущення» PM, AC-INS-01).
-- Колонковий grant insert не розширюємо: при створенні картки статус завжди default.
alter table public.clients
  add column insurance_status text not null default 'not_set';

alter table public.clients
  add constraint clients_insurance_status_check
  check (insurance_status in ('not_set', 'verified', 'not_accepted', 'private_pay'));

-- ── D2. Зміна статусу ───────────────────────────────────────────────────────
-- Лише ця колонка: решту картки користувач, як і раніше, не змінює. anon grant не отримує.
grant update (insurance_status) on table public.clients to authenticated;

-- using: змінювати можна лише як staff (терапевт — 0 оновлених рядків, AC-INS-05);
-- with check: новий рядок теж лише від staff і без повернення до «Not set» («Припущення» PM).
create policy clients_update_insurance_staff
  on public.clients
  for update
  to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()) and insurance_status <> 'not_set');
