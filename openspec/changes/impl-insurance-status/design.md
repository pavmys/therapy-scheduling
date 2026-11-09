# Design

## Context

Зріз 3 додає до картки клієнта (зріз 2, `openspec/specs/client-cards`) один атрибут — статус перевірки страхування — і
одну дію: планувальник або адміністратор позначає його. Терапевт бачить статус лише в картках своїх клієнтів, гість —
лише сторінку входу. Наявне, на що спираємось:

- `public.clients` з RLS: `clients_select_staff` (усі картки для `private.is_staff()`), `clients_select_own_therapist`
  (`private.is_own_client`, ADR 0005); `grant select` і колонковий `grant insert`, **жодного** `update` для
  `authenticated` (зріз 2: картку не редагують).
- `src/app/clients/[id]/page.tsx` — картка під RLS; `getCurrentUser()` (`getClaims()` + роль з `profiles`),
  `isStaffRole`, `accessFor` у `src/lib/auth.ts` і `src/lib/access.ts`.
- Тести бази на PGlite (`tests/db/supabase-pglite.ts`, ADR 0004): `asUser` / `asAnon` / `asService`.

Нових ролей, таблиць і залежностей немає; admin-клієнт не потрібен.

## Goals / Non-Goals

**Goals:** AC-INS-01…06; правило «хто може змінити статус» — у базі (RLS + column grant), а не лише в інтерфейсі.

**Non-Goals:** історія змін статусу, страхова компанія й поліс, вплив на утримання чи підтвердження, пошук і фільтр за
статусом (Non-goals зміни `add-insurance-status`); документи згоди (HryhoriiHaponiukQuitCode/therapy-scheduling-spec#34
— пізніший зріз).

## UI і компоненти

- **Рядок статусу (AC-INS-01…04):** у картці `/clients/[id]` під заголовком — `<p data-testid="insurance-status">`
  з текстом «Insurance: <статус>» (дослівно з AC: «Not set», «Verified», «Not accepted», «Private pay»). Текст, не
  колір: `StatusBadge` не використовуємо — це не статус слоту чи утримання з таблиці DESIGN.md, і нового токена не
  вигадуємо. Підписи — `src/lib/clients/insurance.ts` (`insuranceLabel`).
- **Форма для staff (AC-INS-02, AC-INS-03):** у тій самій картці — `NativeSelect` з `Label` «Insurance status» (три
  варіанти: «Verified», «Not accepted», «Private pay»; «Not set» вибрати не можна — «Припущення» PM) і `Button`
  `default` «Save insurance status»; під час відправлення кнопка `disabled`. Успіх — `Alert` `bg-success
  text-success-foreground` (`role="status"`) з «Insurance status saved.»; помилка — `Alert` `destructive`
  (`role="alert"`) із загальним текстом зі `src/lib/clients/messages.ts` (тексту помилки PM не дав — spec-review
  `add-insurance-status`, знахідка 1). Клієнтський компонент `src/app/clients/[id]/insurance-form.tsx` з
  `useActionState`.
- **Терапевт (AC-INS-04):** та сама картка, рядок статусу є, форми немає — компонент не рендеримо взагалі (принцип
  «приватність за замовчуванням» DESIGN.md: не показуємо й не вимикаємо).
- **Гість (AC-INS-06):** без змін — `accessFor` → `redirect("/login")` до будь-якого запиту.
- Статус не показуємо в розкладі терапевта й у списку клієнтів («Припущення» PM).

## Дані й RLS

### D1. Колонка `insurance_status` (AC-INS-01)

Міграція `insurance_status` (`npx supabase migration new insurance_status`):

- `alter table public.clients add column insurance_status text not null default 'not_set'` + `constraint
  clients_insurance_status_check check (insurance_status in ('not_set', 'verified', 'not_accepted', 'private_pay'))`.
  Наявні картки зрізів 1–2 отримують `not_set` через default — «Припущення» PM, AC-INS-01.
