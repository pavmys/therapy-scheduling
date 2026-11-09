# QA proof pack: Планувальник заповнює картку клієнта з анкети, а терапевт бачить картки лише своїх клієнтів

<!--
Шаблон з koldovsky/2026-quitcode-08-quality-hw/materials/templates/proof-pack.template.md.
Покладіть у docs/qa/proof-pack.md вашого репо й заповнюйте по кроках WS8 (A → B → C → D).
Посилання — на файли на коміті (…/blob/<sha>/…#L<N>), на PR (…/pull/N) і на прогони (…/actions/runs/N).
Жодних паролів і пароля від accounts.zip. Акаунти — лише адреси *@example.test.
Цей файл — вхід для конвеєра WS9: на кожен AC видно, чим він доведений.
-->

- Прод-URL: https://therapy-scheduling-three.vercel.app
- Вимоги: https://github.com/Sofiia-pm/therapy-scheduling-spec · джерело: issues · знімок 2026-10-26
  (зріз 2 — [Sofiia-pm/therapy-scheduling-spec#19](https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/19))
- `/api/health` на момент UAT: sha `8d2fec6`, db ok, 02.11.2026

## 3 AC

| AC | Вид | «Тоді» (дослівно з вимоги PM) |
|---|---|---|
| AC-CARD-06 | відмова в браузері (заборонена роль) | Тоді форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася. |
| AC-CARD-16 | стан інтерфейсу (помилка) | Тоді scheduler1 бачить повідомлення «This client card doesn't exist.», therapist1 — «You don't have access to this client.», і жоден із них не бачить жодних даних клієнтів. |
| AC-CARD-07 | відмова в браузері (не увійшов) | Тоді він бачить лише сторінку входу, жодних даних клієнтів чи утримань не показано, і жодна картка не змінилася. |

Усі три — лише читання (без `@writes`): UAT на проді не створює й не змінює даних.

## A. Ворота

- PR воріт: https://github.com/pavmys/therapy-scheduling/pull/35
- Зелений `quality` на `main`: https://github.com/pavmys/therapy-scheduling/actions/runs/41427277986 (`8d2fec6`, усі три jobs — success)
- Обов'язкові перевірки в `solo-main` з 02.11.2026: `spec`, `app`, `conformance`, `db-check`, «Ворота: fallow audit»,
  «Покриття: доменна підлога» («Порада: вразливі залежності» — дорадча, не обов'язкова)

Розбір першого повного прогону `fallow` (той самий — в описі PR воріт). Перший прогін (`npx fallow --no-cache` на
`aca806d` з конфігом матеріалів): мертвий код — 3 файли й 9 експортів, 5 груп дублікатів, 20 функцій понад пороги
складності. Після PR мертвого коду 0; дублікати й складність лишились успадкованими (`audit` з `gate: new-only`
валить лише нове).

| Група знахідок | Скільки | Справжня / навмисна / хибна | Дія і причина |
|---|---|---|---|
| unused re-export текстів помилок полів у `src/lib/clients/messages.ts` | 6 | справжня | прибрано: споживачі імпортують ці тексти з `validate.ts` напряму |
| unused export `SLOT_STATUS_LABEL`, `HOLD_STATUS_LABEL` у `src/lib/holds/status.ts` | 2 | справжня | прибрано: підписи статусів — у `StatusBadge` (DESIGN.md, розділ 5), ці константи ніхто не читав |
| unused export `AC_ID_GLOBAL` у `scripts/lib/spec-lib.mjs` | 1 | навмисна | `ignoreExports` для цього імені: скрипт шаблону курсу, не змінюємо; експорт — частина його API |
| unused file `src/lib/supabase/client.ts` | 1 | навмисна | `ignoreFindings`: браузерний клієнт шаблону (AGENTS.md, «Структура»), Client Components із Supabase поки немає |
| unused file `src/lib/utils.ts` | 1 | хибна | `ignoreFindings`: файл читає `npx shadcn add` через alias `utils` у `components.json`, а не `import` |
| unused file `src/components/ui/badge.tsx` | 1 | навмисна | `ignoreFindings`: компонент дизайн-системи (DESIGN.md, розділ 5) |
| дублікати `scripts/check-design-tokens.mjs` ↔ `scripts/check-server-boundary.mjs` | 2 групи | навмисна | лишити: скрипти з матеріалів курсу WS7 (`architecture.yml`), не змінюємо |
| дублікати сторінок (`slots` ↔ `schedule`, `clients` ↔ `holds`, вступ доступу в 3 сторінках) | 3 групи | справжня (дрібна) | лишити: успадковане, 6–12 рядків розмітки; спільний компонент — окремим PR, не в WS8 |
| складність скриптів шаблону й WS7 (`check-spec`, `create-demo-users`, `check-design-tokens`, `check-server-boundary`) | 9 функцій | навмисна | `health.ignore` з тією самою причиною, що вже є в конфігу для інших скриптів курсу |
| складність `src/app/api/health/route.ts` (`GET`) | 1 | навмисна | лишити: файл із матеріалів D0; лише оцінка CRAP (`warn`), бо без файлу покриття |
| складність сторінок і домену (`SlotsPage` CRITICAL, `HoldsPage`, `ClientsPage`, `SchedulePage`, `validateCard`) | 6 | справжня | лишити: успадковане; розбиття `SlotsPage` (і `holds/status.ts`, ціль №1 fallow) — окремий PR |
| складність помічників `texts()` у 3 тестах сторінок | 3 | справжня (дрібна) | лишити: оцінка CRAP для рекурсивного обходу дерева React; спільний помічник — разом із рефакторингом сторінок |

Тестові правила лінтера (`npm run lint`, обов'язковий `app`): 5 помилок «не мокайте власні модулі» — 5 тестів сторінок
підміняли `getCurrentUser` з `@/lib/auth`. Справжня: виправлено — тести підміняють лише клієнт Supabase
(`@/lib/supabase/server`, правило це дозволяє), тож працює справжній `getCurrentUser` (`getClaims`, роль із
`profiles`). Правил не вимкнено.

Підлога покриття (`FLOORED`, 90/85/90/90 на файл): `access`, `auth`, `clients/search`, `clients/validate`, `form`,
`health`, `holds/status`, `time`. Нижче поки: `clients/view` (рядки 88 %), `holds/messages` (рядки 85 %),
`schedule/load` (гілки 64 %). Перевірено, що підлога валить прогін: з `clients/view` у списку `test:coverage` —
код 1.

## B. Якість тестів

### Рівень для кожного AC

| AC | Де живе правило | Рівень | Чому | Тест |
|---|---|---|---|---|
| AC-CARD-06 | двічі: SQL — політика `clients_insert_staff` і `private.is_staff()` ([roles_and_clients.sql#L75](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/supabase/migrations/20261022040716_roles_and_clients.sql#L75)); TS — перевірка ролі в `createClientCard` ([actions.ts#L37](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/src/app/clients/actions.ts#L37)) для тексту PM; сторінка `/clients/new` (`staffOnlyPage`) — без форми | база (PGlite) + ядро дії + e2e | правило двічі: SQL — остання межа, TS — повідомлення; кожен шар може втратити правило окремо. Тест дії підміняє лише клієнт Supabase (роль — справжній `getCurrentUser`), тож «запису немає» доводить саме база | [client-cards.test.ts#L25](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/tests/db/client-cards.test.ts#L25) (база: `asUser` therapist1 → RLS, кількість незмінна), [actions.test.ts#L117](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/src/app/clients/actions.test.ts#L117), [new/page.test.ts#L43](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/src/app/clients/new/page.test.ts#L43), [client-cards.spec.ts#L22](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/tests/e2e/client-cards.spec.ts#L22) (UAT) |
| AC-CARD-07 | SQL — `revoke all … from anon` і grant лише `authenticated` на `clients` і `holds` ([roles_and_clients.sql#L58](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/supabase/migrations/20261022040716_roles_and_clients.sql#L58), [slots_and_holds.sql#L63](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/supabase/migrations/20261022042804_slots_and_holds.sql#L63)); сторінка входу — `src/proxy.ts` → `src/lib/supabase/proxy.ts` і `accessFor` у сторінках ([access.ts#L11](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/src/lib/access.ts#L11)) | база (PGlite) + e2e | «жодних даних і жодна картка не змінилась» тримає GRANT — лише справжній SQL це доводить; «лише сторінка входу» — перехід proxy, який Vitest не запускає | [app-access.test.ts#L34](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/tests/db/app-access.test.ts#L34) (`asAnon` → permission denied, `asService` — нічого не змінилось), [access.test.ts#L5](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/src/lib/access.test.ts#L5), [page.test.ts#L59](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/src/app/page.test.ts#L59), [client-cards.spec.ts#L120](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/tests/e2e/client-cards.spec.ts#L120) (UAT) |
| AC-CARD-16 | TS — `missingClientMessage` ([view.ts#L61](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/src/lib/clients/view.ts#L61)) і сторінка `/clients/[id]`: 0 рядків під RLS → текст за роллю | unit + e2e | точний текст, який бачить людина: unit тримає вибір тексту за роллю, e2e — що його видно й даних немає (асинхронну серверну сторінку Vitest рендерить лише з підміненим клієнтом). SQL-правила з межею тут немає: неіснуюча картка — 0 рядків для будь-якої ролі | [view.test.ts#L55](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/src/lib/clients/view.test.ts#L55), [[id]/page.test.ts#L95](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/src/app/clients/%5Bid%5D/page.test.ts#L95), [client-cards.spec.ts#L68](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/tests/e2e/client-cards.spec.ts#L68) (UAT) |

Тестів, що перевіряють мок чи TS-копію SQL-правила замість самого правила, серед цих AC немає: SQL-правила AC-CARD-06 і
AC-CARD-07 доводять тести бази на PGlite з міграціями, а тести дії й сторінок підміняють лише клієнт Supabase.

### Покриття

`npm run test:coverage` на `8ed7922`: разом рядки 73 % (312 з 426), гілки 59 %.

| Файл за AC | Рядки | Гілки | Чим доведено, якщо 0 % |
|---|---|---|---|
| `src/lib/access.ts` (AC-CARD-07) | 100 % (6/6) | 100 % (8/8) | — |
| `src/lib/clients/view.ts` (AC-CARD-16) | 89 % (16/18) | 83 % (19/23) | — (непокриті рядки 27 і 34 — підписи опікуна, не `missingClientMessage`) |
| `src/lib/clients/messages.ts` (тексти AC-CARD-06) | 100 % (4/4) | — | — |
| `src/app/clients/actions.ts` (AC-CARD-06) | 95 % (19/20) | 95 % (19/20) | — |
| `src/app/clients/new/page.tsx` (AC-CARD-06) | 83 % (5/6) | 50 % (3/6) | — |
| `src/app/staff-only.tsx` (AC-CARD-06) | 100 % (1/1) | 100 % (1/1) | — |
| `src/app/clients/[id]/page.tsx` (AC-CARD-16) | 100 % (13/13) | 79 % (11/14) | — |
| `src/app/page.tsx` (AC-CARD-07) | 100 % (6/6) | 100 % (6/6) | — |
| `src/proxy.ts`, `src/lib/supabase/proxy.ts` (AC-CARD-07) | 0 % | 0 % | e2e: [client-cards.spec.ts#L120](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/tests/e2e/client-cards.spec.ts#L120) — UAT на проді, три прямі посилання без входу → лише `/login` |
| `supabase/migrations/…` (AC-CARD-06, -07) | — (SQL v8 не міряє) | — | база на PGlite + `npm run mutation:sql` (нижче) |

### Доказ мутацією

| Мутант (файл:рядок, що змінено) | AC під загрозою | До | Тест, посилений з тексту AC | Після |
|---|---|---|---|---|
| `supabase/migrations/20261022040716_roles_and_clients.sql:61` `grant insert (full_name, email) … to authenticated` → `… to authenticated, anon` (C4) | AC-CARD-07 | вижив | [app-access.test.ts#L47](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/tests/db/app-access.test.ts#L47): «жодна картка не змінилася» — анонім не пише навіть у `(full_name, email)` | убитий |

- Stryker 10.1.1 (`npm run mutation:ts -- --mutate src/lib/clients/view.ts,src/lib/access.ts`, на `d234d4b`):
  **95,38 %** — вбито 62, вижило 3, без покриття 0. `access.ts` (AC-CARD-07) — 100 % (23 з 23);
  `view.ts` — 92,86 %, `missingClientMessage` (AC-CARD-16) — усі 7 мутантів вбито. **Вижилих на рядках цих 3 AC
  немає**, тож «до/після» тут немає. Замість цього в proof pack ручні мутанти на межі AC, які тести вбивають
  (`node scripts/mutation-check.mjs --kind ts`, [mutants.mjs](https://github.com/pavmys/therapy-scheduling/blob/d234d4bc6123df63cf36b1767a38da2a65991139/scripts/mutants.mjs)):

  | Мутант | AC | Що зламано | Вердикт | Який тест упав |
  |---|---|---|---|---|
  | T1 | AC-CARD-16 | `missingClientMessage` ([view.ts#L62](https://github.com/pavmys/therapy-scheduling/blob/d234d4bc6123df63cf36b1767a38da2a65991139/src/lib/clients/view.ts#L62)): терапевт бачить «This client card doesn't exist.» — підказку, що картки немає | KILLED | [AC-CARD-16: картки немає — staff і терапевт бачать різні тексти PM](https://github.com/pavmys/therapy-scheduling/blob/d234d4bc6123df63cf36b1767a38da2a65991139/src/lib/clients/view.test.ts#L55) |
  | T2 | AC-CARD-07 | `accessFor` ([access.ts#L12](https://github.com/pavmys/therapy-scheduling/blob/d234d4bc6123df63cf36b1767a38da2a65991139/src/lib/access.ts#L12)): без входу — екран «без ролі» замість сторінки входу | KILLED | [AC-CARD-07: відвідувач без входу — лише сторінка входу](https://github.com/pavmys/therapy-scheduling/blob/d234d4bc6123df63cf36b1767a38da2a65991139/src/lib/access.test.ts#L5) |

  Троє вижилих — на рядках інших AC, не цих трьох; лишені для окремої задачі:
  - `view.ts:26` `if (client.guardian_email)` → `if (true)` (AC-CARD-10, контакт у картці) — прогалина AC: немає
    тесту картки без email і без опікуна (стара картка зрізу 1 → «Not provided»);
  - `view.ts:33` те саме в `clientOptionLabel` (AC-CARD-02) — прогалина AC: немає клієнта без email і опікуна;
  - `view.ts:39` `value.trim()` → `value` (AC-CARD-04/10, «Not provided») — нерозрізнений вхід: немає значення з
    самих пробілів.
- `npm audit`: Stryker додав 4 moderate лише в dev-залежностях (`@stryker-mutator/*`, `minimatch`);
  `npm audit --omit=dev` — без змін (6, усі ще до Stryker).
- SQL-мутації (`npm run mutation:sql -- --markdown`, [scripts/mutants.mjs](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/scripts/mutants.mjs)) на `8ed7922`: **5 з 6 вбито (83 %), прийнято еквівалентних: 1**, ≈6 с. «До» посилення тесту C4 вижив (4 з 6).

  | Мутант | AC | Що зламано | Вердикт | Який тест упав |
  |---|---|---|---|---|
  | C1 | AC-CARD-06 | політика `clients_insert_staff` послаблена до `true`: картку створює будь-хто з входом | KILLED | AC-CARD-06: терапевт не створює картку клієнта напряму, кількість карток не змінилась |
  | C2 | AC-CARD-06 | хелпер `private.is_staff()` рахує терапевта за staff | KILLED | AC-CARD-06: терапевт не створює картку клієнта напряму, кількість карток не змінилась |
  | C3 | AC-CARD-07 | `grant select` на `clients` і для anon | KILLED | AC-CARD-07: без входу список клієнтів, картка й утримання недоступні, жодна картка не змінилась |
  | C4 | AC-CARD-07 | `grant insert (full_name, email)` на `clients` і для anon | вижив → **KILLED** | те саме (після посилення — [app-access.test.ts#L47](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/tests/db/app-access.test.ts#L47)) |
  | C5 | AC-CARD-07 | `grant select` на `holds` і для anon | KILLED | те саме |
  | C6 | AC-CARD-06, -07 | `private.is_staff()` без `coalesce`: NULL замість false для користувача без ролі | SURVIVED (еквівалентний, прийнято) | — |

- C4 — прогалина AC «нерозрізнений вхід»: спроба insert від аноніма писала й у колонки анкети (`client_type`,
  `date_of_birth`, `session_language`), на які анонім прав не має взагалі, тож відмова не залежала від grant на
  `(full_name, email)`. Тест посилила окрема сесія агента з тексту AC («жодна картка не змінилася», промпт P03):
  insert лише в `(full_name, email)` → `permission denied`; під мутантом запит доходить до RLS з іншою помилкою.
  Коміт: [8ed7922](https://github.com/pavmys/therapy-scheduling/commit/8ed79222e1b7589850dc2691d3ad717f98332c4a).
- Еквівалентні мутанти: C6 — NULL в `using` / `with check` RLS вважає відмовою, як `false`, тож для політик `clients`
  поведінка та сама; `coalesce` потрібен лише для `not private.is_staff()` у функціях утримань
  ([slots_and_holds.sql#L115](https://github.com/pavmys/therapy-scheduling/blob/8ed79222e1b7589850dc2691d3ad717f98332c4a/supabase/migrations/20261022042804_slots_and_holds.sql#L115), AC-HOLD-08), поза цими 3 AC.
- AC-CARD-16 SQL-мутанта не має: правило живе в TS і на сторінці — його доводить Stryker.

## C. UAT на проді

| AC | Специфікація | Тест (твердження) | Агент | Вердикт | Кадр |
|---|---|---|---|---|---|
| AC-CARD-06 | [client-cards.spec.ts#L21](https://github.com/pavmys/therapy-scheduling/blob/9f90ce3af18f2fc6650262066998fb9e9a9b086d/tests/e2e/client-cards.spec.ts#L21) | passed | Haiku: PASS | PASS (R6) | [then-1](https://github.com/pavmys/therapy-scheduling/blob/9f90ce3af18f2fc6650262066998fb9e9a9b086d/docs/qa/uat/2026-11-02/frames/AC-CARD-06-then-1.png) |
| AC-CARD-16 | [client-cards.spec.ts#L67](https://github.com/pavmys/therapy-scheduling/blob/9f90ce3af18f2fc6650262066998fb9e9a9b086d/tests/e2e/client-cards.spec.ts#L67) | passed | Haiku: PASS | PASS (R6) | [then-1](https://github.com/pavmys/therapy-scheduling/blob/9f90ce3af18f2fc6650262066998fb9e9a9b086d/docs/qa/uat/2026-11-02/frames/AC-CARD-16-then-1.png) (scheduler1), [then-2](https://github.com/pavmys/therapy-scheduling/blob/9f90ce3af18f2fc6650262066998fb9e9a9b086d/docs/qa/uat/2026-11-02/frames/AC-CARD-16-then-2.png) (therapist1) |
| AC-CARD-07 | [client-cards.spec.ts#L119](https://github.com/pavmys/therapy-scheduling/blob/9f90ce3af18f2fc6650262066998fb9e9a9b086d/tests/e2e/client-cards.spec.ts#L119) | passed | Haiku: PASS | PASS (R6) | [then-1](https://github.com/pavmys/therapy-scheduling/blob/9f90ce3af18f2fc6650262066998fb9e9a9b086d/docs/qa/uat/2026-11-02/frames/AC-CARD-07-then-1.png) (клієнти), [then-2](https://github.com/pavmys/therapy-scheduling/blob/9f90ce3af18f2fc6650262066998fb9e9a9b086d/docs/qa/uat/2026-11-02/frames/AC-CARD-07-then-2.png) (картка client6), [then-3](https://github.com/pavmys/therapy-scheduling/blob/9f90ce3af18f2fc6650262066998fb9e9a9b086d/docs/qa/uat/2026-11-02/frames/AC-CARD-07-then-3.png) (утримання) |

- Звіт: [docs/qa/uat/2026-11-02/report.md](https://github.com/pavmys/therapy-scheduling/blob/9f90ce3af18f2fc6650262066998fb9e9a9b086d/docs/qa/uat/2026-11-02/report.md) — прод `8d2fec6`, код тестів `9cc6f9e`, 02.11.2026 12:41 (Київ), Playwright 28,3 с, PASS 3 / FAIL 0 / NEEDS-HUMAN 0
- Відео: вкладення в описі PR UAT (по одному на AC)
- Рецензент: `claude-haiku-5-5`, суперечки — `claude-sonnet-5-5` (у цьому прогоні суперечок не було); розбір — $0,0077 за цінами API
- Негативний контроль (`npm run uat:nc`, AC-CARD-16, той самий код тестів `9cc6f9e`, 12:40):
  - NC-1 — у твердженні навмисно інший текст («This client card was not found.») → перевірка впала, Haiku сказав PASS → **FAIL** (R1: агент не перекриває впале твердження);
  - NC-2 — анотація `ac-text` з уточненим текстом PM, тест і застосунок без змін → перевірки зелені, Haiku і Sonnet: FAIL («Критерій вимагає «This client card was not found.», тож текст не збігається») → **NEEDS-HUMAN** (R3).
- Перший прогін (той самий день, код `77b50a1`) — FAIL на AC-CARD-16 і AC-CARD-07, обидва не вади продукту:
  - AC-CARD-16 — таймаут 60 с у `afterEach`: «Дано» відкривало `/clients`, список підвантажував посилання на картки (prefetch), а перехід далі лишав 4 запити `/clients/<id>?_rsc=…` без відповіді й помилки, і `attachRuntimeErrors` чекав їх (траса NC-1, статус -1). Усі кроки «Тоді» були зелені, Haiku — PASS. Виправлено в тесті: [9cc6f9e](https://github.com/pavmys/therapy-scheduling/commit/9cc6f9e9e6bd661a2d30f281ba9f247943827912);
  - AC-CARD-07 — на проді не було картки client6 (дані з вимог PM): «Дано» впало з «на проді немає картки клієнта client6@example.test». Картку створено вручну на проді під scheduler1 з даними AC-CARD-01 (Adult, «Client Six», client6@example.test, 1990-05-14, English).
- Дані: лише читання (жодного `@writes`); прибирання — видалено 0, лишилось 0. Єдиний запис на проді — картка client6, створена людиною через інтерфейс до прогону (див. вище).

### Приймання PM

| AC | Рішення PM | Посилання |
|---|---|---|
| AC-…-NN | <!-- ✅ / ❌ / NEEDS-HUMAN → … --> | <!-- коментар-підпис або issue «Відхилення від вимог» --> |

## D. Eval рецензента

- PR з вадами (закритий, не злитий): https://github.com/pavmys/therapy-scheduling/pull/39 — гілка `task/refactor-helpers`, нейтральні назва, коміти й опис; усі
  обов'язкові перевірки CI зелені (жодну ваду ворота не спіймали)
- Ключ і таблиця: https://github.com/pavmys/therapy-scheduling/pull/39#issuecomment-6581143652 (ключ до того лежав поза репо)
- Рецензенти: CodeRabbit (профіль ASSERTIVE, план Advanced); `/code-review high` — `claude -p … --setting-sources
  project --output-format json`, модель **claude-opus-5-5** (модель акаунта за замовчуванням), 70,5 с, $0,556 —
  вивід: [docs/qa/eval/code-review-pr39-run1.json](eval/code-review-pr39-run1.json)

| # | Вада (ключ) | CodeRabbit | `/code-review high` |
|---|---|---|---|
| 1 | права в даних: `private.is_staff()` перевизначено як `security definer` без `set search_path = ''` (`create or replace` прибирає SET) — `supabase/migrations/20261102152103_role_helper_comments.sql:3-10` | знайшов, але **Minor**: «Встановіть порожній `search_path` для `SECURITY DEFINER` функції. `CREATE OR REPLACE FUNCTION` без цього параметра прибирає попереднє значення `search_path`.» ([тред](https://github.com/pavmys/therapy-scheduling/pull/39#discussion_r4444260810)) | знайшов: «The migration recreates `private.is_staff()` as `security definer` without `set search_path = ''`, so it is not "logic unchanged": `create or replace` drops the `search_path` setting the original function had.» |
| 2 | авторизація в дії: роль спершу з `claims.user_metadata.role`, `profiles.role` — запасна — `src/lib/auth.ts:28` | знайшов, **Major** (CWE-639): «Беріть роль лише з профілю. Користувач може змінити `user_metadata.role` і після оновлення токена передати `"admin"`.» ([тред](https://github.com/pavmys/therapy-scheduling/pull/39#discussion_r4444260746)) | знайшов: «any user can write that field themselves, so any signed-in user can make themselves admin or scheduler.» |
| 3 | логіка (AC-HOLD-37): `holdsList` без умови «повторне утримання новіше» — `src/lib/holds/status.ts:62-63` | знайшов, **Major**: «Якщо повторне утримання теж прострочиться до початку слоту, обидва записи приховають один одного.» ([тред](https://github.com/pavmys/therapy-scheduling/pull/39#discussion_r4444260788)) | знайшов: «an expired hold is hidden whenever the same client has any other hold on the slot, older ones included, so two expired holds hide each other.» |
| П | приманка: `accessFor` використовує наявний `isStaffRole` замість того самого виразу — `src/lib/access.ts:1, 13` | хибної тривоги немає (коментаря немає) | хибної тривоги щодо поведінки немає; архітектурне зауваження: «The pure module `access.ts` used to import only types from `@/lib/auth` … It now has a runtime import» |

- Інші знахідки (усі від `/code-review`; CodeRabbit дав рівно 3 — по одній на ваду):
  - «зняття ролі в `profiles.role` більше не діє, бо `user_metadata` має пріоритет» (`auth.ts:28`) — слушна, наслідок вади 2;
  - «порушення правила AGENTS.md» для вад 1 і 2 — слушні, дублюють суть;
  - «досить `comment on function`, `create or replace` зайвий» (міграція :3) — слушна: саме ручна копія тіла загубила `search_path`;
  - «`access.ts` тепер має runtime-імпорт серверного модуля» (приманка) — слушна як зауваження до архітектури, не вада поведінки;
  - «немає тесту AC-HOLD-37 на два прострочені утримання» (`status.test.ts:147`) — слушна: тому вада 3 і пройшла тести.
- Правило, що закриває пропуск: найслабша знахідка — вада 1 у CodeRabbit (знайдено, але **Minor**, а не «must fix»).
  Рядок в AGENTS.md (розділ «База даних»): «Функція `security definer` без `set search_path = ''` — помилка рівня
  «must fix» (у рев'ю — Major), а не стиль … Це стосується й `create or replace` наявної функції …» —
  [PR #40](https://github.com/pavmys/therapy-scheduling/pull/40),
  [36fb2fe](https://github.com/pavmys/therapy-scheduling/commit/36fb2fe026c91d4239b55891c63e29a3f32c0190).
- Повторний прогін (після `git merge main` у гілку з вадами, `df6d571`): https://github.com/pavmys/therapy-scheduling/pull/39#issuecomment-6588017356
  - CodeRabbit (`@coderabbitai full review`, [рев'ю](https://github.com/pavmys/therapy-scheduling/pull/39#pullrequestreview-5742725888)): вада 1 — **Minor → Major**
    (CWE-426): «Зафіксуйте `search_path` для `SECURITY DEFINER` функції. Функція виконується з привілеями власника,
    але не має `set search_path = ''`.»; вада 2 — Major; вада 3 — **не повторив** («Duplicate comments: 2» — лише
    вади 1 і 2); приманка — тиша.
  - `/code-review high` (claude-opus-5-5, 56,3 с, $0,496, [вивід](eval/code-review-pr39-run2.json)): 3 з 3, вада 1 —
    з рівнем із правила: «A session that puts its own schema first can shadow those and change the result of
    is_staff() … AGENTS.md classes this as must fix.»; приманка — тиша.
  - Висновок: правило спрацювало для обох. Різні прогони — різні знахідки: повне рев'ю CodeRabbit не повторило ваду 3.
    Її правилом не закрити — лише тестом з AC (AC-HOLD-37 на два прострочені утримання), тобто у воротах.
- Ворота після eval (гілка `task/gate-tests`): обидві вади, які ловили лише рецензенти, тепер ловить CI (`app`, `npm test`):
  - вада 1 — `tests/db/security-definer.test.ts`: кожна функція `security definer` у `public` і `private` має
    `set search_path = ''` (стан після всіх міграцій); SQL-мутант S1 → KILLED; на міграції з PR #39 тест червоний
    (`private.is_staff`);
  - вада 3 — `src/lib/holds/status.test.ts`: «AC-HOLD-37: обидва утримання client1 прострочені, о 09:59 видно лише
    новіше «Expired»» і межа з 10:00 (тест написала окрема сесія агента з тексту AC, промпт P01); TS-мутант T3 →
    KILLED; на коді з PR #39 тест червоний;
  - вада 2 (`user_metadata`) лишається за правилом AGENTS.md і рецензентами: тести сторінок підміняють `getClaims`,
    тож роль з токена вони не відрізнять.
