# Матриця відповідності (AC → код → тест → статус)

<!--
Ваша матриця: один рядок на кожен AC з openspec/specs/** — вашої специфікації, у яку ви перекладаєте вимоги PM
(їхній знімок у requirements/ приносить команда агента /requirements-sync).
Рядок «Вимоги» під цим коментарем заповнює лише /requirements-sync: адреса репо вимог PM, звідки взято вимоги (issues
або файли docs/), і дата знімка, через « · ». Руками його не змінюйте: з нього /requirements-sync знає, звідки брати
вимоги наступного разу, а скіли spec-clarify, spec-review і /conformance — куди ставити питання й яку версію вимог ви
реалізуєте. Рядків таблиці /requirements-sync не додає.
Рядки змінюєте ви:
  PR «Специфікація» — після archive зміни: рядок кожного нового AC зі статусом «відкладено (чекає реалізації)»; рядки AC,
                      прибраних зі специфікації (REMOVED), — видалити;
  PR «Реалізація»   — рядок AC задачі в тому самому PR, що й код і тест.
Перебудувати автоматично: /conformance (Claude Code, Cursor).
Перевірка в CI: npm run ac:coverage — падає, якщо
  NO-ROW     AC є в специфікації, а рядка немає (типово — PR «Специфікація» без нових рядків або рядок видалено);
  MISSING    статус «реалізовано», а непропущеного тесту, назва якого починається з цього AC ID, у файлах
             *.test.ts / *.test.tsx немає (*.spec.ts і допоміжні файли Vitest не запускає — вони не рахуються);
  ORPHAN     тест посилається на AC, якого немає в специфікації (AC прибрано або вимогу PM ще не перекладено);
  BAD-STATUS статус не «реалізовано» і не «відкладено (причина)»;
  WRONG-REF  шляху `src/…`/`tests/…`/`supabase/…` з колонок «Код»/«Тест» немає або тест із цим AC в іншому файлі;
і попереджає, не падаючи: AC з вимог PM (requirements/), якого ще немає в openspec/specs/, — «вимогу PM ще не перекладено
в специфікацію».

Приклад рядків (усередині коментаря — скрипт їх не читає):
| AC-LEAVE-02 | заявка на дві посади дає два записи main і additional | `src/app/requests/actions.ts` (createRequest) | `tests/requests.test.ts` | реалізовано |
| AC-LEAVE-04 | заблоковані дні не рахуються | — | — | відкладено (чекаю відповідь PM на Q2, <pm>/<team-slug>-spec#5) |
| AC-LEAVE-07 | менеджер бачить лише свій відділ | — | — | відкладено (рішення PM: поза зрізом 1, <pm>/<team-slug>-spec#8) |
| AC-LEAVE-10 | діапазон лише із заблокованих днів | — | — | відкладено (чекає реалізації) |
-->

Вимоги: https://github.com/Sofiia-pm/therapy-scheduling-spec · джерело: issues · знімок 2026-10-26

| AC | Що перевіряє | Код | Тест | Статус |
|---|---|---|---|---|
| AC-HOLD-10 | Створення клієнта з іменем і email | `src/app/clients/actions.ts` (createClientCard) | `src/app/clients/actions.test.ts` | реалізовано |
| AC-HOLD-11 | Порожнє ім'я клієнта | `src/lib/clients/validate.ts` (validateClient) | `src/lib/clients/validate.test.ts` | реалізовано |
| AC-HOLD-15 | Email без знака @ | `src/lib/clients/validate.ts` (validateClient) | `src/lib/clients/validate.test.ts` | реалізовано |
| AC-HOLD-39 | Некоректні форми email | `src/lib/clients/validate.ts` (validateClient), `supabase/migrations/20261023091653_client_email_and_name_rules.sql` | `src/lib/clients/validate.test.ts` | реалізовано |
| AC-HOLD-16 | Дублікат email | `src/app/clients/actions.ts` (createClientCard) | `src/app/clients/actions.test.ts` | реалізовано |
| AC-HOLD-34 | Дублікат email з іншим регістром і пробілами | `src/app/clients/actions.ts` (createClientCard) | `src/app/clients/actions.test.ts` | реалізовано |
| AC-HOLD-35 | Email зберігається малими літерами без пробілів | `src/lib/clients/validate.ts` (normalizeEmail) | `src/lib/clients/validate.test.ts` | реалізовано |
| AC-HOLD-41 | Ім'я з пробілами | `src/lib/clients/validate.ts` (validateClient), `supabase/migrations/20261023091653_client_email_and_name_rules.sql` | `src/lib/clients/validate.test.ts` | реалізовано |
| AC-HOLD-01 | Вільний, утриманий і підтверджений слоти | `src/lib/holds/status.ts` (dayView) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-32 | Слоти, що вже почалися, мають статус «Past» | `src/lib/holds/status.ts` (slotStatus) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-18 | Усі слоти дня утримані або підтверджені | `src/lib/holds/status.ts` (dayView) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-24 | День без жодного слоту | `src/lib/holds/status.ts` (dayView) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-33 | Слоти «Past», «Held» і «Confirmed» без вільних | `src/lib/holds/status.ts` (dayView) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-02 | Утримання вільного слоту | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261022042804_slots_and_holds.sql` (hold_slot) | `src/app/slots/actions.test.ts` | реалізовано |
| AC-HOLD-03 | Слот уже утримано за іншим клієнтом | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261022042804_slots_and_holds.sql` (hold_slot) | `src/app/slots/actions.test.ts` | реалізовано |
| AC-HOLD-04 | Одночасне утримання двома планувальниками | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261022042804_slots_and_holds.sql` (hold_slot) | `src/app/slots/actions.test.ts` | реалізовано |
| AC-HOLD-17 | Повторне утримання того самого слоту за тим самим клієнтом | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261022042804_slots_and_holds.sql` (hold_slot) | `src/app/slots/actions.test.ts` | реалізовано |
| AC-HOLD-07 | Утримання після початку слоту | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261022042804_slots_and_holds.sql` (hold_slot) | `src/app/slots/actions.test.ts` | реалізовано |
| AC-HOLD-08 | Терапевт пробує утримати слот | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261022042804_slots_and_holds.sql` (hold_slot) | `src/app/slots/actions.test.ts` | реалізовано |
| AC-HOLD-25 | Клієнт уже має утримання на цей час | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261022042804_slots_and_holds.sql` (hold_slot) | `src/app/slots/actions.test.ts` | реалізовано |
| AC-HOLD-26 | Прострочене утримання клієнта не заважає | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261022042804_slots_and_holds.sql` (hold_slot) | `src/app/slots/actions.test.ts` | реалізовано |
| AC-HOLD-05 | За хвилину до прострочення | `src/lib/holds/status.ts` (holdStatus) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-06 | Утримання прострочилося | `src/lib/holds/status.ts` (holdStatus, slotStatus) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-20 | Планувальник бачить прострочене утримання | `src/lib/holds/status.ts` (holdsList) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-28 | Прострочене утримання видно до початку слоту | `src/lib/holds/status.ts` (holdsList) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-29 | Прострочене утримання зникає з початком слоту | `src/lib/holds/status.ts` (holdsList) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-12 | Підтвердження утримання | `src/lib/holds/status.ts` (holdStatus, slotStatus) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-23 | Підтвердження за хвилину до початку слоту | `src/app/holds/actions.ts` (confirmHold), `supabase/migrations/20261022063605_confirm_hold.sql` (confirm_hold) | `src/app/holds/actions.test.ts` | реалізовано |
| AC-HOLD-27 | Підтвердження іншим планувальником | `src/app/holds/actions.ts` (confirmHold), `supabase/migrations/20261022063605_confirm_hold.sql` (confirm_hold) | `src/app/holds/actions.test.ts` | реалізовано |
| AC-HOLD-13 | Підтвердження простроченого утримання | `src/app/holds/actions.ts` (confirmHold), `supabase/migrations/20261022063605_confirm_hold.sql` (confirm_hold) | `src/app/holds/actions.test.ts` | реалізовано |
| AC-HOLD-22 | Підтвердження після початку слоту | `src/app/holds/actions.ts` (confirmHold), `supabase/migrations/20261022063605_confirm_hold.sql` (confirm_hold) | `src/app/holds/actions.test.ts` | реалізовано |
| AC-HOLD-36 | Повторне або одночасне підтвердження | `src/app/holds/actions.ts` (confirmHold), `supabase/migrations/20261022063605_confirm_hold.sql` (confirm_hold) | `src/app/holds/actions.test.ts` | реалізовано |
| AC-HOLD-14 | Терапевт пробує підтвердити утримання | `src/app/holds/actions.ts` (confirmHold), `supabase/migrations/20261022063605_confirm_hold.sql` (confirm_hold) | `src/app/holds/actions.test.ts` | реалізовано |
| AC-HOLD-19 | Адміністратор утримує й підтверджує | `src/app/holds/actions.ts` (confirmHold), `supabase/migrations/20261022063605_confirm_hold.sql` (confirm_hold), `src/app/slots/actions.ts` (holdSlot) | `src/app/holds/actions.test.ts` | реалізовано |
| AC-HOLD-37 | Повторне утримання тим самим клієнтом | `src/lib/holds/status.ts` (holdsList), `src/app/holds/page.tsx` | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-38 | Список утримань — лише «Held» і «Expired» усіх терапевтів за часом слоту від найближчого, без підтверджених сеансів | `src/lib/holds/status.ts` (holdsList), `src/app/holds/page.tsx` | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-09 | Терапевт бачить лише свої утримання | `src/lib/schedule/load.ts` (loadTherapistWeek), `supabase/migrations/20261022042804_slots_and_holds.sql` (RLS) | `src/lib/schedule/load.test.ts` | реалізовано |
| AC-HOLD-21 | Прострочене утримання в розкладі терапевта | `src/lib/holds/status.ts` (therapistWeek) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-30 | Поточний тиждень | `src/lib/holds/status.ts` (therapistWeek), `src/lib/time.ts` (practiceWeekRange) | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-31 | Перемикання на наступний тиждень | `src/lib/holds/status.ts` (therapistWeek), `src/app/schedule/page.tsx` | `src/lib/holds/status.test.ts` | реалізовано |
| AC-HOLD-40 | Терапевт бачить у розкладі ім'я клієнта без email (частину «без списку клієнтів у зрізі 1» змінив AC-CARD-04 — Q4, Sofiia-pm/therapy-scheduling-spec#30) | `src/lib/schedule/load.ts` (loadTherapistWeek) | `src/lib/schedule/load.test.ts` | реалізовано |
| AC-CARD-01 | Картка дорослого клієнта з анкети, клієнта можна вибрати під час утримання | `src/app/clients/actions.ts` (createClientCard), `src/lib/clients/validate.ts` (validateCard), `src/app/clients/client-form.tsx`, `supabase/migrations/20261026202501_client_cards.sql` | `src/app/clients/actions.test.ts`, `tests/db/client-cards.test.ts`, `src/lib/clients/view.test.ts` | реалізовано |
| AC-CARD-02 | Картка дитини з опікуном, email опікуна під час утримання | `src/app/clients/actions.ts` (createClientCard), `src/lib/clients/view.ts` (clientOptionLabel), `src/app/slots/hold-form.tsx` | `src/app/clients/actions.test.ts`, `src/lib/clients/view.test.ts` | реалізовано |
| AC-CARD-03 | Порожнє ім'я або email опікуна — картку не створено, дані лишаються у формі | `src/lib/clients/validate.ts` (validateCard), `src/app/clients/client-form.tsx`, `supabase/migrations/20261026202501_client_cards.sql` (clients_card_shape_check) | `src/app/clients/actions.test.ts`, `src/lib/clients/validate.test.ts`, `tests/db/client-cards.test.ts` | реалізовано |
| AC-CARD-04 | Терапевт бачить картки лише своїх клієнтів («Held» або «Confirmed») | `supabase/migrations/20261026210602_own_clients.sql` (is_own_client, clients_select_own_therapist), `src/app/clients/page.tsx`, `src/app/clients/[id]/page.tsx` | `tests/db/own-clients.test.ts`, `src/app/clients/page.test.ts`, `src/app/clients/[id]/page.test.ts` | реалізовано |
| AC-CARD-05 | Терапевт не відкриває картку чужого клієнта за прямим посиланням | `supabase/migrations/20261026210602_own_clients.sql` (is_own_client, clients_select_own_therapist), `src/app/clients/[id]/page.tsx` | `tests/db/own-clients.test.ts`, `src/app/clients/[id]/page.test.ts` | реалізовано |
| AC-CARD-06 | Терапевт не створює картку клієнта, кількість карток не змінюється | `src/app/clients/actions.ts` (createClientCard), `src/app/clients/new/page.tsx`, `supabase/migrations/20261022040716_roles_and_clients.sql` (clients_insert_staff) | `src/app/clients/actions.test.ts`, `tests/db/client-cards.test.ts`, `src/app/clients/new/page.test.ts` | реалізовано |
| AC-CARD-07 | Без входу — лише сторінка входу за прямим посиланням на клієнтів, картку чи утримання | `src/lib/access.ts` (accessFor), `src/proxy.ts`, `supabase/migrations/20261022040716_roles_and_clients.sql` (revoke anon — clients), `supabase/migrations/20261022042804_slots_and_holds.sql` (revoke anon — holds) | `tests/db/app-access.test.ts`, `src/app/page.test.ts` | реалізовано |
| AC-CARD-08 | Прострочене утримання не робить клієнта своїм для терапевта | `supabase/migrations/20261026210602_own_clients.sql` (is_own_client, clients_select_own_therapist), `src/app/clients/[id]/page.tsx` | `tests/db/own-clients.test.ts`, `src/app/clients/[id]/page.test.ts` | реалізовано |
| AC-CARD-09 | Порожній список клієнтів терапевта | `src/lib/clients/view.ts` (clientsEmptyMessage), `src/app/clients/page.tsx` | `src/lib/clients/view.test.ts`, `src/app/clients/page.test.ts` | реалізовано |
| AC-CARD-10 | Планувальник і адміністратор бачать усі картки, у картці дитини — дані опікуна | `src/app/clients/page.tsx`, `src/lib/clients/view.ts` (clientContact), `supabase/migrations/20261022040716_roles_and_clients.sql` (clients_select_staff) | `tests/db/client-cards.test.ts`, `src/lib/clients/view.test.ts` | реалізовано |
| AC-CARD-11 | Користувач без ролі бачить лише повідомлення про відсутність доступу | `supabase/migrations/20261026193437_profiles_role_nullable.sql`, `src/lib/access.ts` (accessFor), `src/app/page.tsx` | `tests/db/app-access.test.ts`, `src/app/page.test.ts` | реалізовано |
