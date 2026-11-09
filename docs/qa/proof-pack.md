# QA proof pack: Планувальник позначає статус перевірки страхування клієнта

- Прод-URL: https://therapy-scheduling-three.vercel.app
- Зріз 3: Планувальник позначає статус перевірки страхування клієнта (перевірено, не приймається, приватна оплата).
  (рядок roadmap PM, `requirements/product.md`; PM прив'язав його до WS8, реалізуємо конвеєром у WS9)
- Вимоги: https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling-spec · джерело: issues · знімок 2026-11-09
  (зріз 3 — [HryhoriiHaponiukQuitCode/therapy-scheduling-spec#33](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling-spec/issues/33))
- Спека: [openspec/specs/insurance-status/spec.md](https://github.com/pavmys/therapy-scheduling/blob/23aaae9fe8ed76d39f2e408cf4814a63a2b12838/openspec/specs/insurance-status/spec.md)
  (злиття PR #44; після нього файл не змінювався)
- `/api/health` на момент UAT: sha `54c483b`, 09.11.2026 16:10 (Київ) — із заголовка звіту й `deployedSha` у
  `manifest.json`; стану `db` звіт не записує

## Доказ на кожен AC зрізу 3

Рівні: база (PGlite) — міграції на справжньому Postgres у Vitest; unit — чистий модуль, Server Action чи сторінка з
підміненим лише клієнтом Supabase; e2e — UAT на проді (Playwright + рецензент-агент). Посилання на тести — на коміт
злиття останнього PR зрізу (`d5451ef`).

| AC | Вид | Тест (рівень, посилання) | Здатен упасти | Специфікація UAT | Вердикт UAT і кадр | PR і SHA злиття |
|---|---|---|---|---|---|---|
| AC-INS-01 | стан інтерфейсу (початковий «Insurance: Not set») | база: [insurance-status.test.ts#L27](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/db/insurance-status.test.ts#L27), [#L35](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/db/insurance-status.test.ts#L35); unit: [insurance.test.ts#L5](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/src/lib/clients/insurance.test.ts#L5) | червоний прогін до реалізації: тести — коміт [b0a7c12](https://github.com/pavmys/therapy-scheduling/commit/b0a7c128cc980a0731e025574a4eec032b75901f), `column "insurance_status" does not exist`, `Cannot find module './insurance'` ([PR #45](https://github.com/pavmys/therapy-scheduling/pull/45)); мутанта немає | [insurance-status.spec.ts#L101](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/e2e/insurance-status.spec.ts#L101) | **PASS (R6)**, Haiku: PASS — [рядок звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L16), [розділ](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L120); кадр [then-1](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/frames/AC-INS-01-then-1.png) | код і тести — [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; UAT — [#47](https://github.com/pavmys/therapy-scheduling/pull/47), `d5451ef` |
| AC-INS-02 | основний сценарій (позначити статус, повідомлення, повторне відкриття) | база: [insurance-status.test.ts#L42](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/db/insurance-status.test.ts#L42); unit (дія): [actions.test.ts#L54](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/src/app/clients/%5Bid%5D/actions.test.ts#L54); unit (підпис): [insurance.test.ts#L9](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/src/lib/clients/insurance.test.ts#L9) | червоний прогін до реалізації (той самий коміт `b0a7c12`): колонки немає, `Cannot find module …/actions` ([PR #45](https://github.com/pavmys/therapy-scheduling/pull/45)); мутанта немає | [insurance-status.spec.ts#L132](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/e2e/insurance-status.spec.ts#L132) | **PASS (R6)**, Haiku: PASS — [рядок звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L17), [розділ](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L144); кадри [then-1](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/frames/AC-INS-02-then-1.png) (повідомлення), [then-2](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/frames/AC-INS-02-then-2.png) (повторне відкриття) | [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; UAT — [#47](https://github.com/pavmys/therapy-scheduling/pull/47), `d5451ef` |
| AC-INS-03 | основний сценарій (зміна іншою роллю, видно іншому планувальнику) | база: [insurance-status.test.ts#L50](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/db/insurance-status.test.ts#L50); unit (підпис): [insurance.test.ts#L13](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/src/lib/clients/insurance.test.ts#L13) | червоний прогін до реалізації (`b0a7c12`): `column "insurance_status" of relation "clients" does not exist` ([PR #45](https://github.com/pavmys/therapy-scheduling/pull/45)); мутанта немає | [insurance-status.spec.ts#L188](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/e2e/insurance-status.spec.ts#L188) | **PASS (R6)**, Haiku: PASS — [рядок звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L18), [розділ](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L172); кадри [then-1](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/frames/AC-INS-03-then-1.png) (admin1), [then-2](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/frames/AC-INS-03-then-2.png) (scheduler2) | [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; UAT — [#47](https://github.com/pavmys/therapy-scheduling/pull/47), `d5451ef` |
| AC-INS-04 | відмова в інтерфейсі (заборонена роль: бачить, змінити не запропоновано) | база: [insurance-status.test.ts#L89](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/db/insurance-status.test.ts#L89); unit (сторінка): [page.test.ts#L137](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/src/app/clients/%5Bid%5D/page.test.ts#L137) | TS-мутант I4 (форма рендериться й терапевту) — **KILLED** ([PR #46](https://github.com/pavmys/therapy-scheduling/pull/46); повторено 09.11.2026) | [insurance-status.spec.ts#L245](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/e2e/insurance-status.spec.ts#L245) | **PASS (R6)**, Haiku: PASS — [рядок звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L19), [розділ](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L199); кадр [then-1](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/frames/AC-INS-04-then-1.png) | код — [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; тести й мутант — [#46](https://github.com/pavmys/therapy-scheduling/pull/46), `54c483b`; UAT — [#47](https://github.com/pavmys/therapy-scheduling/pull/47), `d5451ef` |
| AC-INS-05 | відмова напряму (заборонена роль, оминаючи сторінки) | база: [insurance-status.test.ts#L94](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/db/insurance-status.test.ts#L94); unit (дія): [actions.test.ts#L62](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/src/app/clients/%5Bid%5D/actions.test.ts#L62) | SQL-мутант I1 (політика `clients_update_insurance_staff` без обох перевірок ролі) — **KILLED**; TS-мутант I2 (`setInsuranceStatus` без перевірки ролі) — **KILLED** ([PR #46](https://github.com/pavmys/therapy-scheduling/pull/46); повторено 09.11.2026) | [insurance-status.spec.ts#L284](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/e2e/insurance-status.spec.ts#L284) (прямий `PATCH` у PostgREST з токеном therapist1) | **PASS (R6)**, Haiku: PASS — [рядок звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L20), [розділ](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L223); кадр [then-1](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/frames/AC-INS-05-then-1.png) (scheduler1 бачить «Not accepted») | код — [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; тести й мутанти — [#46](https://github.com/pavmys/therapy-scheduling/pull/46), `54c483b`; UAT — [#47](https://github.com/pavmys/therapy-scheduling/pull/47), `d5451ef` |
| AC-INS-06 | відмова (не увійшов) | база: [insurance-status.test.ts#L108](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/db/insurance-status.test.ts#L108) (`asAnon` — select і update → відмова, scheduler1 бачить `verified`); unit (сторінка): [page.test.ts#L165](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/src/app/clients/%5Bid%5D/page.test.ts#L165) | TS-мутант I3 (картка без `redirect("/login")`) — **KILLED** ([PR #46](https://github.com/pavmys/therapy-scheduling/pull/46); повторено 09.11.2026); SQL-мутанта немає — два незалежні бар'єри для `anon`, мутант одного з них еквівалентний (design.md D4) | [insurance-status.spec.ts#L333](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/e2e/insurance-status.spec.ts#L333) | **PASS (R6)**, Haiku: NEEDS-HUMAN → Sonnet: PASS (рішення агента — за Sonnet) — [рядок звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L21), [розділ](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L247); кадри [then-1](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/frames/AC-INS-06-then-1.png) (лише вхід), [then-2](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/frames/AC-INS-06-then-2.png) (scheduler1 бачить «Verified») | код — [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; тести й мутант — [#46](https://github.com/pavmys/therapy-scheduling/pull/46), `54c483b`; UAT — [#47](https://github.com/pavmys/therapy-scheduling/pull/47), `d5451ef` |

- Червоний прогін AC-INS-01…03 (`Test Files 3 failed (3) · Tests 4 failed (4)`) записано в описі PR #45; повторно не
  запускав. На `b0a7c12` справді немає міграції, `src/lib/clients/insurance.ts` і `src/app/clients/[id]/actions.ts`
  (перевірено `git ls-tree`). Цей доказ слабший за мутанта: тести червоні, бо коду немає, а не тому, що зламано одне
  правило. Мутантів для основного шляху (AC-INS-01…03) немає.
- Мутанти I1–I4 повторно запущено локально 09.11.2026 на `45fe31d` (код `src/` і `supabase/` той самий, що на
  `d5451ef`): `node scripts/mutation-check.mjs --only I1,I2,I3,I4` — без мутацій 3 файли тестів зелені, **4 з 4
  вбито (100 %)**, 2,0 с, файли повернуто (робоче дерево чисте).
- Тести AC-INS-01…06 писала окрема сесія агента з тексту AC (F02 — Vitest, F03 — UAT), а не сесія, що писала код
  (описи PR #45, #46, #47).

## Не перевірено

| AC чи частина | Чому не перевірено | Що зроблено замість | Ризик на проді |
|---|---|---|---|
| AC-INS-01…06 — на проді не використано сідові картки client6 і client7 з «Дано» (відхилення даних) | статус «Not set» база повернути не дозволяє, а прод спільний і UAT запускається повторно: AC-INS-01 на client6 пройшов би лише раз | кожен тест UAT створює власну синтетичну картку `uat-261109141038-ins0N@example.test` («UAT client6 (ins0N)», «UAT client7 (ins03)»); стан із «Дано» (статус, «свій клієнт» therapist1 через слот 2099 року й «Held»-утримання) задано секретним ключем, а не через інтерфейс ([insurance-status.spec.ts#L1-L9](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/tests/e2e/insurance-status.spec.ts#L1-L9)). Тести бази на PGlite працюють із client6 із тими самими даними | низький: той самий код і ті самі політики RLS; сідові картки на проді з цим статусом ніхто не відкривав |
| Здатність UAT упасти саме на AC-INS на проді | негативні контролі (`npm run uat:nc`) ішли не на проді, а на локальній збірці `http://localhost:3000`, тести `fac8dab` «+ незакомічені зміни», і обидва — на AC-CARD-16, а не на AC-INS | NC-1 → FAIL (R1), NC-2 → NEEDS-HUMAN (R3) — [negative-controls/report.md](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/negative-controls/report.md); для AC-INS — червоний прогін і мутанти на рівнях бази й unit (таблиця вище) | низький: правила R1/R3 — спільний код конвеєра, не залежать від AC |
| Відео прогону UAT (усі 6 AC) | відео й траси не в git (`test-results/`), до PR #47 їх **не прикладено** | кадри «Тоді» в git, розбір агента з цитатами, звіреними зі сторінкою (aria) | PM не може переглянути прогін відео; `check-recordings` конвеєра WS9 потребує відео на диску (примітка в `manifest.json`) |
| AC-INS-04, -05 — помічник UAT у тій версії, що злита | після прогону (тести `fac8dab`) `setInsuranceStatusDirectly` у `tests/e2e/support/admin.ts` змінено за знахідкою CodeRabbit ([770188e](https://github.com/pavmys/therapy-scheduling/commit/770188e288e369ff6342195134a399b34e7e3a1f)); UAT повторно не запускали | `git diff fac8dab 770188e` — змінено лише цей файл (фільтр `uat-%@example.test`, перевірка «рівно один рядок»); спека UAT і код застосунку не змінились | лише тестовий код; на прод не впливає |
| AC-INS-01…03 — рев'ю коду задачі 1 (міграція, `setInsuranceStatus`, сторінка й форма) | CodeRabbit у PR #45 не запустився: «Review rate limited» ([коментар](https://github.com/pavmys/therapy-scheduling/pull/45#issuecomment-6738970597)); рев'ю PR #46 охопило лише зміни після `23a6d66` (тести й мутанти) | CodeRabbit переглянув план `impl-insurance-status` (PR #44, 2 Major виправлено), тести бази й unit, мутанти I1–I4 на правилах доступу, UAT на проді | середній: код міграції й дії ніхто, крім агента-автора й тестів, не рецензував |
| Частина вимоги, не AC: «повернути статус «Not set» не дозволяти» | окремого AC немає (це «Припущення» PM у тексті вимоги); у базі (`with check … insurance_status <> 'not_set'`) тесту й мутанта немає | unit без AC ID: `parseInsuranceStatus("not_set")` → `null` ([insurance.test.ts#L29](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/src/lib/clients/insurance.test.ts#L29)); у формі «Not set» не пропонується | низький: staff, що пише в базу напряму, повернути «Not set» не повинен зуміти, але тестом цього не доведено |

FAIL і NEEDS-HUMAN у підсумку UAT немає. Розбіжність рецензентів (Haiku: NEEDS-HUMAN на AC-INS-06) — у таблиці вище.

## A. Вимоги й спека

- `/requirements-sync` — PR «Оновлення вимог»: https://github.com/pavmys/therapy-scheduling/pull/43 (`953a70c`,
  знімок 2026-11-09; PM змінив репо вимог). Вимоги актуальні: issue #33 востаннє змінено 2026-11-06, перевірено
  09.11.2026.
- Спека `add-insurance-status` і план `impl-insurance-status` — PR «Специфікація»:
  https://github.com/pavmys/therapy-scheduling/pull/44 (`23aaae9`). CodeRabbit — 2 Major, обидва виправлено в
  [1f89ddb](https://github.com/pavmys/therapy-scheduling/commit/1f89ddb55b3e038fc86307a3940bbda326e69115), відповіді в
  тредах:
  - заборону повертати «Not set» додано в текст вимоги ([тред](https://github.com/pavmys/therapy-scheduling/pull/44#discussion_r4512011924));
  - мутант AC-INS-05 тепер знімає обидві перевірки ролі, бо `using (true)` вижив би
    ([тред](https://github.com/pavmys/therapy-scheduling/pull/44#discussion_r4512011943)).
- Зміна `clarify-insurance-status` після уточнень: PM AC не змінював.
- Питання PM: питань не було (`docs/spec-reading.md`, розділ «Зріз 3»: у вимозі «Відкриті питання: Немає.»).

## B. Реалізація

| PR «Реалізація» | Задача з `tasks.md` | AC | Відповіді на знахідки CodeRabbit | `db-deploy` |
|---|---|---|---|---|
| https://github.com/pavmys/therapy-scheduling/pull/45 (`23a6d66`) | 1. Планувальник і адміністратор позначають статус | AC-INS-01, AC-INS-02, AC-INS-03 | рев'ю не було: ліміт CodeRabbit («Review rate limited»), знахідок немає | [job 129182472588](https://github.com/pavmys/therapy-scheduling/actions/runs/42623601881/job/129182472588) — застосовано `20261109112112_insurance_status.sql` |
| https://github.com/pavmys/therapy-scheduling/pull/46 (`54c483b`) | 2. Терапевт і гість не змінюють статус | AC-INS-04, AC-INS-05, AC-INS-06 | коментарів до коду 0. Перевірка pre-merge «Тип PR і межі змін» не пройшла (просила прибрати `scripts/mutants.mjs` з PR), **відповіді в PR немає** | [job 129204768461](https://github.com/pavmys/therapy-scheduling/actions/runs/42630103998/job/129204768461) — «Remote database is up to date» (міграцій немає) |
| https://github.com/pavmys/therapy-scheduling/pull/47 (`d5451ef`) | 3. UAT на кожен AC (і archive `impl-insurance-status`) | AC-INS-01…06 (UAT) | 3 Minor виправлено в [770188e](https://github.com/pavmys/therapy-scheduling/commit/770188e288e369ff6342195134a399b34e7e3a1f), відповідь у кожному треді: [NC у маніфесті](https://github.com/pavmys/therapy-scheduling/pull/47#discussion_r4513980214), [опис 3.1](https://github.com/pavmys/therapy-scheduling/pull/47#discussion_r4513980225), [`setInsuranceStatusDirectly`](https://github.com/pavmys/therapy-scheduling/pull/47#discussion_r4513980298). Попередження «Тип PR і межі змін» щодо `docs/qa/uat/` — аргумент у [коментарі](https://github.com/pavmys/therapy-scheduling/pull/47#issuecomment-6743106000), CodeRabbit погодився. **Без відповіді лишилось** уточнення CodeRabbit у треді `setInsuranceStatusDirectly` ([14:54](https://github.com/pavmys/therapy-scheduling/pull/47#discussion_r4514104284)): `like 'uat-%@example.test'` пропускає адреси поза `UAT_EMAIL`, а перевірка йде після update. PR злито о 14:57 | [job 129238580466](https://github.com/pavmys/therapy-scheduling/actions/runs/42639803790/job/129238580466) (міграцій немає) |

- Ворота на `main` (`quality`): https://github.com/pavmys/therapy-scheduling/actions/runs/42639803705 (`d5451ef`;
  «Ворота: fallow audit», «Покриття: доменна підлога», «Порада: вразливі залежності» — success). CI на `main` для
  кожного злиття зрізу (`spec`, `app`, `conformance`, `db-check`, `db-deploy`) — success:
  [#45](https://github.com/pavmys/therapy-scheduling/actions/runs/42623601881),
  [#46](https://github.com/pavmys/therapy-scheduling/actions/runs/42630103998),
  [#47](https://github.com/pavmys/therapy-scheduling/actions/runs/42639803790).
- Мутації: SQL- і точкові TS-мутанти [scripts/mutants.mjs](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/scripts/mutants.mjs)
  (I1–I4), таблиця з виводом — в описі [PR #46](https://github.com/pavmys/therapy-scheduling/pull/46).
  `npm run mutation:sql` у PR #46: 7 з 8 вбито, C6 прийнято як еквівалентний (зріз 2). Повтор 09.11.2026:

  | Мутант | AC | Що зламано | Вердикт | Який тест упав |
  |---|---|---|---|---|
  | I1 (SQL) | AC-INS-05 | `clients_update_insurance_staff`: `using (true) with check (insurance_status <> 'not_set')` | KILLED | AC-INS-05: therapist1 напряму змінює статус свого client6 на 'verified' — 0 рядків, scheduler1 бачить 'not_accepted' |
  | I2 (TS) | AC-INS-05 | `setInsuranceStatus`: `if (!user \|\| !isStaffRole(user.role))` → `if (!user)` | KILLED | AC-INS-05: therapist1 напряму викликає дію «Verified» для client6 — відмова, запиту update до clients немає |
  | I3 (TS) | AC-INS-06 | картка: `redirect("/login")` → `void 0` | KILLED | AC-INS-06: гість без входу за прямим посиланням на картку — redirect на /login, картку з бази не запитано |
  | I4 (TS) | AC-INS-04 | картка: `role === "staff" ? <InsuranceForm` → `true ? <InsuranceForm` | KILLED | AC-INS-04: терапевт у картці свого client6 бачить «Insurance: Not accepted», форми зміни статусу немає |

  Stryker для файлів зрізу 3 (`src/lib/clients/insurance.ts`, `src/app/clients/[id]/actions.ts`) не запускали:
  у PR #45–#47 його виводу немає. «До → після» для зрізу 3 немає: вижилих мутантів I1–I4 не було.

## C. UAT на проді

- Звіт: [docs/qa/uat/2026-11-09/report.md](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md)
  — `npm run uat -- --url https://therapy-scheduling-three.vercel.app`, застосунок `54c483b`, код тестів `fac8dab`,
  09.11.2026 16:10 (Київ), Playwright 64,0 с; 9 AC (AC-INS-01…06 і регрес AC-CARD-06, -07, -16) — PASS 9, FAIL 0,
  NEEDS-HUMAN 0. Код застосунку (`src/`, `supabase/`) між `54c483b` і `d5451ef` не змінювався (`git diff` порожній).
- Відео: не в git і до PR #47 **не прикладено**. У звіті — лише шляхи `test-results/…/video.webm` на машині, де
  ішов прогін.
- Рецензент: `claude-haiku-5-5`, суперечки — `claude-sonnet-5-5` (у цьому прогоні — лише AC-INS-06: Haiku
  NEEDS-HUMAN → Sonnet PASS); розбір — $0,0698 за цінами API.
- Негативний контроль: `npm run uat:nc`, окремий прогін 16:14 на локальній збірці `http://localhost:3000`, не на
  проді; тести `fac8dab` «+ незакомічені зміни» (так у звіті NC); обидва контролі — на AC-CARD-16:
  - NC-1 — у твердженні навмисно інший текст («This client card was not found.») → перевірка впала, Haiku: PASS →
    **FAIL** (R1);
  - NC-2 — анотація `ac-text` з уточненим текстом, тест і застосунок без змін → Haiku і Sonnet: FAIL →
    **NEEDS-HUMAN** (R3).

  Звіт, маніфест і кадри — [negative-controls/](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/negative-controls/report.md),
  закомічено в PR #47 ([770188e](https://github.com/pavmys/therapy-scheduling/commit/770188e288e369ff6342195134a399b34e7e3a1f)).
- Дані: `@writes` — усі шість тестів AC-INS: `uat-261109141038-ins01…06@example.test` (свої картки, для AC-INS-04/05
  ще слот 2099 року й «Held»-утримання). Прибирання ([рядок звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L7)):
  видалено 6, лишилось 0, їхніх рядків — 0. На кадрах — лише адреси `*@example.test` (переглянуто кадри
  AC-INS-03 і AC-INS-04).

### Приймання PM

Станом на 09.11.2026 17:02 (Київ) рішень PM немає: у звіті UAT поля «Рішення PM» порожні, коментарів-підписів у
[#33](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling-spec/issues/33) після 06.11 немає, issues
«Відхилення від вимог» до AC-INS немає.

| AC | Рішення PM | Посилання |
|---|---|---|
| AC-INS-01 | очікує приймання PM | [розділ звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L120) |
| AC-INS-02 | очікує приймання PM | [розділ звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L144) |
| AC-INS-03 | очікує приймання PM | [розділ звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L172) |
| AC-INS-04 | очікує приймання PM | [розділ звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L199) |
| AC-INS-05 | очікує приймання PM | [розділ звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L223) |
| AC-INS-06 | очікує приймання PM | [розділ звіту](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md?plain=1#L247) |

## D. Прод і ретро

- `/api/health` після злиття всіх задач: sha `d5451ef`, env production, db ok (09.11.2026 17:02, Київ)
- Нові ролі й акаунти: немає. UAT використав наявні admin1, scheduler1, scheduler2, therapist1 (`@example.test`);
  `accounts.zip` не змінювався з D0 ([aca806d](https://github.com/pavmys/therapy-scheduling/commit/aca806df1e223497927a330bf44a6df39eeeda77), PR #34) —
  [accounts.zip на d5451ef](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/accounts.zip)
- `docs/conformance.md`: [рядки AC-INS-01…06 — «реалізовано»](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/conformance.md?plain=1#L96-L101)

### Ретро: що б ми взяли з фабрики у свій звичайний процес

Що вже маємо: CI `spec` / `app` / `conformance` / `db-check` + `quality` (fallow, тестові правила ESLint, покриття),
тести від окремої сесії (F02, F03), SQL- і TS-мутанти (`scripts/mutants.mjs`), Stryker, UAT з рецензентом-агентом і
негативними контролями, цей пакет доказів, CodeRabbit (ASSERTIVE, custom checks). По станціях фабрики (F14):

- **Допуск:** візьмемо — у `openspec/config.yaml` (правила для `tasks.md` змін `impl-*`) вимагати в кожному «Done
  when» відмовного AC названий мутант або червоний прогін; задача без цього не стартує (у зрізі 3 це було лише в D4 `design.md`).
- **Захищені тести:** візьмемо — custom check у `.coderabbit.yaml`: у PR «Реалізація» тести з AC ID змінено в тому самому
  коміті, що й код, → попередження (зараз розділення «тести → код» тримається лише на дисципліні двох комітів).
- **Приховані сценарії:** не потрібно окремо, бо виконавця, який не бачить тестів, у нас немає; аналог — тести з
  тексту AC окремою сесією (F02) до коду.
- **Мутації й повтор:** мутації вже є; візьмемо повтор — у `.github/workflows/quality.yml` другий прогін
  `npx vitest run --sequence.shuffle`, щоб ловити тести, залежні від порядку (ризик у PGlite-тестах зі спільним станом).
- **Рев'ю-спростування:** уже є (CodeRabbit), але візьмемо правило: PR не зливаємо, доки рев'ю не відбулося — у #45 воно
  не запустилось через ліміт, і код задачі 1 рецензії не мав (див. «Не перевірено»); пункт у `.github/pull_request_template.md`.
- **Пакет доказів з «Не перевірено»:** уже є (цей файл); візьмемо розділ «Не перевірено» в `.github/pull_request_template.md`,
  щоб він з'являвся в кожному PR «Реалізація», а не лише наприкінці зрізу.
- **Рівні автономії:** не потрібно, бо репо solo, а злиття — завжди людина (ruleset `solo-main`).
- **Бюджети:** частково є (вартість у звіті UAT); візьмемо стелю `UAT_MAX_USD` у `scripts/uat/run.mjs`, яка зупиняє
  розбір рецензентом, якщо її перевищено.
