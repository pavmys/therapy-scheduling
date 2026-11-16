# Design

## Context

Зріз 5 додає до картки клієнта (зріз 2, `openspec/specs/client-cards`) документи згоди і нову умову до підтвердження
утримання (зріз 1, `openspec/specs/slot-holds`). Специфікація — `openspec/specs/consent-documents` (AC-DOC-01…11) і
змінена вимога «Підтвердження утримання як сеансу» в `slot-holds`. Наявне, на що спираємось:

- `public.clients` з RLS: `clients_select_staff`, `clients_select_own_therapist` через `private.is_own_client`
  (ADR 0005, «свій клієнт» — «Held» до початку слоту або «Confirmed»).
- Підтвердження — `public.confirm_hold` → `private.confirm_hold_impl` (`security definer`, `set search_path = ''`,
  блокування рядка утримання, коди помилок `CONFIRM_FORBIDDEN`, `HOLD_NOT_FOUND`, `HOLD_ALREADY_CONFIRMED`,
  `HOLD_EXPIRED`, `SLOT_STARTED_CONFIRM`); Server Action `src/app/holds/actions.ts` мапить коди на тексти
  `src/lib/holds/messages.ts`.
- Картка `src/app/clients/[id]/page.tsx` під RLS, `getCurrentUser()` (`getClaims()` + роль з `profiles`), `accessFor`.
- Тести бази на PGlite (`tests/db/supabase-pglite.ts`, ADR 0004); мутанти SQL — `npm run mutation:sql`.

Нових ролей і залежностей немає. Нова таблиця, функції й зміна `confirm_hold_impl` — однією міграцією в задачі 1, до
будь-якого UI: так перевірка підписів (AC-DOC-07) розгорнута на проді раніше, ніж у картці можна сформувати перший
документ (порядок задач — `tasks.md`). Перед міграцією питаємо людину (AGENTS.md: «нові міграції — спитай спершу»).

## Goals / Non-Goals

**Goals:** AC-DOC-01…11; межі — у базі: хто формує й підписує (RLS + функції `private`), один набір на картку
(унікальність), час підпису — серверний, підтвердження без підписів не проходить навіть повз інтерфейс.

