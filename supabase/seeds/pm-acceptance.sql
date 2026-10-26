-- Сид для приймання зрізу 2 PM: доступність акаунта pm-therapist@example.test (як у therapist1 і therapist2 у seed.sql).
-- Окремий файл, бо supabase db push --include-seed повторно не виконує вже застосований seed.sql, навіть зі зміненим
-- вмістом (лише оновлює його хеш), а новий файл зі [db.seed] sql_paths виконує один раз.
-- Ідемпотентний; лише синтетичні дані. Профіль створює npm run users:demo — без нього вставка нічого не додає.
-- Слоти пн–пт 09:00–17:00 (по 60 хв) у часовому поясі практики America/Los_Angeles на 2026-10-26 – 2026-11-29.
insert into public.slots (therapist_id, starts_at, ends_at)
select
  p.id,
  (d + make_interval(hours => h)) at time zone 'America/Los_Angeles',
  (d + make_interval(hours => h)) at time zone 'America/Los_Angeles' + interval '60 minutes'
from public.profiles as p
cross join generate_series(timestamp '2026-10-26', timestamp '2026-11-29', interval '1 day') as d
cross join generate_series(9, 16) as h
where p.email = 'pm-therapist@example.test'
  and extract(isodow from d) <= 5
on conflict (therapist_id, starts_at) do nothing;
