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

-- ── Доступність терапевтів (зріз 1; design.md impl-hold, D8; ковзне вікно — ADR 0007) ─────
-- Слоти пн–пт 09:00–17:00 (по 60 хв) у часовому поясі практики America/Los_Angeles для therapist1, therapist2
-- і pm-therapist (акаунт PM на staging, supabase/pm-users.json). Вікно рахується від дати виконання сиду:
-- 7 днів назад (минулі слоти для «Past») і 26 тижнів уперед; on conflict не дублює наявні слоти, тож сид можна
-- виконувати повторно, щоб продовжити розклад.
-- Увага: `supabase db push --include-seed` виконує сид лише ОДИН раз на базу. Supabase CLI записує хеш файлу в
-- supabase_migrations.seed_files, а для зміненого файлу лише оновлює хеш («hash update») і SQL не виконує.
-- Перше застосування: профілі створюють npm run users:demo / users:pm:staging (поки їх немає, вставка нічого не
-- додає), потім — Actions → CI → Run workflow на main: include_seed — прод, include_seed_staging — staging
-- (job db-deploy-staging, ADR 0008). Повторне виконання
-- (продовжити розклад) — вміст цього файлу вручну в SQL Editor відповідного проєкту (лише вставка даних, не DDL).
insert into public.slots (therapist_id, starts_at, ends_at)
select
  p.id,
  (d + make_interval(hours => h)) at time zone 'America/Los_Angeles',
  (d + make_interval(hours => h)) at time zone 'America/Los_Angeles' + interval '60 minutes'
from public.profiles as p
cross join generate_series(
  ((now() at time zone 'America/Los_Angeles')::date - 7)::timestamp,
  ((now() at time zone 'America/Los_Angeles')::date + 182)::timestamp,
  interval '1 day'
) as d
cross join generate_series(9, 16) as h
where p.email in ('therapist1@example.test', 'therapist2@example.test', 'pm-therapist@example.test')
  and extract(isodow from d) <= 5
on conflict (therapist_id, starts_at) do nothing;