**Non-Goals:** файл підпису, е-підпис, іспанська версія, скасування «Signed», повторне формування чи редагування,
друк, пара й сім'я, сповіщення (Non-goals `add-consent-documents`). Повідомлення другому планувальнику при повторній
позначці (Q7, HryhoriiHaponiukQuitCode/therapy-scheduling-spec#37) чи одночасному формуванні (Q8,
HryhoriiHaponiukQuitCode/therapy-scheduling-spec#38) — після відповіді PM.

## UI і компоненти

- **Блок «Consent documents» у картці (AC-DOC-01…03, -05, -06):** `Card` під даними картки й рядком страхування.
  - Документів немає → `text-sm text-muted-foreground` «No consent documents yet.» (стан порожнього списку DESIGN.md);
    staff бачить `Button` `secondary` «Prepare consent documents» (підпис — наш: PM дає лише дію «формує»). Основна
    дія картки — та сама, що й була; кнопка формування — другорядна.
  - Документи є → `Table` (компактні рядки): назва — посилання на сторінку документа (з задачі 3, разом зі сторінкою;
    до того — простий текст); стан — текст «Not signed» або
    «Signed РРРР-ММ-ДД ГГ:ХХ» (`tabular-nums`); для staff у рядку непідписаного документа — `Button` `outline` `sm`
    «Mark as signed». `StatusBadge` не використовуємо: стани документа не в таблиці статусів DESIGN.md, нового токена
    не вигадуємо (як «Insurance: …» у зрізі 3).
  - Під таблицею — рядок `data-testid="consent-summary"`: «Missing signatures: <через кому в порядку набору>» або
    «All consent documents signed.» (дослівно з AC).
  - Кнопки формування й підпису після формування/підпису зникають (PM: «сформувати знову не запропоновано»; скасування
    «Signed» — поза межами). Під час відправлення — `disabled`.
- **Сторінка документа `/clients/[id]/consent/[kind]` (AC-DOC-04, -09…-11):** `kind` — `consent-to-treatment`,
  `cancellation-policy`, `release-of-information`. Заголовок сторінки — назва документа («Release of information»),
  рядки «Client: <ім'я>», для дитини «Guardian: <ім'я опікуна>», «Prepared: РРРР-ММ-ДД» (`tabular-nums`), сталий
  синтетичний текст згоди англійською (без справжніх назв і правил практики — «Припущення» PM) і стан.
  - staff + «Not signed» → `Button` «Mark as signed» (основна дія сторінки).
  - терапевт (свій клієнт) → документ і стан, кнопки немає; `Alert` (іконка `Lock`) «Only schedulers and admins can
    mark documents as signed.» (AC-DOC-09).
  - терапевт (чужий клієнт) → `Alert` з `Lock` «You don't have access to this client.», без тексту документа й даних
    клієнта (AC-DOC-10; той самий текст, що й для чужої картки, AC-CARD-05).
  - гість → `redirect("/login")` до будь-якого запиту (AC-DOC-11).
  - Документа такого типу для картки немає (не сформовано або `release-of-information` у дорослого) → `notFound()`
    для staff; для терапевта RLS однаково не покаже чужого — «You don't have access to this client.». Тексту PM для
    цього випадку немає, AC теж — нового повідомлення не вигадуємо.
- **Список утримань `/holds` (AC-DOC-07, -08):** форма підтвердження без змін; нова помилка — `Alert` `destructive`
  «Sign all consent documents before confirming.» тим самим механізмом, що й інші помилки підтвердження.

## Дані й RLS

### D1. Таблиця `public.consent_documents` (AC-DOC-01…03, «Припущення» PM)

Міграція `consent_documents` (задача 1; та сама міграція містить D2–D4):

- `id uuid primary key default gen_random_uuid()`, `client_id uuid not null references public.clients(id) on delete
  cascade`, `kind text not null check (kind in ('consent_to_treatment', 'cancellation_policy',
  'release_of_information'))`, `prepared_on date not null` (дата формування в America/Los_Angeles), `signed_at
  timestamptz` (null — «Not signed»), `signed_by uuid references public.profiles(id)`, `created_by uuid not null
  references public.profiles(id)`.
- `unique (client_id, kind)` — один документ кожного типу на картку, тож другий набір неможливий навіть при двох
  одночасних формуваннях («Припущення» PM, вимога «Формування…» після `align-consent-documents`).
- Набір і порядок (`consent_to_treatment`, `cancellation_policy`, далі для дитини `release_of_information`) — у коді
  (`src/lib/consent/documents.ts`: тип → назва, slug, порядок, сталий текст) і у функції формування; таблиця не
  зберігає назв і тексту: тип клієнта й ім'я не змінюються (картку не редагують), тож документ завжди відтворюється
  однаково.
- `enable row level security`; `revoke all … from anon, authenticated`; `grant select … to authenticated`; жодного
  `insert` / `update` / `delete` для `authenticated` — запис лише функціями D2, D3.
- Одна політика select `consent_documents_select` з `(select auth.uid()) is not null` і умовою `(select
  private.is_staff())` або `private.current_app_role() = 'therapist' and private.is_own_client(client_id)` — та сама
  межа, що й для картки (AC-DOC-09, AC-DOC-10; ADR 0005).

### D2. Формування — `public.prepare_consent_documents(p_client_id)` (AC-DOC-02, AC-DOC-03)

`private.prepare_consent_documents_impl` (`security definer`, `set search_path = ''`) + публічна обгортка `security
invoker`, як `confirm_hold`:

1. Не staff → `CONSENT_FORBIDDEN`.
2. `select … from public.clients where id = p_client_id for update` — блокування картки серіалізує одночасні
   формування; немає → `CLIENT_NOT_FOUND`.
3. Уже є документи → повертаємо наявні без змін (повторна чи одночасна спроба не створює другого набору; що бачить
   другий планувальник — Q8, до відповіді PM: картку з наявним набором без окремого повідомлення).
4. `insert` двох або трьох рядків за `client_type` з `prepared_on = (clock_timestamp() at time zone
   'America/Los_Angeles')::date`; `unique (client_id, kind)` — другий бар'єр.

### D3. Позначка «підписано» — `public.sign_consent_document(p_document_id)` (AC-DOC-05, AC-DOC-06, AC-DOC-09)

`private.sign_consent_document_impl` (міграція задачі 1), той самий шаблон:

1. Не staff → `SIGN_FORBIDDEN` (терапевт; AC-DOC-09 — стан не змінюється).
2. `select … for update` документа; немає → `DOCUMENT_NOT_FOUND`.
3. Уже `signed_at is not null` → повертаємо документ без змін: час першого підпису не перезаписується (Q7,
   HryhoriiHaponiukQuitCode/therapy-scheduling-spec#37 — текст повідомлення чекає PM; до відповіді другий бачить
   наявний «Signed …» без окремого повідомлення).
4. `signed_at = date_trunc('minute', clock_timestamp())`, `signed_by = auth.uid()` — серверний час з точністю до
   хвилини; показ — у America/Los_Angeles «Signed РРРР-ММ-ДД ГГ:ХХ» (`src/lib/time.ts`).

### D4. Підтвердження з документами (AC-DOC-07, AC-DOC-08; `slot-holds` після `align-consent-documents`)

У міграції задачі 1: `create or replace function private.confirm_hold_impl` — та сама функція
з `security definer set search_path = ''` (SET не успадковується — пишемо знову) і тими самими перевірками в тому
самому порядку, **після** `SLOT_STARTED_CONFIRM` (правила зрізу 1 — раніше за документи, «Припущення» PM):

- `if exists (select 1 from public.consent_documents where client_id = v_hold.client_id and signed_at is null) then
  raise exception 'CONSENT_NOT_SIGNED'`. Документів немає — умова хибна, підтвердження як у зрізі 1 (AC-HOLD-12, -23,
  -27 без змін).
- `revoke`/`grant` для обох функцій повторюємо явно.
- `src/lib/holds/messages.ts`: `CONSENT_NOT_SIGNED: "Sign all consent documents before confirming."`; утримання
  лишається «Held» з тим самим `expires_at` — транзакція відкочується (AC-DOC-07).

Гонка «підписують останній документ, поки підтверджують»: підтвердження бачить або старий стан (відмова, можна
повторити), або новий (успіх) — обидва результати коректні за AC; блокувати документи не потрібно.

## Auth

### D5. Server Actions (AC-DOC-02, -03, -05, -06, -09)

`src/app/clients/[id]/consent-actions.ts`: `prepareConsentDocuments(clientId)` і `signConsentDocument(documentId)`.
Порядок як у `setInsuranceStatus`: `getCurrentUser()`; не staff → відмова без запиту (терапевту —
«Only schedulers and admins can mark documents as signed.»); `isUuid`; `supabase.rpc(…)` клієнтом користувача;
коди помилок → тексти; `revalidatePath` картки й сторінки документа. Межа безпеки — функції бази (D2, D3).

Підтвердження — наявна `confirmHold` у `src/app/holds/actions.ts`; змінюється лише мапа повідомлень.

## Тести

| AC | Рівень | Де |
|---|---|---|
| AC-DOC-01 | база + сторінка | PGlite: у нової картки документів немає; `page.test.ts`: «No consent documents yet.», таблиці немає |
| AC-DOC-02 | база + дія + сторінка | PGlite: scheduler1 формує для дорослого → 2 рядки в порядку набору, `signed_at` null; повторний і паралельний виклик → ті самі 2 рядки; сторінка: «Missing signatures: Consent to treatment, Cancellation policy acknowledgement» |
| AC-DOC-03 | база | PGlite: для дитини → 3 рядки з `release_of_information` |
| AC-DOC-04 | unit + сторінка | рендер документа: «Release of information», «Client: Client Seven», «Guardian: Guardian Seven», «Prepared: 2026-11-04» |
| AC-DOC-05 | база + unit | PGlite: підпис → `signed_at` до хвилини; unit: «Signed 2026-11-04 10:15» у Los_Angeles, «Missing signatures: Cancellation policy acknowledgement» |
| AC-DOC-06 | база + unit | PGlite: scheduler2 підписує другий; unit: «All consent documents signed.» |
| AC-DOC-07 | база + дія | PGlite: `confirm_hold` з непідписаним → `CONSENT_NOT_SIGNED`, `confirmed_at` null, `expires_at` той самий; дія: текст PM |
| AC-DOC-08 | база | PGlite: усі підписані → `confirmed_at` є; плюс регресія: без документів — як у зрізі 1 |
| AC-DOC-09 | база + дія + сторінка | PGlite: therapist1 бачить документ свого client6, `sign_consent_document` → `SIGN_FORBIDDEN`, `signed_at` null; сторінка: кнопки немає, текст PM |
| AC-DOC-10 | база + сторінка | PGlite: therapist1 не бачить документів client9; сторінка: «You don't have access to this client.», без тексту документа |
| AC-DOC-11 | база + сторінка | PGlite: `asAnon` select/rpc → відмова; сторінка: `redirect("/login")` без запиту |

Мутанти (`scripts/mutants.mjs`, одна заміна — один мутант): зняти перевірку `CONSENT_NOT_SIGNED` у
`confirm_hold_impl` → AC-DOC-07 червоний; зняти `is_staff()` у `sign_consent_document_impl` → AC-DOC-09 червоний;
зняти `unique (client_id, kind)` разом із перевіркою «вже є» → тест паралельного формування AC-DOC-02 червоний; без
`redirect("/login")` на сторінці документа (`--kind ts`) → AC-DOC-11 червоний.

UAT (`tests/e2e/consent-documents.spec.ts`, `@uat`; формування й підпис — `@writes` на синтетичних картках
`uat-…@example.test`, прибирання — `deleteUatUsers` з каскадом на документи): кожен AC-DOC-01…11.

## Risks / Trade-offs

- `confirm_hold_impl` переписується `create or replace`: легко загубити `set search_path = ''` чи порядок перевірок —
  тест `tests/db/security-definer.test.ts` і регресійні тести AC-HOLD-12, -13, -22, -36 мають лишитися зеленими.
- Текст документа в коді, а не в базі: якщо PM колись дасть версії документів чи редагування (зараз — поза межами),
  знадобиться зберігати текст разом із рядком.
- Q7, Q8 без відповіді: поведінка «нічого не змінюється, без повідомлення» безпечна для даних; якщо PM вибере
  варіант з повідомленням — лише текст у дії й сторінці.
