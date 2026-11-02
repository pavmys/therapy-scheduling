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
| AC-…-NN | <!-- політика / функція бази / TS-модуль / сторінка --> | <!-- unit / база (PGlite) / e2e --> | … | <!-- …/blob/<sha>/tests/…#L<N> --> |

### Покриття

| Файл за AC | Рядки | Гілки | Чим доведено, якщо 0 % |
|---|---|---|---|
| <!-- src/lib/<модуль>.ts --> | … % | … % | — |
| <!-- src/app/<сторінка>/page.tsx --> | 0 % | 0 % | <!-- e2e: tests/e2e/….spec.ts --> |

### Доказ мутацією

| Мутант (файл:рядок, що змінено) | AC під загрозою | До | Тест, посилений з тексту AC | Після |
|---|---|---|---|---|
| <!-- src/lib/…/x.ts:14 `<=` → `<` --> | AC-…-NN | вижив | <!-- …/blob/<sha>/tests/…#L<N>: межа «…» з AC --> | убитий |

- Stryker: <!-- score до → після, посилання на PR з виводом -->
- SQL-мутації (`npm run mutation:sql`): <!-- таблиця з npm run mutation:sql -- --markdown (KILLED / SURVIVED / ERROR) з PR або «немає PGlite-гарнесу» -->
- Еквівалентні мутанти: <!-- який і чому (рядок міграції чи коду, що робить його еквівалентним) або «немає» -->

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

- PR з вадами (не злитий): <!-- …/pull/N -->
- Ключ і таблиця: <!-- …/pull/N#issuecomment-M -->

| # | Вада (ключ) | CodeRabbit | `/code-review high` |
|---|---|---|---|
| 1 | <!-- категорія і файл:рядок --> | <!-- знайшов / пропустив + цитата --> | <!-- знайшов / пропустив + цитата --> |
| 2 | … | … | … |
| 3 | … | … | … |
| П | приманка: <!-- що --> | <!-- хибна тривога? цитата --> | <!-- хибна тривога? цитата --> |

- Інші знахідки: <!-- слушна / шум, по рядку на кожну -->
- Правило, що закриває пропуск: <!-- рядок в AGENTS.md чи path instruction, …/commit/<sha> -->
- Повторний прогін: <!-- хто, результат, цитата, …/pull/N#issuecomment-M -->
