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
- `/api/health` на момент UAT: <!-- sha і db, напр. «sha 1a2b3c4, db ok, 01.11.2026» -->

## 3 AC

| AC | Вид | «Тоді» (дослівно з вимоги PM) |
|---|---|---|
| AC-CARD-06 | відмова в браузері (заборонена роль) | Тоді форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася. |
| AC-CARD-16 | стан інтерфейсу (помилка) | Тоді scheduler1 бачить повідомлення «This client card doesn't exist.», therapist1 — «You don't have access to this client.», і жоден із них не бачить жодних даних клієнтів. |
| AC-CARD-07 | відмова в браузері (не увійшов) | Тоді він бачить лише сторінку входу, жодних даних клієнтів чи утримань не показано, і жодна картка не змінилася. |

Усі три — лише читання (без `@writes`): UAT на проді не створює й не змінює даних.

## A. Ворота

- PR воріт: https://github.com/pavmys/therapy-scheduling/pull/35
- Зелений `quality` на `main`: <!-- …/actions/runs/N -->
- Обов'язкові перевірки в `solo-main` з <!-- дата -->: <!-- назви jobs -->

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
| AC-…-NN | <!-- …/blob/<sha>/tests/e2e/….spec.ts --> | <!-- passed / failed --> | <!-- Haiku: PASS / FAIL / NEEDS-HUMAN (+ Sonnet, якщо була суперечка) --> | <!-- PASS / FAIL / NEEDS-HUMAN і правило (R1–R6) --> | <!-- …/blob/<sha>/docs/qa/uat/<дата>/frames/AC-…-then-1.png --> |

- Звіт: <!-- …/blob/<sha>/docs/qa/uat/<YYYY-MM-DD>/report.md -->
- Відео: <!-- вкладення в описі PR …/pull/N -->
- Рецензент: <!-- моделі зі звіту (claude-haiku-5-5; суперечки — claude-sonnet-5-5) і вартість прогону -->
- Негативний контроль: <!-- NC-… (npm run uat:nc): що навмисно хибне, вердикт (FAIL / NEEDS-HUMAN), …/pull/N -->
- Дані: <!-- «лише читання» або «@writes: uat-<запуск>@example.test, рядок «Прибирання» зі звіту» -->

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
