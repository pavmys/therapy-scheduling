# Tasks

Кожна група — одна задача й один PR «Реалізація» (`task/<коротко>`): міграція (якщо є), дія, сторінка, тести з AC ID, мутаційна перевірка, рядки `docs/conformance.md` і галочки цього файлу в тому самому PR. Перед комітом — `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run ac:coverage`, `npm run spec:check`, `npm run check:design`, `npm run check:boundary`, `node scripts/check-migration-order.mjs`. Після merge — зелений `db-deploy`.

## 1. Користувач без ролі й тести бази (`task/no-role-access`)

- [x] 1.1 ADR `docs/decisions/0004-db-access-tests-pglite.md` (D6, статус «замінює 0002» у частині тестів доступу): контекст, ≥2 варіанти з «чому ні», наслідки, «Як перевіряємо»
- [x] 1.2 `@electric-sql/pglite@0.5.8` (dev, `-E`) і `tests/db/supabase-pglite.ts` з демо, адаптований (`asUser`, `asService`, `asAnon`, користувачі з `demo-users.json`); джерело — в описі PR
- [x] 1.3 Міграція `profiles_role_nullable` (D1, drop-first): спершу перестворити `slots_select_staff_or_own`, `holds_select_staff_or_own_slot` і `clients_select_own_therapist` з перевіркою ролі `therapist` у гілці терапевта; потім `role` без default і `not null`, новий `profiles_role_check`; `supabase/demo-users.json` — newuser1 (`role: null`), pm-admin, pm-scheduler, pm-therapist; `scripts/create-demo-users.mjs` приймає `null`
- [x] 1.4 `src/lib/access.ts` (`accessFor`) і екран без ролі на `/` та сторінках `/slots`, `/holds`, `/clients`, `/schedule` (лише повідомлення PM і «Sign out»); тест `accessFor` — AC-CARD-07, AC-CARD-11
- [x] 1.5 `tests/db/app-access.test.ts`: AC-CARD-07 (`asAnon` до `clients` і `holds` → відмова, дані не змінились), AC-CARD-11 (без ролі — 0 карток, `insert` відхилено, `update profiles set role = 'admin'` → `permission denied`, роль лишається NULL; терапевт з утриманням, з якого знято роль, — 0 карток, утримань і слотів, дані не змінились)
- [x] 1.6 Мутаційна перевірка: тимчасовий `grant update (full_name, role)` у новій міграції → AC-CARD-11 (самопризначення ролі) червоний; прибрана перевірка ролі в перествореній політиці → AC-CARD-11 (терапевт без ролі) червоний; червоний прогін CI на коміті `mutation: …`, потім revert; таблиця «AC → що прибрали → який тест упав» в описі PR
- [ ] 1.7 Рядки `docs/conformance.md` AC-CARD-07, AC-CARD-11 → «реалізовано»; після merge — `npm run users:demo`, акаунти pm-… для PM (паролі — лише в чаті)

Done when: AC-CARD-07, AC-CARD-11

## 2. Картка клієнта з анкети (`task/client-card-form`)

- [x] 2.1 Міграція `client_cards` (D2): колонки картки, `email` без `not null`, `clients_card_shape_check`, `clients_card_complete_check … not valid`, `grant insert` лише на колонки картки, без `update` і `delete`
- [x] 2.2 `src/lib/clients/validate.ts`: тип, ім'я, дата народження ≤ сьогодні (America/Los_Angeles), мова, email дорослого або ім'я та email опікуна; юніт-тести AC-CARD-03 і наявні AC-HOLD-11, -15, -35, -39, -41 з повною карткою
- [x] 2.3 `createClientCard` (D4): `getCurrentUser()` → роль → валідація → `insert`; повідомлення PM; `useActionState` повертає введені значення; тести дії з моком — AC-CARD-01, AC-CARD-02, AC-CARD-03, AC-CARD-06 (терапевт: повідомлення, `insert` не викликано), AC-HOLD-10, -16, -34
- [x] 2.4 Сторінки: `/clients/new` (форма Adult / Child на `@/components/ui`; для терапевта — лише повідомлення), `/clients` для staff — таблиця всіх карток; вибір клієнта на `/slots` — `clientOptionLabel` з email опікуна, пошук і за `guardian_email`; тест `clientOptionLabel` — AC-CARD-02
- [x] 2.5 `tests/db/client-cards.test.ts`: AC-CARD-06 (терапевт `insert` → відмова, кількість карток та сама), AC-CARD-10 (scheduler2 і admin1 бачать усі три картки, у дитини — дані опікуна)
- [x] 2.6 Мутаційна перевірка: прибрати перевірку ролі в `createClientCard` → AC-CARD-06 (дія) червоний; таблиця в описі PR
- [ ] 2.7 Рядки `docs/conformance.md` AC-CARD-01, -02, -03, -06, -10 → «реалізовано»; ручна перевірка на Preview: дорослий, дитина, помилка опікуна

Done when: AC-CARD-01, AC-CARD-02, AC-CARD-03, AC-CARD-06, AC-CARD-10

## 3. Свої клієнти терапевта (`task/therapist-own-clients`)

- [x] 3.1 ADR `docs/decisions/0005-own-clients-rls.md` (D3): хелпер `private.is_own_client` + RLS проти фільтра в Server Action і проти окремої таблиці «терапевт — клієнт»; «Як перевіряємо» — тести AC-CARD-05, AC-CARD-08 і `check:boundary`
- [x] 3.2 Міграція `own_clients` (D3): `private.is_own_client` (`security definer`, `set search_path = ''`, `revoke … from public, anon`), заміна `clients_select_own_therapist` (лише «Held» і «Confirmed»)
- [x] 3.3 Сторінки: `/clients` для терапевта — свої клієнти й порожній стан; `/clients/[id]` — картка з «Not provided» або «You don't have access to this client.» без даних; `StaffNav` терапевта; тест `clientsEmptyMessage` — AC-CARD-09; прибрати тест редиректу терапевта з `/clients` (AC-HOLD-40 у `src/app/clients/page.test.ts`), рядок AC-HOLD-40 у матриці — на `src/lib/schedule/load.test.ts`
- [x] 3.4 `tests/db/client-cards.test.ts`: AC-CARD-04 (therapist1 бачить client6 і client7 з даними опікуна, не бачить client9), AC-CARD-05 (therapist1 → 0 рядків client9, картка не змінилась), AC-CARD-08 (прострочене утримання → 0 рядків)
- [ ] 3.5 Мутаційна перевірка: `using (true)` у новій політиці → AC-CARD-05 і AC-CARD-08 червоні; червоний прогін CI на коміті `mutation: …`, потім revert; таблиця в описі PR
- [ ] 3.6 Рядки `docs/conformance.md` AC-CARD-04, -05, -08, -09 → «реалізовано»; скріни за ролями `docs/img/ws7-role-*.png` в описі PR; `npx openspec archive impl-client-cards -y` в останньому PR зрізу

Done when: AC-CARD-04, AC-CARD-05, AC-CARD-08, AC-CARD-09
