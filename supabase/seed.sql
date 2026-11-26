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
-- і pm-therapist (акаунт PM на staging, supabase/pm-users.json). Вікно рахується від дати запуску: 7 днів назад
-- (минулі слоти для «Past») і 8 тижнів уперед, тож повторний запуск з include_seed продовжує розклад, а
-- on conflict не дублює наявні слоти. Профілі створюють npm run users:demo / users:pm:staging: поки їх немає,
-- вставка нічого не додає; після них — Actions → CI (прод) або db-deploy-staging → Run workflow з include_seed.
insert into public.slots (therapist_id, starts_at, ends_at)
select
  p.id,
  (d + make_interval(hours => h)) at time zone 'America/Los_Angeles',
  (d + make_interval(hours => h)) at time zone 'America/Los_Angeles' + interval '60 minutes'
from public.profiles as p
cross join generate_series(
  ((now() at time zone 'America/Los_Angeles')::date - 7)::timestamp,
  ((now() at time zone 'America/Los_Angeles')::date + 56)::timestamp,
  interval '1 day'
) as d
cross join generate_series(9, 16) as h
where p.email in ('therapist1@example.test', 'therapist2@example.test', 'pm-therapist@example.test')
  and extract(isodow from d) <= 5
on conflict (therapist_id, starts_at) do nothing;
