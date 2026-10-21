# Design

## Context

- Специфікація зрізу — `openspec/specs/client-cards`, `openspec/specs/slot-holds`, `openspec/specs/therapist-schedule`; навіщо — `proposal.md`.
- Наявна схема — одна міграція `supabase/migrations/20261012000000_profiles_and_roles.sql`: `public.profiles` з ролями `member` / `admin` (default `member`), хелпер `private.current_app_role()`, тригер `on_auth_user_created`. Сид `supabase/seed.sql` порожній; `supabase/demo-users.json` — admin, member1, member2.
- `src/`: `proxy.ts` (оновлення сесії, редирект на `/login`), сторінки `/` і `/login`, server actions входу. Авторизація — `supabase.auth.getClaims()`.
- Next.js 16: `params` / `searchParams` — Promise; форми з повідомленнями — клієнтський компонент з `useActionState`; авторизацію перевіряємо в кожній server action (рендер сторінки — не межа безпеки).
- CI: job `app` (lint, typecheck, `npm test`, build) працює **без бази**; `db-check` лише застосовує міграції й сид на одноразовій базі. Тестів проти Postgres у CI немає (рішення розробника: юніт-тести + моки, D9).
- ADR ще немає; рішення D1–D9 фіксуємо як `docs/decisions/0001-slot-hold-data-model.md` і `docs/decisions/0002-test-strategy.md` у першій задачі.

## Goals / Non-Goals

**Goals:**
- Інваріант «в одному слоті не більше одного активного утримання або сеансу» і «утримання й сеанси клієнта не перетинаються» тримає база атомарно, навіть при одночасних запитах (AC-HOLD-04, AC-HOLD-25, AC-HOLD-36).
- Прострочення без фонової задачі: статус обчислюється з часу створення й поточного часу (AC-HOLD-05, AC-HOLD-06; `requirements/product.md`, «Що поза scope»).
- Уся доменна логіка часу й статусів — чисті функції з параметром `now`, які тестуються без бази.

