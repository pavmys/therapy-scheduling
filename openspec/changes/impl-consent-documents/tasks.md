# Tasks

Кожна група — одна задача й один PR «Реалізація» (`task/<коротко>`), одна міграція на задачу (перед нею — спитати
людину, чи не змінює схему інша відкрита гілка). Тести на AC задачі пише окрема сесія агента; перевіряємо, що вони
ловлять ваду (мутант). Перед комітом — `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`,
`npm run ac:coverage`, `npm run spec:check`, `npm run check:design`, `node scripts/check-migration-order.mjs`. Рядки
`docs/conformance.md` і галочки цього файлу — у тому самому PR.

## 1. Формування документів у картці (`task/consent-prepare`)

- [ ] 1.1 Міграція `consent_documents` (D1, D2): таблиця, `unique (client_id, kind)`, RLS (revoke all, grant select, політики staff і свого терапевта), `private.prepare_consent_documents_impl` + `public.prepare_consent_documents`; типи БД з `db-check`
- [ ] 1.2 `src/lib/consent/documents.ts`: набір за типом клієнта, назви, slug, порядок, сталий синтетичний текст; `missingSignaturesLine` («Missing signatures: …» / «All consent documents signed.» / «No consent documents yet.»)
- [ ] 1.3 Server Action `prepareConsentDocuments` (D5); блок «Consent documents» у картці: порожній стан, кнопка для staff, таблиця зі станами, рядок `consent-summary`
- [ ] 1.4 Тести (окрема сесія): PGlite — формування для дорослого й дитини, повторне й паралельне без другого набору, терапевт і гість не формують; unit — рядок підсумку; сторінка — порожній стан і список
- [ ] 1.5 Рядки `docs/conformance.md` AC-DOC-01, -02, -03

Done when: AC-DOC-01, AC-DOC-02, AC-DOC-03

## 2. Документ і позначка «підписано» (`task/consent-sign`)

- [ ] 2.1 Міграція `consent_sign` (D3): `private.sign_consent_document_impl` + `public.sign_consent_document`, серверний час до хвилини, повторна позначка не змінює `signed_at`
- [ ] 2.2 Сторінка `/clients/[id]/consent/[kind]`: текст документа, стан, «Mark as signed» для staff; терапевт свого клієнта — текст PM замість кнопки; чужий — «You don't have access to this client.»; гість — `/login`
- [ ] 2.3 Server Action `signConsentDocument` (D5); кнопка «Mark as signed» у таблиці картки; формат «Signed РРРР-ММ-ДД ГГ:ХХ» (America/Los_Angeles)
- [ ] 2.4 Тести (окрема сесія): PGlite — підпис staff, терапевт не підписує, повторна позначка не змінює час, анонім; unit — формат стану й підсумку; сторінки — терапевт свого й чужого клієнта, гість
- [ ] 2.5 Рядки `docs/conformance.md` AC-DOC-04, -05, -06, -09, -10, -11

Done when: AC-DOC-04, AC-DOC-05, AC-DOC-06, AC-DOC-09, AC-DOC-10, AC-DOC-11

## 3. Підтвердження утримання з документами (`task/consent-confirm`)

- [ ] 3.1 Міграція `confirm_hold_consent` (D4): `create or replace private.confirm_hold_impl` з `security definer set search_path = ''`, ті самі перевірки зрізу 1 у тому самому порядку, потім `CONSENT_NOT_SIGNED`; права обох функцій явно
- [ ] 3.2 `src/lib/holds/messages.ts`: «Sign all consent documents before confirming.»; `confirmHold` без інших змін
- [ ] 3.3 Тести (окрема сесія): PGlite — непідписаний документ → відмова, «Held» і той самий `expires_at`; усі підписані → «Confirmed»; без документів — як у зрізі 1; прострочене з непідписаним → `HOLD_EXPIRED` (порядок перевірок); регресія AC-HOLD-12, -13, -22, -36 і `security-definer.test.ts`; дія — текст PM
- [ ] 3.4 Рядки `docs/conformance.md` AC-DOC-07, -08

Done when: AC-DOC-07, AC-DOC-08

## 4. Мутанти, UAT, прод (`task/consent-uat`)

- [ ] 4.1 Мутанти (`scripts/mutants.mjs`): без `CONSENT_NOT_SIGNED`, без `is_staff()` у підписі, без унікальності набору, без `redirect("/login")` на сторінці документа — кожен `KILLED`
- [ ] 4.2 UAT `tests/e2e/consent-documents.spec.ts` — AC-DOC-01…11 з тегом `@uat` (формування й підпис — `@writes` на синтетичних картках); прогін — людина, `npm run uat -- --url https://therapy-scheduling-three.vercel.app`; звіт у `docs/qa/uat/<дата>/`
- [ ] 4.3 `/api/health` з SHA `main`; `docs/conformance.md` — шляхи коду, тестів і UAT для кожного AC-DOC; `npx openspec archive impl-consent-documents -y`

Done when: AC-DOC-01, AC-DOC-02, AC-DOC-03, AC-DOC-04, AC-DOC-05, AC-DOC-06, AC-DOC-07, AC-DOC-08, AC-DOC-09, AC-DOC-10, AC-DOC-11
