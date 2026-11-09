# QA proof pack: Планувальник позначає статус перевірки страхування клієнта

- Прод-URL: https://therapy-scheduling-three.vercel.app
- Зріз 3: Планувальник позначає статус перевірки страхування клієнта (перевірено, не приймається, приватна оплата).
  (рядок roadmap PM, `requirements/product.md`; PM прив'язав його до WS8, реалізуємо конвеєром у WS9)
- Вимоги: https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling-spec · джерело: issues · знімок 2026-11-09
  (зріз 3 — [HryhoriiHaponiukQuitCode/therapy-scheduling-spec#33](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling-spec/issues/33))
- Спека: [openspec/specs/insurance-status/spec.md](https://github.com/pavmys/therapy-scheduling/blob/23aaae9fe8ed76d39f2e408cf4814a63a2b12838/openspec/specs/insurance-status/spec.md)
  (злиття PR #44; після нього файл не змінювався)
- `/api/health` на момент UAT: sha `d5647b3` (злиття PR #48), 09.11.2026 18:32 (Київ) — із заголовка звіту й
  `deployedSha` у `manifest.json`; о 18:41 `/api/health` — `d5647b3`, env production, db ok

## Доказ на кожен AC зрізу 3

Рівні: база (PGlite) — міграції на справжньому Postgres у Vitest; unit — чистий модуль, Server Action чи сторінка з
підміненим лише клієнтом Supabase; e2e — UAT на проді (Playwright + рецензент-агент). Посилання на тести — на коміт
злиття останнього PR коду зрізу (`d5647b3`, PR #48); звіт і кадри UAT — у цьому PR (`docs/qa/uat/2026-11-09/`, прогін
18:32). Перший прогін тієї ж дати (16:10, застосунок `54c483b`) — [в історії на `d5451ef`](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md).

| AC | Вид | Тест (рівень, посилання) | Здатен упасти | Специфікація UAT | Вердикт UAT і кадр | PR і SHA злиття |
|---|---|---|---|---|---|---|
| AC-INS-01 | стан інтерфейсу (початковий «Insurance: Not set») | база: [insurance-status.test.ts#L27](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/db/insurance-status.test.ts#L27), [#L35](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/db/insurance-status.test.ts#L35); unit: [insurance.test.ts#L5](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/src/lib/clients/insurance.test.ts#L5) | червоний прогін до реалізації: тести — коміт [b0a7c12](https://github.com/pavmys/therapy-scheduling/commit/b0a7c128cc980a0731e025574a4eec032b75901f), `column "insurance_status" does not exist`, `Cannot find module './insurance'` ([PR #45](https://github.com/pavmys/therapy-scheduling/pull/45)); мутанта немає | [insurance-status.spec.ts#L101](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/e2e/insurance-status.spec.ts#L101) | **PASS (R6)**, Haiku: PASS — [рядок звіту](uat/2026-11-09/report.md?plain=1#L21), [розділ](uat/2026-11-09/report.md?plain=1#L126); кадр [then-1](uat/2026-11-09/frames/AC-INS-01-then-1.png) | код і тести — [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; UAT — цей PR (прогін на `d5647b3`) |
| AC-INS-02 | основний сценарій (позначити статус, повідомлення, повторне відкриття) | база: [insurance-status.test.ts#L42](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/db/insurance-status.test.ts#L42), заборона «Not set» — [#L65](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/db/insurance-status.test.ts#L65); unit (дія): [actions.test.ts#L54](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/src/app/clients/%5Bid%5D/actions.test.ts#L54); unit (підпис): [insurance.test.ts#L9](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/src/lib/clients/insurance.test.ts#L9) | червоний прогін до реалізації (той самий коміт `b0a7c12`): колонки немає, `Cannot find module …/actions` ([PR #45](https://github.com/pavmys/therapy-scheduling/pull/45)); SQL-мутант **I5** (`with check` без заборони «Not set») — **KILLED** ([#48](https://github.com/pavmys/therapy-scheduling/pull/48)) | [insurance-status.spec.ts#L132](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/e2e/insurance-status.spec.ts#L132) (з #48 — ще й поле статусу лишається «Verified») | **PASS (R6)**, Haiku: PASS — [рядок звіту](uat/2026-11-09/report.md?plain=1#L22), [розділ](uat/2026-11-09/report.md?plain=1#L150); кадри [then-1](uat/2026-11-09/frames/AC-INS-02-then-1.png) (повідомлення; поле показує «Verified»), [then-2](uat/2026-11-09/frames/AC-INS-02-then-2.png) (повторне відкриття) | [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; заборона «Not set» і селект — [#48](https://github.com/pavmys/therapy-scheduling/pull/48), `d5647b3`; UAT — цей PR (прогін на `d5647b3`) |
| AC-INS-03 | основний сценарій (зміна іншою роллю, видно іншому планувальнику) | база: [insurance-status.test.ts#L50](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/db/insurance-status.test.ts#L50); unit (підпис): [insurance.test.ts#L13](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/src/lib/clients/insurance.test.ts#L13) | червоний прогін до реалізації (`b0a7c12`): `column "insurance_status" of relation "clients" does not exist` ([PR #45](https://github.com/pavmys/therapy-scheduling/pull/45)); мутанта немає | [insurance-status.spec.ts#L191](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/e2e/insurance-status.spec.ts#L191) | **PASS (R6)**, Haiku: PASS — [рядок звіту](uat/2026-11-09/report.md?plain=1#L23), [розділ](uat/2026-11-09/report.md?plain=1#L180); кадри [then-1](uat/2026-11-09/frames/AC-INS-03-then-1.png) (admin1), [then-2](uat/2026-11-09/frames/AC-INS-03-then-2.png) (scheduler2) | [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; UAT — цей PR (прогін на `d5647b3`) |
| AC-INS-04 | відмова в інтерфейсі (заборонена роль: бачить, змінити не запропоновано) | база: [insurance-status.test.ts#L104](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/db/insurance-status.test.ts#L104); unit (сторінка): [page.test.ts#L137](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/src/app/clients/%5Bid%5D/page.test.ts#L137) | TS-мутант I4 (форма рендериться й терапевту) — **KILLED** ([#46](https://github.com/pavmys/therapy-scheduling/pull/46); повторено 09.11.2026 на `d5647b3`) | [insurance-status.spec.ts#L248](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/e2e/insurance-status.spec.ts#L248) | **PASS (R6)**, Haiku: NEEDS-HUMAN → Sonnet: PASS (рішення агента — за Sonnet) — [рядок звіту](uat/2026-11-09/report.md?plain=1#L24), [розділ](uat/2026-11-09/report.md?plain=1#L207); кадр [then-1](uat/2026-11-09/frames/AC-INS-04-then-1.png) | код — [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; тести й мутант — [#46](https://github.com/pavmys/therapy-scheduling/pull/46), `54c483b`; UAT — цей PR (прогін на `d5647b3`) |
| AC-INS-05 | відмова напряму (заборонена роль, оминаючи сторінки) | база: [insurance-status.test.ts#L109](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/db/insurance-status.test.ts#L109); unit (дія): [actions.test.ts#L62](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/src/app/clients/%5Bid%5D/actions.test.ts#L62) | SQL-мутант I1 (політика `clients_update_insurance_staff` без обох перевірок ролі) — **KILLED**; TS-мутант I2 (`setInsuranceStatus` без перевірки ролі) — **KILLED** ([#46](https://github.com/pavmys/therapy-scheduling/pull/46); повторено 09.11.2026 на `d5647b3`) | [insurance-status.spec.ts#L287](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/e2e/insurance-status.spec.ts#L287) (прямий `PATCH` у PostgREST з токеном therapist1) | **PASS (R6)**, Haiku: PASS — [рядок звіту](uat/2026-11-09/report.md?plain=1#L25), [розділ](uat/2026-11-09/report.md?plain=1#L237); кадр [then-1](uat/2026-11-09/frames/AC-INS-05-then-1.png) (scheduler1 бачить «Not accepted») | код — [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; тести й мутанти — [#46](https://github.com/pavmys/therapy-scheduling/pull/46), `54c483b`; UAT — цей PR (прогін на `d5647b3`) |
| AC-INS-06 | відмова (не увійшов) | база: [insurance-status.test.ts#L123](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/db/insurance-status.test.ts#L123) (`asAnon` — select і update → відмова, scheduler1 бачить `verified`); unit (сторінка): [page.test.ts#L165](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/src/app/clients/%5Bid%5D/page.test.ts#L165) | TS-мутант I3 (картка без `redirect("/login")`) — **KILLED** ([#46](https://github.com/pavmys/therapy-scheduling/pull/46); повторено 09.11.2026 на `d5647b3`); SQL-мутанта немає — два незалежні бар'єри для `anon`, мутант одного з них еквівалентний (design.md D4) | [insurance-status.spec.ts#L336](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/e2e/insurance-status.spec.ts#L336) | **PASS (R6)**, Haiku: NEEDS-HUMAN → Sonnet: PASS (рішення агента — за Sonnet) — [рядок звіту](uat/2026-11-09/report.md?plain=1#L26), [розділ](uat/2026-11-09/report.md?plain=1#L261); кадри [then-1](uat/2026-11-09/frames/AC-INS-06-then-1.png) (лише вхід), [then-2](uat/2026-11-09/frames/AC-INS-06-then-2.png) (scheduler1 бачить «Verified») | код — [#45](https://github.com/pavmys/therapy-scheduling/pull/45), `23a6d66`; тести й мутант — [#46](https://github.com/pavmys/therapy-scheduling/pull/46), `54c483b`; UAT — цей PR (прогін на `d5647b3`) |

- Червоний прогін AC-INS-01…03 (`Test Files 3 failed (3) · Tests 4 failed (4)`) записано в описі PR #45; повторно не
  запускали. На `b0a7c12` справді немає міграції, `src/lib/clients/insurance.ts` і `src/app/clients/[id]/actions.ts`
  (перевірено `git ls-tree`). Цей доказ слабший за мутанта: тести червоні, бо коду немає, а не тому, що зламано одне
  правило. Мутантів для основного шляху AC-INS-01, -03 немає; для AC-INS-02 є I5 (лише частина «Not set»).
- Мутанти I1–I5 повторно запущено локально 09.11.2026 18:41 на коді `d5647b3`: `npm run mutation:sql` — 8 з 9
  (C6 прийнято як еквівалентний, зріз 2), I1 і I5 — KILLED; `node scripts/mutation-check.mjs --only I2,I3,I4` — 3 з 3.
- Тести AC-INS-01…06 писала окрема сесія агента з тексту AC (F02 — Vitest, F03 — UAT), а не сесія, що писала код
  (описи PR #45, #46, #47). Тест заборони «Not set» (#48) і перевірку поля в UAT AC-INS-02 (#48, за рев'ю CodeRabbit)
  дописала сесія, що писала код, — їхній доказ здатності впасти: мутант I5 і кадр до виправлення
  ([AC-INS-02-then-1 на `d5451ef`](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/frames/AC-INS-02-then-1.png): «Select a status…»).

## Не перевірено

| AC чи частина | Чому не перевірено | Що зроблено замість | Ризик на проді |
|---|---|---|---|
| AC-INS-01…06 — на проді не використано сідові картки client6 і client7 з «Дано» (відхилення даних) | статус «Not set» база повернути не дозволяє, а прод спільний і UAT запускається повторно: AC-INS-01 на client6 пройшов би лише раз | кожен тест UAT створює власну синтетичну картку `uat-261109163226-ins0N@example.test` («UAT client6 (ins0N)», «UAT client7 (ins03)»); стан із «Дано» (статус, «свій клієнт» therapist1 через слот 2099 року й «Held»-утримання) задано секретним ключем, а не через інтерфейс ([insurance-status.spec.ts#L1](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/tests/e2e/insurance-status.spec.ts#L1)). Тести бази на PGlite працюють із client6 і client7 | низький: той самий код і ті самі політики RLS |
| Негативний контроль саме на AC-INS | NC-1 і NC-2 — на AC-CARD-16: контроль має бути AC без `@writes` (F05), а всі шість тестів AC-INS пишуть у базу | `npm run uat:nc -- --url https://therapy-scheduling-three.vercel.app` на проді (18:38, застосунок `d5647b3`): NC-1 → FAIL (R1), NC-2 → NEEDS-HUMAN (R3) — [negative-controls/report.md](uat/2026-11-09/negative-controls/report.md); для AC-INS — червоний прогін і мутанти I1–I5 на рівнях бази й unit | низький: правила R1/R3 — спільний код конвеєра, не залежать від AC |
| Відео прогону UAT (усі 6 AC) | відео й траси не в git (`test-results/`), до PR **не прикладено** | кадри «Тоді» в git, розбір агента з цитатами, звіреними зі сторінкою (aria) | PM не може переглянути прогін відео |
| AC-INS-01…03 — рев'ю коду задачі 1 (міграція, `setInsuranceStatus`, сторінка й форма) | CodeRabbit у PR #45 не запустився: «Review rate limited» ([коментар](https://github.com/pavmys/therapy-scheduling/pull/45#issuecomment-6738970597)); рев'ю #46 охопило лише зміни після `23a6d66`, рев'ю #48 — лише `insurance-form.tsx` і тести | CodeRabbit переглянув план `impl-insurance-status` (PR #44, 2 Major виправлено), тести бази й unit, мутанти I1–I5 на правилах доступу, UAT на проді | середній: міграцію й дію `setInsuranceStatus` ніхто, крім агента-автора й тестів, не рецензував |

FAIL і NEEDS-HUMAN у підсумку UAT немає. Розбіжність рецензентів (Haiku: NEEDS-HUMAN на AC-INS-04 і AC-INS-06,
Sonnet: PASS) — у таблиці вище.

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
| https://github.com/pavmys/therapy-scheduling/pull/46 (`54c483b`) | 2. Терапевт і гість не змінюють статус | AC-INS-04, AC-INS-05, AC-INS-06 | коментарів до коду 0. Попередження pre-merge «Тип PR і межі змін» (`scripts/mutants.mjs`, текст 2.2) — аргумент у [коментарі](https://github.com/pavmys/therapy-scheduling/pull/46#issuecomment-6743715416) (після злиття) | [job 129204768461](https://github.com/pavmys/therapy-scheduling/actions/runs/42630103998/job/129204768461) — «Remote database is up to date» (міграцій немає) |
| https://github.com/pavmys/therapy-scheduling/pull/47 (`d5451ef`) | 3. UAT на кожен AC (і archive `impl-insurance-status`) | AC-INS-01…06 (UAT) | 3 Minor виправлено в [770188e](https://github.com/pavmys/therapy-scheduling/commit/770188e288e369ff6342195134a399b34e7e3a1f), відповідь у кожному треді: [NC у маніфесті](https://github.com/pavmys/therapy-scheduling/pull/47#discussion_r4513980214), [опис 3.1](https://github.com/pavmys/therapy-scheduling/pull/47#discussion_r4513980225), [`setInsuranceStatusDirectly`](https://github.com/pavmys/therapy-scheduling/pull/47#discussion_r4513980298). Попередження «Тип PR і межі змін» щодо `docs/qa/uat/` — аргумент у [коментарі](https://github.com/pavmys/therapy-scheduling/pull/47#issuecomment-6743106000). Уточнення в треді `setInsuranceStatusDirectly` (`like` пропускав адреси поза `UAT_EMAIL`) пропустили до злиття — виправлено в #48, [відповідь](https://github.com/pavmys/therapy-scheduling/pull/47#discussion_r4514485426) | [job 129238580466](https://github.com/pavmys/therapy-scheduling/actions/runs/42639803790/job/129238580466) (міграцій немає) |
| https://github.com/pavmys/therapy-scheduling/pull/48 (`d5647b3`) | хвости зрізу 3 (поза `tasks.md`, знайдені під час proof pack) | AC-INS-02 (заборона «Not set», селект), UAT-хелпер | 1 Trivial (перевірити значення поля в UAT AC-INS-02) — виправлено в `68b54c1`, [відповідь](https://github.com/pavmys/therapy-scheduling/pull/48#discussion_r4514815642) | [job 129275615258](https://github.com/pavmys/therapy-scheduling/actions/runs/42650367220/job/129275615258) (міграцій немає) |

- Ворота на `main` (`quality`): https://github.com/pavmys/therapy-scheduling/actions/runs/42650367254 (`d5647b3`) — success. CI на `main` для
  кожного злиття зрізу (`spec`, `app`, `conformance`, `db-check`, `db-deploy`) — success:
  [#45](https://github.com/pavmys/therapy-scheduling/actions/runs/42623601881),
  [#46](https://github.com/pavmys/therapy-scheduling/actions/runs/42630103998),
  [#47](https://github.com/pavmys/therapy-scheduling/actions/runs/42639803790),
  [#48](https://github.com/pavmys/therapy-scheduling/actions/runs/42650367220).
- Мутації: SQL- і точкові TS-мутанти [scripts/mutants.mjs](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/scripts/mutants.mjs)
  (I1–I5), таблиці з виводом — в описах [PR #46](https://github.com/pavmys/therapy-scheduling/pull/46) і [PR #48](https://github.com/pavmys/therapy-scheduling/pull/48). Повтор 09.11.2026 на `d5647b3`:

  | Мутант | AC | Що зламано | Вердикт | Який тест упав |
  |---|---|---|---|---|
  | I1 (SQL) | AC-INS-05 | `clients_update_insurance_staff`: `using (true) with check (insurance_status <> 'not_set')` | KILLED | AC-INS-05: therapist1 напряму змінює статус свого client6 на 'verified' — 0 рядків, scheduler1 бачить 'not_accepted' |
  | I5 (SQL) | AC-INS-02 | `clients_update_insurance_staff`: `with check ((select private.is_staff()))` — без заборони «Not set» | KILLED | AC-INS-02: повернути «Not set» не можна — ні scheduler1, ні admin1, статус лишається 'verified' |
  | I2 (TS) | AC-INS-05 | `setInsuranceStatus`: `if (!user \|\| !isStaffRole(user.role))` → `if (!user)` | KILLED | AC-INS-05: therapist1 напряму викликає дію «Verified» для client6 — відмова, запиту update до clients немає |
  | I3 (TS) | AC-INS-06 | картка: `redirect("/login")` → `void 0` | KILLED | AC-INS-06: гість без входу за прямим посиланням на картку — redirect на /login, картку з бази не запитано |
  | I4 (TS) | AC-INS-04 | картка: `role === "staff" ? <InsuranceForm` → `true ? <InsuranceForm` | KILLED | AC-INS-04: терапевт у картці свого client6 бачить «Insurance: Not accepted», форми зміни статусу немає |

  Stryker для файлів зрізу 3 (`src/lib/clients/insurance.ts`, `src/app/clients/[id]/actions.ts`) не запускали:
  у PR #45–#48 його виводу немає. «До → після» для зрізу 3 немає: вижилих мутантів I1–I5 не було.

## C. UAT на проді

- Звіт: [docs/qa/uat/2026-11-09/report.md](uat/2026-11-09/report.md)
  — `npm run uat -- --url https://therapy-scheduling-three.vercel.app`, застосунок `d5647b3`, код тестів `68b54c1`
  (збігається з `d5647b3`: `git diff 68b54c1 d5647b3 -- tests src scripts supabase` порожній), 09.11.2026 18:32
  (Київ), Playwright 64,5 с; 9 AC (AC-INS-01…06 і регрес AC-CARD-06, -07, -16) — PASS 9, FAIL 0, NEEDS-HUMAN 0.
  Попередній прогін (16:10, застосунок `54c483b`) — теж 9 PASS, [в історії на `d5451ef`](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/report.md).
- Виправлення з #48 видно на кадрі: після збереження поле «Insurance status» показує «Verified»
  ([AC-INS-02-then-1](uat/2026-11-09/frames/AC-INS-02-then-1.png)), до виправлення — «Select a status…»
  ([на `d5451ef`](https://github.com/pavmys/therapy-scheduling/blob/d5451ef219f3066b32bc528adc64d6b01f780e8e/docs/qa/uat/2026-11-09/frames/AC-INS-02-then-1.png)).
- Відео: не в git і до PR **не прикладено**. У звіті — лише шляхи `test-results/…/video.webm` на машині, де
  ішов прогін.
- Рецензент: `claude-haiku-5-5`, суперечки — `claude-sonnet-5-5` (у цьому прогоні — AC-INS-04 і AC-INS-06: Haiku
  NEEDS-HUMAN → Sonnet PASS); розбір — $0,0959 за цінами API.
- Негативний контроль: `npm run uat:nc -- --url https://therapy-scheduling-three.vercel.app`, окремий прогін 18:38 на
  проді (застосунок `d5647b3`), розбір $0,0344; обидва контролі — на AC-CARD-16 (лише читання):
  - NC-1 — у твердженні навмисно інший текст («This client card was not found.») → перевірка впала, Haiku: PASS →
    **FAIL** (R1);
  - NC-2 — анотація `ac-text` з уточненим текстом, тест і застосунок без змін → Haiku і Sonnet: FAIL →
    **NEEDS-HUMAN** (R3).

  Звіт, маніфест і кадри — [negative-controls/](uat/2026-11-09/negative-controls/report.md); ті самі записи — у
  `negativeControls` маніфесту основного прогону.
- Дані: `@writes` — усі шість тестів AC-INS: `uat-261109163226-ins01…06@example.test` (свої картки, для AC-INS-04/05
  ще слот 2099 року й «Held»-утримання). Прибирання ([рядок звіту](uat/2026-11-09/report.md?plain=1#L7)): видалено 6, лишилось 0, їхніх рядків — 0.
  На кадрах — лише адреси `*@example.test`.

### Приймання PM

Станом на 09.11.2026 18:41 (Київ) рішень PM немає: у звіті UAT поля «Рішення PM» порожні, коментарів-підписів у
[#33](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling-spec/issues/33) після 06.11 немає, issues
«Відхилення від вимог» до AC-INS немає.

| AC | Рішення PM | Посилання |
|---|---|---|
| AC-INS-01 | очікує приймання PM | [розділ звіту](uat/2026-11-09/report.md?plain=1#L126) |
| AC-INS-02 | очікує приймання PM | [розділ звіту](uat/2026-11-09/report.md?plain=1#L150) |
| AC-INS-03 | очікує приймання PM | [розділ звіту](uat/2026-11-09/report.md?plain=1#L180) |
| AC-INS-04 | очікує приймання PM | [розділ звіту](uat/2026-11-09/report.md?plain=1#L207) |
| AC-INS-05 | очікує приймання PM | [розділ звіту](uat/2026-11-09/report.md?plain=1#L237) |
| AC-INS-06 | очікує приймання PM | [розділ звіту](uat/2026-11-09/report.md?plain=1#L261) |

## D. Прод і ретро

- `/api/health` після злиття всіх задач: sha `d5647b3`, env production, db ok (09.11.2026 18:41, Київ)
- Нові ролі й акаунти: немає. UAT використав наявні admin1, scheduler1, scheduler2, therapist1 (`@example.test`);
  `accounts.zip` не змінювався з D0 ([aca806d](https://github.com/pavmys/therapy-scheduling/commit/aca806df1e223497927a330bf44a6df39eeeda77), PR #34) —
  [accounts.zip на d5647b3](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/accounts.zip)
- `docs/conformance.md`: [рядки AC-INS-01…06 — «реалізовано»](https://github.com/pavmys/therapy-scheduling/blob/d5647b384630429ea9fd40da65cd7a09cdb27152/docs/conformance.md?plain=1#L96-L101)

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
