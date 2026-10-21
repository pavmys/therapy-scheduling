# Tasks

Кожна група — одна задача й один PR «Реалізація» (`task/<коротко>`): код, міграція (якщо є), тести з AC ID, рядки `docs/conformance.md` і галочки цього файлу в тому самому PR. Перед комітом — `npm run lint`, `npm run typecheck`, `npm test`, `npm run ac:coverage`.

## 1. Ролі й картки клієнтів (`task/clients`)

- [ ] 1.1 Записати `docs/decisions/0001-slot-hold-data-model.md` (D1–D4, D8) і `docs/decisions/0002-test-strategy.md` (D9); перевірити, що кожен ADR посилається на AC ID
- [ ] 1.2 Міграція `roles_and_clients`: ролі admin / scheduler / therapist за процедурою D1, `private.is_staff()`, нова політика select `profiles` для staff, таблиця `clients` з check, unique, grants і RLS (D2, D4); перевірити: `node scripts/check-migration-order.mjs` і зелений `db-check`
- [ ] 1.3 `supabase/demo-users.json` — admin1, scheduler1, scheduler2, therapist1, therapist2; після merge `npm run users:demo` створює всіх п'ятьох без помилок
- [ ] 1.4 `src/lib/clients/validate.ts` (D6) з юніт-тестами AC-HOLD-11, AC-HOLD-15, AC-HOLD-35; перевірити: `npm test`
- [ ] 1.5 `/` редиректить за роллю (D7); `/clients` — форма (`useActionState`) і пошук за частиною імені чи email; `createClient` мапить `23505` у «A client with this email already exists.»; тести action з моком Supabase — AC-HOLD-10, AC-HOLD-16, AC-HOLD-34; перевірити: `npm test`
- [ ] 1.6 Рядки `docs/conformance.md` для AC задачі → «реалізовано»; ручна перевірка на Preview синтетичним scheduler1 (створення й дублікат); перевірити: `npm run ac:coverage`

Done when: AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16, AC-HOLD-34, AC-HOLD-35

## 2. Слоти дня й утримання (`task/slot-holds`)

- [ ] 2.1 Міграція `slots_and_holds`: таблиці `slots`, `holds`, grants і RLS (D2, D4), функції `public.hold_slot` → `private.hold_slot_impl` з порядком перевірок D3; перевірити: зелений `db-check`
- [ ] 2.2 `supabase/seed.sql` — слоти therapist1 і therapist2 (D8); після merge `db-deploy` з `include_seed`, слоти видно в проді
- [ ] 2.3 `src/lib/time.ts` (D5) з юніт-тестами формату «YYYY-MM-DD HH:mm», меж дня й переходу DST у America/Los_Angeles; перевірити: `npm test`
- [ ] 2.4 `src/lib/holds/status.ts` і `messages.ts` (D6): `holdStatus`, `slotStatus`, `dayView`; юніт-тести AC-HOLD-01, AC-HOLD-05, AC-HOLD-06, AC-HOLD-18, AC-HOLD-24, AC-HOLD-32, AC-HOLD-33; перевірити: `npm test`
- [ ] 2.5 `/slots` — вибір терапевта й дня, слоти зі статусами й «Held until», форма утримання з вибором клієнта; `holdSlot` мапить коди D3 у повідомлення; тести action з моком — AC-HOLD-02, AC-HOLD-03, AC-HOLD-04, AC-HOLD-07, AC-HOLD-08, AC-HOLD-17, AC-HOLD-25, AC-HOLD-26; перевірити: `npm test`
- [ ] 2.6 Рядки `docs/conformance.md` → «реалізовано»; ручна перевірка на Preview: утримання, повторне утримання, утримання двома вкладками одночасно (одне успішне); перевірити: `npm run ac:coverage`

Done when: AC-HOLD-01, AC-HOLD-02, AC-HOLD-03, AC-HOLD-04, AC-HOLD-05, AC-HOLD-06, AC-HOLD-07, AC-HOLD-08, AC-HOLD-17, AC-HOLD-18, AC-HOLD-24, AC-HOLD-25, AC-HOLD-26, AC-HOLD-32, AC-HOLD-33

## 3. Список утримань і підтвердження (`task/confirm-hold`)

- [ ] 3.1 Міграція `confirm_hold`: `public.confirm_hold` → `private.confirm_hold_impl` з порядком перевірок D3; перевірити: зелений `db-check`
- [ ] 3.2 `holdsList` у `src/lib/holds/status.ts` (D6, Q3) з юніт-тестами AC-HOLD-12, AC-HOLD-20, AC-HOLD-28, AC-HOLD-29; перевірити: `npm test`
- [ ] 3.3 `/holds` — список і кнопка «Confirm»; `confirmHold` мапить коди D3; тести action з моком — AC-HOLD-13, AC-HOLD-14, AC-HOLD-19, AC-HOLD-22, AC-HOLD-23, AC-HOLD-27, AC-HOLD-36; перевірити: `npm test`
- [ ] 3.4 Рядки `docs/conformance.md` → «реалізовано»; ручна перевірка на Preview: підтвердження scheduler2 утримання scheduler1, повторне підтвердження, прострочене; перевірити: `npm run ac:coverage`

Done when: AC-HOLD-12, AC-HOLD-13, AC-HOLD-14, AC-HOLD-19, AC-HOLD-20, AC-HOLD-22, AC-HOLD-23, AC-HOLD-27, AC-HOLD-28, AC-HOLD-29, AC-HOLD-36

## 4. Розклад терапевта (`task/therapist-schedule`)

- [ ] 4.1 `therapistWeek` і `practiceWeekRange` (D5, D6) з юніт-тестами AC-HOLD-21, AC-HOLD-30, AC-HOLD-31; перевірити: `npm test`
- [ ] 4.2 `/schedule?week=` — тиждень пн–нд, попередній / наступний, фільтр `therapist_id = claims.sub` поверх RLS; тест завантаження даних з моком — AC-HOLD-09; перевірити: `npm test`
- [ ] 4.3 Рядки `docs/conformance.md` → «реалізовано»; ручна перевірка на Preview: therapist1 не бачить утримань therapist2; перевірити: `npm run ac:coverage` (усі 36 «реалізовано»)

Done when: AC-HOLD-09, AC-HOLD-21, AC-HOLD-30, AC-HOLD-31

## Workflow follow-up

- В останньому PR зрізу (задача 4): `npx openspec archive impl-hold -y` і запис екрана з прод-URL.
- Після оновлення вимог PM для WS7 (Q2, Q3 — Sofiia-pm/therapy-scheduling-spec#14, #15): нова зміна специфікації й перехід на варіант A для Q2.
