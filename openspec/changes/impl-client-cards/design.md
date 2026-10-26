# Design

## Context

- Специфікація зрізу — `openspec/specs/client-cards` (AC-CARD-01…06, 08…10) і `openspec/specs/app-access` (AC-CARD-07, AC-CARD-11); навіщо — `proposal.md`.
- Наявна схема (зріз 1, ADR 0001): `public.profiles.role text not null default 'therapist'` з `check (role in ('admin','scheduler','therapist'))`; хелпери `private.current_app_role()` і `private.is_staff()` (NULL-safe); `public.clients (id, full_name, email not null unique, created_at)` з check-обмеженнями імені й email; `public.slots`, `public.holds` (сеанс = `confirmed_at is not null`, статус обчислюється з `expires_at` і `now()`).
- Політики `clients` зараз: `clients_select_staff` (staff — усі), `clients_insert_staff` (`with check (private.is_staff())`), `clients_select_own_therapist` — терапевт бачить клієнта з **будь-яким** утриманням на своїх слотах, зокрема простроченим. Це порушує AC-CARD-08, тож політику замінюємо (D3).
- Новий користувач Auth зараз отримує роль `therapist` (default колонки): користувач без ролі з AC-CARD-11 неможливий, а кожен новий акаунт став би терапевтом. Тому набір ролей змінюємо (D1).
- Дизайн-система вже в `main` (PR pavmys/therapy-scheduling#18): `DESIGN.md`, компоненти `@/components/ui`, `npm run check:design`.
- CI job `app` — без бази; ADR 0002 — юніт-тести й моки. WS7 вимагає тест **на рівні бази** на кожен відмовний AC, тому додаємо PGlite (D6) — новий ADR, що замінює 0002 у частині тестів доступу.
- Відповідей PM на питання до вимоги #19 ще немає; де рішення залежить від відповіді — позначено «до відповіді PM» з посиланням на issue.

## Goals / Non-Goals

**Goals:**
- Права тримає база: RLS, явні GRANT і column grants; Server Action перевіряє роль до запису; proxy і сторінки — лише UX.
- Тест на рівні бази на кожен відмовний AC (AC-CARD-05, -06, -07, -08, -11), який червоніє, якщо послабити політику чи GRANT.
- Сторінки зрізу — лише компоненти `@/components/ui` і токени з `DESIGN.md`.

**Non-Goals:**
- Редагування й архівування картки, картка пари чи сім'ї, страхування й документи (Non-goals специфікації).
- Керування ролями в застосунку; Admin API і `SUPABASE_SECRET_KEY` у Vercel не потрібні (D5).
- E2E-тести (WS8).

## UI і компоненти

Сторінки (усі — `Card`, `Table`, `Button`, `Input`, `Label`, `NativeSelect`, `ActionMessage` з `@/components/ui`; кольори — лише токени `DESIGN.md`):

| Сторінка | Хто | Що бачить | AC |
|---|---|---|---|
| `/clients` | scheduler, admin | список усіх карток (`Table`: ім'я, тип, мова, email клієнта або «Guardian: <email>»), пошук наявного (зріз 1), кнопка «New client card» → `/clients/new` | AC-CARD-10 |
| `/clients` | therapist | лише свої клієнти (`Table`: ім'я, тип, мова, дата народження); порожній стан — `text-muted-foreground`: «No clients yet. Clients appear here when a scheduler holds a slot with you.» | AC-CARD-04, AC-CARD-08, AC-CARD-09 |
| `/clients/new` | scheduler, admin | форма картки: тип «Adult» / «Child» (`NativeSelect`), ім'я, дата народження (`Input type="date"`), мова «English» / «Spanish»; для «Adult» — email клієнта, для «Child» — ім'я та email опікуна. Помилка — `ActionMessage` (destructive) з текстом PM, введене лишається у формі (`useActionState` повертає значення полів) | AC-CARD-01, AC-CARD-02, AC-CARD-03 |
| `/clients/new` | therapist | без форми — `ActionMessage` (destructive) «Only schedulers and admins can create client cards.» (до відповіді PM на Sofiia-pm/therapy-scheduling-spec#24 — варіант «форми не показано»; відмову дії тримає Server Action) | AC-CARD-06 |
| `/clients/[id]` | усі ролі | картка (`Card` + `dl`): тип, ім'я, дата народження, мова, email або дані опікуна; відсутні поля старих карток — «Not provided» (`text-muted-foreground`). Картку не знайдено під RLS (чужа, прострочене утримання, неіснуюча) — лише `ActionMessage` з іконкою `Lock`: «You don't have access to this client.», без імен і назв полів (неіснуюча для staff — до відповіді PM на Sofiia-pm/therapy-scheduling-spec#28) | AC-CARD-05, AC-CARD-08 |
| `/slots` (форма утримання) | scheduler, admin | у виборі клієнта — «Ім'я (email)» для дорослого, «Ім'я (guardian: email опікуна)» для дитини; пошук — за ім'ям, email клієнта **і** email опікуна (до відповіді PM на Q6, Sofiia-pm/therapy-scheduling-spec#31) | AC-CARD-01, AC-CARD-02 |
| будь-яка сторінка | увійшов без ролі | лише `ActionMessage` «Your account has no access yet. Contact an administrator.» і кнопка «Sign out» (до відповіді PM на Sofiia-pm/therapy-scheduling-spec#29); жодних даних і навігації | AC-CARD-11 |
| будь-яка сторінка | не увійшов | редирект на `/login` (proxy — UX; сторінка й так перевіряє `getCurrentUser()`) | AC-CARD-07 |

- Шапка (`StaffNav`) для терапевта: «My schedule», «My clients». Для staff — як зараз.
- Тексти помилок форми: AC-CARD-03 — дослівно «Enter the guardian's name and a valid email.»; для дорослого — наявні тексти зрізу 1 («Enter the client's name and a valid email.», «A client with this email already exists.»). Порожні ім'я дитини, дата народження чи мова й дата в майбутньому — тексту PM немає (Sofiia-pm/therapy-scheduling-spec#21): до відповіді — власний текст розробника «Fill in all fields. The date of birth can't be later than today.» і відмова без запису (після відповіді — текст PM).
- Порожній список для staff (Sofiia-pm/therapy-scheduling-spec#27) — до відповіді PM лишається «No clients found.» зрізу 1.
- Логіка вибору тексту порожнього стану й підпису клієнта — чисті функції `src/lib/clients/view.ts` (`clientsEmptyMessage(role)`, `clientOptionLabel(client)`, `cardFields(client)`), щоб AC-CARD-02 і AC-CARD-09 мали тест без браузера.

## Дані й RLS

### D1. Користувач без ролі — `role` NULL (AC-CARD-11)

Окрема міграція `profiles_role_nullable`, порядок **drop-first** (шапка `20261012000000_profiles_and_roles.sql`):

1. `alter table public.profiles drop constraint profiles_role_check;`
2. дані: наявних рядків не змінюємо (у всіх користувачів сиду роль є);
3. `alter table public.profiles alter column role drop default, alter column role drop not null;` — тригер `on_auth_user_created` вставляє профіль без ролі;
4. `alter table public.profiles add constraint profiles_role_check check (role is null or role in ('admin','scheduler','therapist'));`

`private.current_app_role()` повертає NULL, `private.is_staff()` — false (NULL-safe з ADR 0001): жодна політика не пропускає користувача без ролі. Колонковий `grant update (full_name)` на `profiles` **не** розширюємо: пастку «update own row + `role`» закриває column grant, тест — AC-CARD-11 (користувач без ролі не ставить собі `admin`).

`supabase/demo-users.json` у тому самому PR: `newuser1@example.test` з `"role": null` і акаунти для PM `pm-admin@`, `pm-scheduler@`, `pm-therapist@example.test`; `scripts/create-demo-users.mjs` приймає `role: null`.

### D2. Колонки картки клієнта (AC-CARD-01, AC-CARD-02, AC-CARD-03)

Міграція `client_cards`:

- `client_type text not null default 'adult'` з `check (client_type in ('adult','child'))` — default робить старі картки зрізу 1 типом «Adult» («Припущення» PM).
- `date_of_birth date null`, `session_language text null` з `check (session_language in ('English','Spanish'))`, `guardian_name text null`, `guardian_email text null`.
- `email` — `drop not null` (у дитини власного email немає); `unique (email)` лишається (NULL не конфліктують); наявний `clients_email_check` NULL пропускає.
- `clients_card_shape_check`: для `adult` — `email is not null and guardian_name is null and guardian_email is null`; для `child` — `email is null`, `guardian_name` непорожнє без пробілів по краях і `guardian_email` за тим самим правилом коректного email, що й `clients_email_check` («правило коректного email діє й для email опікуна»).
- `clients_card_complete_check check (date_of_birth is not null and session_language is not null) not valid` — `not valid` не перевіряє старі картки («Not provided»), але діє для кожного нового `insert`. Дата «не пізніше за сьогодні» (America/Los_Angeles) — у Server Action (D4), бо check з `current_date` залежить від часу.
- GRANT: `revoke` уже є; `grant insert (client_type, full_name, email, date_of_birth, session_language, guardian_name, guardian_email)`; `update` і `delete` для `authenticated` не даємо (редагування поза зрізом) — `id`, `created_at` заповнюють defaults.

Повна картка обов'язкова й для створення з полів зрізу 1: AC-HOLD-10, -11, -15, -16, -34, -35, -39, -41 перевіряємо в тій самій формі з рештою полів, заповнених правильно (до відповіді PM на Sofiia-pm/therapy-scheduling-spec#20, рекомендований там варіант A).

### D3. «Свій клієнт» — хелпер у `private` і політика select (AC-CARD-04, AC-CARD-05, AC-CARD-08, AC-CARD-10)

Міграція `own_clients`:

- `private.is_own_client(p_client_id uuid) returns boolean` — `security definer`, `set search_path = ''`, `stable`: `exists` утримання клієнта на слоті терапевта `(select auth.uid())` з `confirmed_at is not null` («Confirmed») **або** `confirmed_at is null and expires_at > now()` («Held»). `revoke execute … from public, anon`, `grant execute … to authenticated`. Читає `holds` і `slots` в обхід RLS — без вкладених політик.
- `drop policy clients_select_own_therapist` (пускала й прострочені утримання) → `create policy clients_select_own_therapist on public.clients for select to authenticated using ((select private.current_app_role()) = 'therapist' and (select private.is_own_client(clients.id)))`.
- `clients_select_staff` (усі картки для scheduler і admin, AC-CARD-10) і `clients_insert_staff` (AC-CARD-06) — без змін; політик update і delete немає (і GRANT немає).
- «Held» після початку слоту лишає клієнта своїм (текст PM; Sofiia-pm/therapy-scheduling-spec#25 — до відповіді), минулий «Confirmed» — теж (Q5, коментар у #25 — до відповіді).
- Розклад терапевта (зріз 1) читає імена лише клієнтів з «Held» і «Confirmed» — нова політика їх пропускає (AC-HOLD-09, AC-HOLD-40 не змінюються).

Кожна політика — на одну операцію, `to authenticated`, з `(select auth.uid())` у хелпері; `for all` не використовуємо.

## Auth

### D4. Перевірка в кожній дії й сторінці (AC-CARD-03, AC-CARD-06, AC-CARD-07, AC-CARD-11)

- **proxy** (`src/proxy.ts`) лише оновлює сесію й перенаправляє без входу на `/login` — UX, не захист.
- **Сторінки** беруть `getCurrentUser()` (`src/lib/auth.ts`: `getClaims()` → роль з `public.profiles` за `claims.sub`, ніколи з `user_metadata`): немає користувача → `redirect("/login")` (AC-CARD-07); роль NULL → екран «Your account has no access yet. Contact an administrator.» (AC-CARD-11). Спільний хелпер `src/lib/access.ts` (`accessFor(user)` → `login` | `no-role` | роль) — чиста функція з тестом.
- **Server Action** `createClientCard` (`src/app/clients/actions.ts`): 1) `getCurrentUser()` (`getClaims()`); немає — відмова без запису; 2) роль не `scheduler`/`admin` → «Only schedulers and admins can create client cards.» без запису (AC-CARD-06); 3) валідація `src/lib/clients/validate.ts` (тип, ім'я, дата ≤ сьогодні в America/Los_Angeles, мова, email дорослого або ім'я та email опікуна → «Enter the guardian's name and a valid email.», AC-CARD-03); 4) `insert` серверним клієнтом користувача — діють RLS (`clients_insert_staff`) і column grants. `23505` → «A client with this email already exists.», `23514` → текст валідації.
- Читання карток — лише клієнтом користувача під RLS; `id` з URL нічого не відкриває сам (жодного IDOR): чужа картка повертає 0 рядків.
- `getSession()` не використовуємо; `middleware.ts` не створюємо.

### D5. Admin-клієнт не потрібен

Ролі — сид, користувачів створює локальний `npm run users:demo` (`scripts/`). `src/lib/supabase/admin.ts` не створюємо; `SUPABASE_SECRET_KEY` у Vercel не додаємо. `npm run check:boundary` (`architecture.yml`) охороняє, щоб ключ не з'явився в `src/`.

### D6. Тести доступу на PGlite (усі відмовні AC)

- `npm i -D -E @electric-sql/pglite@0.5.8` (нова dev-залежність — з ADR); `tests/db/supabase-pglite.ts` — з демо (`koldovsky/2026-quitcode-06-leave-portal-demo@48337f0`, посилання в описі PR), адаптовано: міграції + `seed.sql`, користувачі з `supabase/demo-users.json`, `asUser`, `asService`, новий `asAnon`.
- `tests/db/client-cards.test.ts` — AC-CARD-04, -05, -06, -08, -10 (терапевт / чужий терапевт / staff; відмова — 0 рядків або `rejects.toThrow`, і незмінні дані через `asService`); `tests/db/app-access.test.ts` — AC-CARD-07 (`asAnon` → `permission denied`), AC-CARD-11 (без ролі — 0 карток, `insert` відхилено, `update profiles set role` → `permission denied`, роль лишається NULL).
- Server Action — тести з моком (як у зрізі 1): AC-CARD-01, -02, -03, -06 (терапевт → повідомлення, `insert` не викликано).
- Чисті функції: `clientsEmptyMessage` (AC-CARD-09), `clientOptionLabel` (AC-CARD-02), `accessFor` (AC-CARD-07, AC-CARD-11).
- Мутаційна перевірка в кожному PR задачі: послаблена умова (`using (true)`, тимчасовий `grant update (full_name, role)`, прибрана перевірка ролі в дії) → відповідний тест червоний → повернути; щонайменше два червоні прогони CI (коміт `mutation: …` → revert) — AC-CARD-11 і AC-CARD-05/08.

Кандидати в ADR: D6 (PGlite, замінює 0002 у частині тестів доступу) і D3 («свій клієнт» — хелпер `private` + RLS проти фільтра в Server Action); ADR посилається на `check:boundary` у `architecture.yml` і тести з AC ID.

## Risks / Trade-offs

- [PM відповість інакше на #20, #21, #24, #25, #27, #28, #29, Q4–Q6] → кожне таке місце позначене вище; зміна після відповіді — `/requirements-sync` і нова зміна специфікації, код — окремим PR.
- [AC-HOLD-40: «окремого списку клієнтів у зрізі 1 немає»] → тест у `src/app/clients/page.test.ts` (редирект терапевта з `/clients`) прибираємо разом зі сторінкою своїх клієнтів; частину «лише ім'я без email у розкладі» і далі охороняє `src/lib/schedule/load.test.ts`. Рядок матриці AC-HOLD-40 оновлюємо в тому самому PR (Q4, Sofiia-pm/therapy-scheduling-spec#30).
- [`not valid` check] → старі картки не перевіряються; нові без дати чи мови відхиляє база. Якщо PM вирішить (#20) лишити швидке створення — check знімаємо новою міграцією.
- [PGlite спрощує Auth і JWT] → налаштування хмарного проєкту не перевіряє; на проді — ручна перевірка ролями PM (трек E).