- Колонковий `grant insert` не розширюємо: нова картка завжди стартує з default.

Чому не окрема таблиця «перевірки страхування»: історії змін PM не просить (Non-goals), одне значення на картку —
колонка простіша й не потребує нових політик select.

### D2. Зміна статусу — лише staff, лише ця колонка (AC-INS-02, AC-INS-03, AC-INS-05, AC-INS-06)

- `grant update (insurance_status) on public.clients to authenticated` — і нічого більше: решту колонок картки
  користувач, як і раніше, не змінює; `anon` grant не отримує.
- `create policy clients_update_insurance_staff on public.clients for update to authenticated using
  ((select private.is_staff())) with check ((select private.is_staff()) and insurance_status <> 'not_set')`.
  Терапевт (зокрема для свого клієнта, який проходить `clients_select_own_therapist`) під `using` не підпадає → 0
  оновлених рядків, статус той самий (AC-INS-05). `with check` не дає повернути «Not set» («Припущення» PM).
- Одна команда `update … where id = …` — транзакція не потрібна, RPC не робимо.

## Auth

### D3. Server Action `setInsuranceStatus` (AC-INS-02, AC-INS-03, AC-INS-05)

`src/app/clients/[id]/actions.ts`, порядок як у D4 `impl-client-cards`:

1. `getCurrentUser()` (`getClaims()`, роль з `profiles`); не staff → `FORBIDDEN_MESSAGE`, запиту в базу немає.
2. `isUuid(clientId)` і `parseInsuranceStatus(value)` — лише `verified`, `not_accepted`, `private_pay`; інше →
   загальна помилка, запиту немає.
3. `update({ insurance_status }).eq("id", clientId).select("id")` клієнтом користувача (діють RLS і grant); 0 рядків
   або помилка → загальна помилка.
4. `revalidatePath("/clients/[id]", "page")` → `{ ok: true, message: "Insurance status saved." }`; картка після
   повторного відкриття читає збережене значення (AC-INS-02).

Межа безпеки — база (D2); перевірка ролі в дії — щоб терапевт отримав зрозумілу відмову, а не тихі 0 рядків.

### D4. Тести (усі AC)

| AC | Рівень | Де |
|---|---|---|
| AC-INS-01 | база + unit | PGlite: нова картка й картка зрізу 2 → `not_set`; `insuranceLabel("not_set")` = «Not set» |
| AC-INS-02 | база + unit (дія) | PGlite: scheduler1 оновлює → `verified` і після нового select; дія: повідомлення «Insurance status saved.» |
| AC-INS-03 | база | PGlite: admin1 → `private_pay`, scheduler2 читає `private_pay` |
| AC-INS-04 | база + unit (сторінка) | PGlite: therapist1 бачить `insurance_status` свого client6; `page.test.ts`: для терапевта форми немає |
| AC-INS-05 | база | PGlite: therapist1 `update` client6 → 0 рядків, scheduler1 бачить `not_accepted` |
| AC-INS-06 | база | PGlite: `asAnon` select → відмова, `update` → відмова; scheduler1 бачить `verified` |

Екран — UAT-специфікація `tests/e2e/insurance-status.spec.ts` на кожен AC (задача 3). Доказ, що тест відмови падає:
SQL-мутант (`npm run mutation:sql`) для `clients_update_insurance_staff` (`using (true)`) → AC-INS-05 `KILLED`;
мутант дії (без перевірки ролі) → тест дії червоний.

## Risks / Trade-offs

- Колонковий `grant update` + RLS update вимагає й `select` на рядок — він уже є для staff; для терапевта — лише свої
  картки, але update політики терапевту однаково немає.
- UAT AC-INS-02, -03 змінюють дані на проді: картку створює сам тест (`uat-<запуск>@example.test`) і прибирає її
  (`@writes`, `deleteUatUsers`, `OWNED_ROWS`).
