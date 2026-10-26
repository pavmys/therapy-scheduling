-- Картка клієнта з анкети: дорослий або дитина з опікуном (зріз 2; design.md impl-client-cards, D2).
-- AC: AC-CARD-01, AC-CARD-02, AC-CARD-03, AC-CARD-06, AC-CARD-10. Ті самі правила — у src/lib/clients/validate.ts;
-- тут — останній рубіж для прямого insert.

-- ── Колонки анкети ──────────────────────────────────────────────────────────
-- Старі картки зрізу 1 (лише ім'я та email) лишаються дійсними: тип — «Adult», решта — «Not provided» («Припущення» PM).
alter table public.clients
  add column client_type text not null default 'adult',
  add column date_of_birth date,
  add column session_language text,
  add column guardian_name text,
  add column guardian_email text;

-- У дитини власного email немає: контакт — email опікуна. unique (email) лишається (NULL не конфліктують),
-- clients_email_check для NULL не спрацьовує.
alter table public.clients alter column email drop not null;

alter table public.clients add constraint clients_type_check check (client_type in ('adult', 'child'));
alter table public.clients add constraint clients_session_language_check
  check (session_language in ('English', 'Spanish'));

-- Форма картки: дорослий — з email і без опікуна; дитина — без власного email, з непорожнім ім'ям опікуна
-- (без пробільних символів по краях) і коректним email опікуна за тим самим правилом, що й email клієнта.
alter table public.clients add constraint clients_card_shape_check check (
  (
    client_type = 'adult'
    and email is not null
    and guardian_name is null
    and guardian_email is null
  )
  or (
    client_type = 'child'
    and email is null
    -- is not null явно: порівняння з NULL дає NULL, а check з NULL вважається пройденим.
    and guardian_name is not null
    and guardian_email is not null
    and guardian_name ~ '[^[:space:]]'
    and guardian_name !~ '^[[:space:]]|[[:space:]]$'
    and guardian_email = lower(btrim(guardian_email))
    and guardian_email ~ '^[^@[:space:]]+@[^@[:space:].]*\.[^@[:space:]]*$'
  )
);

-- Усі поля нової картки обов'язкові. not valid: наявні картки зрізу 1 не перевіряються, а кожен новий insert — так.
-- «Не пізніше за сьогодні» (America/Los_Angeles) перевіряє Server Action: check з current_date залежав би від часу.
alter table public.clients add constraint clients_card_complete_check
  check (date_of_birth is not null and session_language is not null) not valid;

-- ── Права ───────────────────────────────────────────────────────────────────
-- grant insert (full_name, email) з міграції зрізу 1 доповнюємо колонками анкети. update і delete для authenticated
-- не даємо: редагування й архівування картки — поза зрізом. Хто вставляє — тримає політика clients_insert_staff.
grant insert (client_type, date_of_birth, session_language, guardian_name, guardian_email)
  on table public.clients to authenticated;
