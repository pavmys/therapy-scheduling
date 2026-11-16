# Tasks

Кожна група — одна задача й один PR «Реалізація» (`task/<коротко>`). Кожне злиття в `main` розгортається на прод
(`db-deploy`, Vercel), тому порядок задач такий, щоб **кожен проміжний стан проду відповідав специфікації**: перевірка
підписів у `confirm_hold` (AC-DOC-07) розгортається раніше, ніж у картці можна сформувати перший документ, а
посилання на сторінку документа — разом зі сторінкою. Уже підтверджені утримання не перевіряються (специфікація
цього не вимагає).

Міграція в зрізі одна — у задачі 1 (перед нею — спитати людину, чи не змінює схему інша відкрита гілка). Тести на AC
задачі пише окрема сесія агента; перевіряємо, що вони ловлять ваду (мутант). Перед комітом — `npm run lint`,
`npm run typecheck`, `npm test`, `npm run build`, `npm run ac:coverage`, `npm run spec:check`, `npm run check:design`,
`node scripts/check-migration-order.mjs`. Рядки `docs/conformance.md` і галочки цього файлу — у тому самому PR.

## 1. Дані, функції й підтвердження з документами — без UI (`task/consent-data`)

- [x] 1.1 Міграція `consent_documents` (D1–D4): таблиця з `unique (client_id, kind)`, RLS (revoke all, grant select, політики staff і свого терапевта); `private.prepare_consent_documents_impl` + `public.prepare_consent_documents`; `private.sign_consent_document_impl` + `public.sign_consent_document`; `create or replace private.confirm_hold_impl` з `security definer set search_path = ''`, ті самі перевірки зрізу 1 у тому самому порядку, потім `CONSENT_NOT_SIGNED`; права всіх функцій явно; типи БД з `db-check`
- [x] 1.2 `src/lib/holds/messages.ts`: «Sign all consent documents before confirming.»; `confirmHold` без інших змін
- [x] 1.3 Тести (окрема сесія): PGlite — формування для дорослого й дитини, повторне й паралельне без другого набору; підпис staff, терапевт не підписує, повторна позначка не змінює час; анонім — відмова; підтвердження: непідписаний документ → відмова, «Held» і той самий `expires_at`; усі підписані → «Confirmed»; без документів — як у зрізі 1; прострочене з непідписаним → `HOLD_EXPIRED` (порядок перевірок); регресія AC-HOLD-12, -13, -22, -36 і `security-definer.test.ts`; дія підтвердження — текст PM
- [x] 1.4 Рядки `docs/conformance.md` AC-DOC-07, -08

Done when: AC-DOC-07, AC-DOC-08

## 2. Документи в картці: формування й позначка «підписано» (`task/consent-card`)

- [x] 2.1 `src/lib/consent/documents.ts`: набір за типом клієнта, назви, slug, порядок, сталий синтетичний текст; рядок підсумку («Missing signatures: …» / «All consent documents signed.» / «No consent documents yet.»); формат «Signed РРРР-ММ-ДД ГГ:ХХ» (America/Los_Angeles)
- [x] 2.2 Server Actions `prepareConsentDocuments` і `signConsentDocument` (D5)
- [x] 2.3 Блок «Consent documents» у картці: порожній стан, кнопка формування для staff, таблиця зі станами (назви документів — простий текст без посилань: сторінки документа ще немає), «Mark as signed» для staff, рядок `consent-summary`
- [x] 2.4 Тести (окрема сесія): unit — рядок підсумку й формат стану; дії — staff формує й підписує, терапевт отримує відмову без запиту; сторінка картки — порожній стан, список, підсумок, для терапевта кнопок немає
- [x] 2.5 Рядки `docs/conformance.md` AC-DOC-01, -02, -03, -05, -06

Done when: AC-DOC-01, AC-DOC-02, AC-DOC-03, AC-DOC-05, AC-DOC-06

## 3. Сторінка документа (`task/consent-page`)

- [x] 3.1 Сторінка `/clients/[id]/consent/[kind]`: текст документа, стан, «Mark as signed» для staff; терапевт свого клієнта — текст PM замість кнопки; чужий — «You don't have access to this client.»; гість — `/login`; документа немає — `notFound()` для staff
- [x] 3.2 Назви документів у таблиці картки — посилання на сторінку документа (разом зі сторінкою, щоб не було посилань на 404)
- [x] 3.3 Тести (окрема сесія): unit — рендер документа дитини; сторінка — staff, терапевт свого й чужого клієнта, гість; PGlite — therapist1 не бачить документів client9
- [x] 3.4 Рядки `docs/conformance.md` AC-DOC-04, -09, -10, -11

Done when: AC-DOC-04, AC-DOC-09, AC-DOC-10, AC-DOC-11

## 4. Мутанти, UAT, прод (`task/consent-uat`)

- [ ] 4.1 Мутанти (`scripts/mutants.mjs`): без `CONSENT_NOT_SIGNED`, без `is_staff()` у підписі, без унікальності набору, без `redirect("/login")` на сторінці документа — кожен `KILLED`
- [ ] 4.2 UAT `tests/e2e/consent-documents.spec.ts` — AC-DOC-01…11 з тегом `@uat` (формування й підпис — `@writes` на синтетичних картках); прогін — людина, `npm run uat -- --url https://therapy-scheduling-three.vercel.app`; звіт у `docs/qa/uat/<дата>/`
- [ ] 4.3 `/api/health` з SHA `main`; `docs/conformance.md` — шляхи коду, тестів і UAT для кожного AC-DOC; `npx openspec archive impl-consent-documents -y`

Done when: AC-DOC-01, AC-DOC-02, AC-DOC-03, AC-DOC-04, AC-DOC-05, AC-DOC-06, AC-DOC-07, AC-DOC-08, AC-DOC-09, AC-DOC-10, AC-DOC-11
