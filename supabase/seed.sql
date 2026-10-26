-- Сид-дані проєкту. Застосовується:
--   локально — під час `supabase db reset` (потрібен Docker);
--   у хмарі — лише з `supabase db push --include-seed` (звичайний db push сид не виконує).
--
-- Правила:
--   * лише синтетичні дані, email-и тільки *@example.test;
--   * файл має бути ІДЕМПОТЕНТНИМ: повторний запуск нічого не дублює
--     (insert ... on conflict do nothing / do update);
--   * користувачів Auth (auth.users) тут НЕ створюємо: їх створює
--     scripts/create-demo-users.mjs через Admin API (npm run users:demo)
--     за списком supabase/demo-users.json, а тригер on_auth_user_created додає профілі.
--
-- Приклад для довідкової таблиці, коли вона з'явиться у вашій міграції:
--   insert into public.departments (code, name)
--   values ('MATH', 'Кафедра математики'), ('LANG', 'Кафедра мов')
--   on conflict (code) do update set name = excluded.name;

-- ── Доступність терапевтів (зріз 1; design.md impl-hold, D8) ──────────────────
-- Слоти пн–пт 09:00–17:00 (по 60 хв) у часовому поясі практики America/Los_Angeles
-- на 2026-10-26 – 2026-11-29 для therapist1, therapist2 і pm-therapist (акаунт PM для приймання зрізу 2). Профілі створює npm run users:demo:
-- поки їх немає, вставка нічого не додає; після users:demo — Actions → CI → Run workflow з include_seed.
insert into public.slots (therapist_id, starts_at, ends_at)
select
  p.id,
  (d + make_interval(hours => h)) at time zone 'America/Los_Angeles',
  (d + make_interval(hours => h)) at time zone 'America/Los_Angeles' + interval '60 minutes'
from public.profiles as p
cross join generate_series(timestamp '2026-10-26', timestamp '2026-11-29', interval '1 day') as d
cross join generate_series(9, 16) as h
where p.email in ('therapist1@example.test', 'therapist2@example.test', 'pm-therapist@example.test')
  and extract(isodow from d) <= 5
on conflict (therapist_id, starts_at) do nothing;
