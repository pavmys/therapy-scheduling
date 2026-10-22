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

Вимоги: https://github.com/Sofiia-pm/therapy-scheduling-spec · джерело: issues · знімок 2026-10-22

| AC | Що перевіряє | Код | Тест | Статус |
|---|---|---|---|---|
| AC-HOLD-10 | Створення клієнта з іменем і email | `src/app/clients/actions.ts` (createClientCard) | `src/app/clients/actions.test.ts` | реалізовано |
| AC-HOLD-11 | Порожнє ім'я клієнта | `src/lib/clients/validate.ts` (validateClient) | `src/lib/clients/validate.test.ts` | реалізовано |
| AC-HOLD-15 | Email без знака @ | `src/lib/clients/validate.ts` (validateClient) | `src/lib/clients/validate.test.ts` | реалізовано |
| AC-HOLD-16 | Дублікат email | `src/app/clients/actions.ts` (createClientCard) | `src/app/clients/actions.test.ts` | реалізовано |
| AC-HOLD-34 | Дублікат email з іншим регістром і пробілами | `src/app/clients/actions.ts` (createClientCard) | `src/app/clients/actions.test.ts` | реалізовано |
| AC-HOLD-35 | Email зберігається малими літерами без пробілів | `src/lib/clients/validate.ts` (normalizeEmail) | `src/lib/clients/validate.test.ts` | реалізовано |
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
| AC-HOLD-20 | Планувальник бачить прострочене утримання | — | — | відкладено (чекає реалізації) |
| AC-HOLD-28 | Прострочене утримання видно до початку слоту | — | — | відкладено (чекає реалізації) |
| AC-HOLD-29 | Прострочене утримання зникає з початком слоту | — | — | відкладено (чекає реалізації) |
| AC-HOLD-12 | Підтвердження утримання | — | — | відкладено (чекає реалізації) |
| AC-HOLD-23 | Підтвердження за хвилину до початку слоту | — | — | відкладено (чекає реалізації) |
| AC-HOLD-27 | Підтвердження іншим планувальником | — | — | відкладено (чекає реалізації) |
| AC-HOLD-13 | Підтвердження простроченого утримання | — | — | відкладено (чекає реалізації) |
| AC-HOLD-22 | Підтвердження після початку слоту | — | — | відкладено (чекає реалізації) |
| AC-HOLD-36 | Повторне або одночасне підтвердження | — | — | відкладено (чекає реалізації) |
| AC-HOLD-14 | Терапевт пробує підтвердити утримання | — | — | відкладено (чекає реалізації) |
| AC-HOLD-19 | Адміністратор утримує й підтверджує | — | — | відкладено (чекає реалізації) |
| AC-HOLD-09 | Терапевт бачить лише свої утримання | — | — | відкладено (чекає реалізації) |
| AC-HOLD-21 | Прострочене утримання в розкладі терапевта | — | — | відкладено (чекає реалізації) |
| AC-HOLD-30 | Поточний тиждень | — | — | відкладено (чекає реалізації) |
| AC-HOLD-31 | Перемикання на наступний тиждень | — | — | відкладено (чекає реалізації) |
