# 0001. Модель даних утримання слоту й запис через функції Postgres

- Статус: прийнято
- Дата: 2026-10-22
- AC: AC-HOLD-02, AC-HOLD-03, AC-HOLD-04, AC-HOLD-05, AC-HOLD-06, AC-HOLD-08, AC-HOLD-09, AC-HOLD-12, AC-HOLD-13, AC-HOLD-14, AC-HOLD-16, AC-HOLD-17, AC-HOLD-22, AC-HOLD-25, AC-HOLD-26, AC-HOLD-34, AC-HOLD-36

## Контекст

Зріз 1 (`openspec/specs/slot-holds`, `client-cards`, `therapist-schedule`): планувальник утримує слот терапевта за клієнтом на 24 години, підтверджує або дає утриманню прострочитися. Інваріанти — не більше одного активного утримання чи сеансу в слоті (AC-HOLD-03, AC-HOLD-04) і жодних перетинів утримань одного клієнта (AC-HOLD-25) — мають триматися при одночасних запитах. Фонових задач частіше ніж раз на добу немає (Vercel Hobby). У supabase-js немає транзакцій. Детальний план — `openspec/changes/impl-hold/design.md` (D1–D4, D8).

## Рішення

- **Ролі:** `admin` / `scheduler` / `therapist` замість `member` / `admin`; default `therapist` (найменш привілейована); `member` → `therapist`. Хелпер `private.is_staff()` — `coalesce(current_app_role() in ('admin','scheduler'), false)`, щоб анонім і користувач без профілю отримували `false`, а не `NULL`.
- **Таблиці:** `public.clients` (ім'я, email — `not null`, check нормалізації й формату, `unique (email)`), `public.slots` (терапевт, початок, кінець = початок + 60 хв, лише сид), `public.holds` (слот, клієнт, `created_at`, `expires_at`, `confirmed_at`). Сеанс = утримання з `confirmed_at`.
- **Статус не зберігається:** «Confirmed» — є `confirmed_at`; «Held» — `now < expires_at`; інакше «Expired». `created_at` обрізано до хвилини, `expires_at = created_at + 1440 хв` (AC-HOLD-05, AC-HOLD-06).
- **Запис утримань — лише функціями** `public.hold_slot` / `public.confirm_hold` (`security invoker`) → `private.*_impl` (`security definer`, `set search_path = ''`, об'єкти зі схемою). `select … for update` на рядку слоту, потім клієнта (утримання) або утримання (підтвердження) серіалізує одночасні запити (AC-HOLD-04, AC-HOLD-25, AC-HOLD-36). Помилки — коди (`SLOT_UNAVAILABLE`, `HOLD_EXPIRED`, …), застосунок мапить їх у тексти PM. `insert`/`update` у `holds` користувачам не видаємо.
- **Картки клієнтів** — прямий `insert (full_name, email)` під RLS `with check (private.is_staff())`; `23505` → «A client with this email already exists.» (AC-HOLD-16, AC-HOLD-34).
- **RLS:** staff бачить усе; терапевт — свої слоти, утримання на них і клієнтів цих утримань (AC-HOLD-09).

## Розглянуті варіанти

- Колонка `status` + фонова задача прострочення — cron на Hobby раз на добу, 24 години з точністю до хвилини не витримати.
- Exclusion constraint на «активне утримання» — неможливий: «активне» залежить від `now()`.
- Прямий `insert` у `holds` під RLS — планувальник обійшов би перевірки (почався слот, перетин клієнта) запитом до Data API.
- Окрема таблиця сеансів — дублювала б дані утримання; глосарій PM: підтвердження — момент, коли утримання стає сеансом.

## Наслідки

- Інваріанти тримає база; застосунок лише показує статуси (чисті функції з `now`).
- SQL-логіку функцій і RLS не перевіряють тести CI (ADR 0002) — ручна SQL-перевірка в кожному PR з міграцією.
- Q2 (Sofiia-pm/therapy-scheduling-spec#14, варіант A після WS7): повторне утримання тим самим клієнтом приховуватиме старе «Expired» у списку — зміна лише запиту списку, не моделі.