**Non-Goals:**
- Екран керування користувачами й ролями (Q1, Sofiia-pm/therapy-scheduling-spec#13).
- Редагування доступності; доступність — лише сид.
- Інтеграційні тести проти Postgres у CI (див. Risks).

## Decisions

### D1. Ролі `admin` / `scheduler` / `therapist` (AC-HOLD-08, AC-HOLD-14, AC-HOLD-19, AC-HOLD-27)

Нова міграція змінює набір ролей за процедурою з шапки першої міграції: зняти `profiles_role_check` → `update profiles set role = 'therapist' where role = 'member'` → `default 'therapist'` → новий `profiles_role_check check (role in ('admin','scheduler','therapist'))`. Default — `therapist` як найменш привілейована роль. Новий хелпер `private.is_staff()` (`security definer`, `set search_path = ''`): `current_app_role() in ('admin','scheduler')`. `supabase/demo-users.json` — admin1, scheduler1, scheduler2, therapist1, therapist2 (`*@example.test`, Q1).

Альтернатива — окрема таблиця ролей: зайве для трьох фіксованих ролей.

### D2. Модель даних (AC-HOLD-01, AC-HOLD-02, AC-HOLD-12, AC-HOLD-16, AC-HOLD-34)

- `public.slots`: `id`, `therapist_id → profiles(id)`, `starts_at timestamptz`, `ends_at timestamptz` (= `starts_at + 60 хв`, check), `unique (therapist_id, starts_at)`. Слоти — лише сид (D8).
- `public.clients`: `id`, `full_name text` (check: `btrim(full_name) <> ''`), `email text` (check: `email = lower(btrim(email))` і містить `@`), `unique (email)`, `created_at`. Нормалізацію робить застосунок (D6), check і unique — останній рубіж (AC-HOLD-16, AC-HOLD-34, AC-HOLD-35).
- `public.holds`: `id`, `slot_id → slots`, `client_id → clients`, `created_at`, `expires_at`, `confirmed_at timestamptz null`. Сеанс = утримання з `confirmed_at is not null` (глосарій PM: підтвердження — момент, коли утримання стає сеансом); окремої таблиці сеансів немає.
- Статус не зберігається, а обчислюється: `confirmed_at` є → «Confirmed»; інакше `now < expires_at` → «Held»; інакше «Expired». Активне = Held або Confirmed.
- `created_at` обрізаємо до хвилини (`date_trunc('minute', now())`), `expires_at = created_at + interval '1440 minutes'`: точність до хвилини з «Припущень» PM, щоб о 14:29 було «Held», а о 14:30 — «Expired» (AC-HOLD-05, AC-HOLD-06), і щоб DST не впливав на тривалість.
- Повторне утримання після прострочення (Q2, у WS6 — варіант B) — новий рядок `holds`; старий «Expired» лишається й видно в списку до початку слоту.

Альтернатива — поле `status` + фонова задача прострочення: заборонено обмеженням платформи (cron на Hobby — раз на добу).

### D3. Запис лише через функції Postgres (AC-HOLD-03, AC-HOLD-04, AC-HOLD-07, AC-HOLD-08, AC-HOLD-13, AC-HOLD-14, AC-HOLD-17, AC-HOLD-22, AC-HOLD-23, AC-HOLD-25, AC-HOLD-26, AC-HOLD-27, AC-HOLD-36)

У supabase-js немає транзакцій, тому перевірка + запис — одна функція. Публічні обгортки `public.hold_slot(p_slot_id uuid, p_client_id uuid)` і `public.confirm_hold(p_hold_id uuid)` — `security invoker`, викликають `private.hold_slot_impl` / `private.confirm_hold_impl` (`security definer`, `set search_path = ''`). Ролі `authenticated` **не** даємо `insert` / `update` на `holds`: інакше планувальник обійшов би перевірки прямим запитом до таблиці.

`hold_slot` (порядок перевірок):
1. `private.is_staff()` інакше помилка `HOLD_FORBIDDEN` (AC-HOLD-08).
2. `select … from slots where id = p_slot_id for update` — блокування рядка слоту серіалізує одночасні утримання (AC-HOLD-04).
3. Активне утримання чи сеанс на слоті → `SLOT_UNAVAILABLE` (AC-HOLD-03, AC-HOLD-04, AC-HOLD-17).
4. `now() >= starts_at` → `SLOT_STARTED` (AC-HOLD-07). Для слоту, що і почався, і зайнятий, спрацьовує п. 3: користувач бачить «Held»/«Confirmed», і повідомлення «no longer available» йому відповідає; жоден AC цю комбінацію не описує.
5. `select … from clients where id = p_client_id for update` — серіалізує утримання одного клієнта в різних терапевтів; активне утримання чи сеанс клієнта, чий слот перетинається (`tstzrange(starts_at, ends_at, '[)') && …` — кінець одного в момент початку іншого не перетин, глосарій PM) → `CLIENT_OVERLAP` (AC-HOLD-25); прострочені не враховуються (AC-HOLD-26).
6. `insert` з `created_at`, `expires_at` (D2), повертає рядок (AC-HOLD-02).

`confirm_hold`:
1. `private.is_staff()` інакше `CONFIRM_FORBIDDEN` (AC-HOLD-14); будь-який планувальник чи адміністратор (AC-HOLD-19, AC-HOLD-27).
2. `select … from holds where id = p_hold_id for update` (AC-HOLD-36, одночасне підтвердження).
3. `confirmed_at` уже є → `HOLD_ALREADY_CONFIRMED` (AC-HOLD-36).
4. `now() >= expires_at` → `HOLD_EXPIRED` (AC-HOLD-13).
5. `now() >= starts_at` слоту → `SLOT_STARTED_CONFIRM` (AC-HOLD-22; о 09:59 — успіх, AC-HOLD-23).
6. `confirmed_at = now()` (AC-HOLD-12).

Код помилки — `raise exception '<CODE>'` з окремим `errcode`; server action мапить код у текст повідомлення PM (D6). Альтернатива — exclusion constraint: неможливий, бо «активне» залежить від `now()`.

Картку клієнта створюємо прямим `insert` у `clients` (одна операція): `grant insert (full_name, email)` і політика `with check (private.is_staff())`; порушення `unique` (`23505`) → `CLIENT_EMAIL_EXISTS` (AC-HOLD-16, AC-HOLD-34).

### D4. RLS і grants (AC-HOLD-09, AC-HOLD-21)

Кожна нова таблиця: `enable row level security`, `revoke all … from anon, authenticated`, явні `grant select`, політика на кожну операцію `to authenticated` з `(select auth.uid())`:
- `slots`: staff — усі; therapist — `therapist_id = (select auth.uid())`.
- `holds`: staff — усі; therapist — утримання на власних слотах (`exists` по `slots`).
- `clients`: staff — усі; therapist — клієнти з утриманням на його слотах (матриця прав «лише власні»).
- `profiles`: нова політика select для staff (усі профілі — список терапевтів); терапевт — лише свій рядок (наявна політика).

Сторінки додатково фільтрують за `therapist_id = claims.sub` (захист у глибину й тестовність без бази, D9).

### D5. Час (AC-HOLD-02, AC-HOLD-30, AC-HOLD-31; «Припущення» PM)

`src/lib/time.ts` — без нових залежностей, на `Intl.DateTimeFormat` з `timeZone: 'America/Los_Angeles'`: `formatPracticeDateTime(date) → 'YYYY-MM-DD HH:mm'`, `practiceDayRange(dateStr) → [startUtc, endUtc)`, `practiceWeekRange(dateStr) → понеділок–неділя`, `practiceToday(now)`. Межі дня й тижня обчислюємо через офсет зони на конкретну дату (DST-безпечно). Альтернатива — date-fns-tz чи Temporal-поліфіл: нова залежність без потреби.

### D6. Доменні модулі (чисті функції з `now`)

- `src/lib/holds/status.ts`: `holdStatus(hold, now)`, `slotStatus(slot, holds, now)` → `free | held | confirmed | past` (AC-HOLD-01, AC-HOLD-05, AC-HOLD-06, AC-HOLD-12, AC-HOLD-32); `dayView(slots, holds, now)` → `{ noFreeSlots: boolean, slots }` для «No free slots on this day.» (AC-HOLD-18, AC-HOLD-24, AC-HOLD-33); `holdsList(holds, now)` — «Held» і «Expired» до початку слоту, за часом слоту від найближчого (AC-HOLD-20, AC-HOLD-28, AC-HOLD-29; Q3); `therapistWeek(slots, holds, week, now)` — без прострочених (AC-HOLD-21, AC-HOLD-30, AC-HOLD-31).
- `src/lib/holds/messages.ts`: код помилки → текст PM дослівно.
- `src/lib/clients/validate.ts`: `normalizeEmail` (trim + lower, AC-HOLD-35), `validateClient(name, email)` — порожнє після trim ім'я або email без одного `@` з непорожніми частинами → «Enter the client's name and a valid email.» (AC-HOLD-11, AC-HOLD-15).

### D7. Сторінки й server actions

| Маршрут | Ролі | Що | AC |
|---|---|---|---|
| `/` | усі | редирект: staff → `/slots`, therapist → `/schedule` | — |
| `/clients?q=` | staff | форма створення + пошук за частиною імені чи email (`ilike`, власне припущення) | AC-HOLD-10, -11, -15, -16, -34, -35 |
| `/slots?therapist=&date=&q=` | staff | терапевт + день, слоти зі статусами, «Held until», форма утримання з вибором клієнта | AC-HOLD-01…08, -17, -18, -24, -25, -26, -32, -33 |
| `/holds` | staff | список утримань, кнопка «Confirm» | AC-HOLD-12, -13, -14, -19, -20, -22, -23, -27, -28, -29, -36 |
| `/schedule?week=` | therapist | тиждень пн–нд, попередній / наступний | AC-HOLD-09, -21, -30, -31 |

Server actions (`"use server"`, сигнатура `(prevState, formData)` для `useActionState`): `src/app/clients/actions.ts#createClient`, `src/app/slots/actions.ts#holdSlot`, `src/app/holds/actions.ts#confirmHold`. Кожна: `getClaims()` → роль із `profiles` → для не-staff одразу повідомлення відмови (AC-HOLD-08, AC-HOLD-14) → виклик `insert` / `rpc` → мапінг коду в повідомлення → `revalidatePath`. Сторінки staff для терапевта — редирект на `/schedule`.

### D8. Сид доступності

`supabase/seed.sql` (ідемпотентно, `on conflict (therapist_id, starts_at) do nothing`): для профілів therapist1@example.test і therapist2@example.test — слоти пн–пт 09:00–17:00 (по 60 хв) у часовому поясі практики на 2026-10-26 – 2026-11-29 (`generate_series` + `at time zone 'America/Los_Angeles'`). Користувачів сид не створює: спершу `npm run users:demo`, потім `db-deploy` з `include_seed`.

### D9. Тести (рішення розробника; ADR 0002)

Vitest без бази: (1) юніт-тести чистих функцій D5–D6 з фіксованим `now`; (2) тести server actions з `vi.mock('@/lib/supabase/server')`: фейковий клієнт повертає роль і результат / код помилки RPC, тест перевіряє повідомлення PM і що виклик відбувся з потрібними аргументами. Назви тестів починаються з AC ID. Атомарність (AC-HOLD-04, AC-HOLD-36) гарантує блокування в D3; тест перевіряє, що друга відповідь з `SLOT_UNAVAILABLE` / `HOLD_ALREADY_CONFIRMED` дає правильне повідомлення.

## Risks / Trade-offs

- [SQL-логіка `hold_slot` / `confirm_hold` і RLS не тестуються в CI] → `db-check` перевіряє, що міграція застосовується; у кожній задачі з міграцією — ручна перевірка сценаріїв AC на Preview / прод із синтетичними користувачами (запис у PR); пізніше — окремий workflow з тестами проти Postgres (новий ADR).
- [Блокування `for update` на слоті й клієнті] → короткі транзакції, порядок блокувань завжди слот → клієнт, тож взаємоблокувань немає.
- [`now()` бази й `new Date()` застосунку розходяться на секунди] → рішення приймає лише база; застосунок обчислює статус для показу, і на межі хвилини показ може відставати до наступного оновлення сторінки.
- [Старі демо-користувачі `member*` у проді] → міграція переводить їх у `therapist`; доступу до чужих даних вони не отримують.

## Migration Plan

Одна міграція на задачу, що змінює схему (`npx supabase migration new …`), застосовує лише CI (`db-deploy`) після merge. Після першої міграції з ролями — `npm run users:demo`; після міграції зі слотами — `db-deploy` з `include_seed`. Типи — `database.types.ts` із Summary `db-check`. Відкат — новою міграцією (дані синтетичні).
