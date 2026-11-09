# Tasks

Кожна група — одна задача й один PR «Реалізація» (`task/<коротко>`): тести на AC задачі пише **нова сесія агента до
коду** (промпт F02, тест спершу червоний), потім міграція, дія, сторінка, доказ, що тест відмови падає, рядки
`docs/conformance.md` і галочки цього файлу в тому самому PR. Перед комітом — `npm run lint`, `npm run typecheck`,
`npm test`, `npm run build`, `npm run ac:coverage`, `npm run spec:check`, `npm run check:design`,
`npm run check:boundary`, `node scripts/check-migration-order.mjs`. Після merge — зелений `db-deploy`.

## 1. Планувальник і адміністратор позначають статус (`task/insurance-status`)

- [x] 1.1 Тести спершу (нова сесія, F02): `tests/db/insurance-status.test.ts` — AC-INS-01 (нова картка й картка зрізу 2 → `not_set`), AC-INS-02 (scheduler1 → `verified`, видно в новому select), AC-INS-03 (admin1 → `private_pay`, scheduler2 бачить); `src/lib/clients/insurance.test.ts` — підписи й `parseInsuranceStatus`; `src/app/clients/[id]/actions.test.ts` — AC-INS-02 «Insurance status saved.»; прогін червоний
- [x] 1.2 Міграція `insurance_status` (D1, D2): колонка з default і check, `grant update (insurance_status)`, політика `clients_update_insurance_staff` з `with check … <> 'not_set'`; `npm run db:types` або типи з `db-check`
- [x] 1.3 `src/lib/clients/insurance.ts` (`insuranceLabel`, `parseInsuranceStatus`) і Server Action `setInsuranceStatus` (D3)
- [x] 1.4 Картка `/clients/[id]`: рядок «Insurance: <статус>» і `insurance-form.tsx` для staff (UI і компоненти); тести зелені
- [x] 1.5 Рядки `docs/conformance.md` AC-INS-01, -02, -03 → «реалізовано»; ручна перевірка на Preview під scheduler і admin — на проді покрито UAT 2026-11-09 (`docs/qa/uat/2026-11-09/`: AC-INS-02 під scheduler1, AC-INS-03 під admin1 і scheduler2)

Done when: AC-INS-01, AC-INS-02, AC-INS-03

## 2. Терапевт і гість не змінюють статус (`task/insurance-status-access`)

- [x] 2.1 Тести спершу (нова сесія, F02): `tests/db/insurance-status.test.ts` — AC-INS-04 (therapist1 бачить статус client6), AC-INS-05 (therapist1 `update` → 0 рядків, scheduler1 бачить `not_accepted`), AC-INS-06 (`asAnon` select і update → відмова, статус `verified`); `src/app/clients/[id]/page.test.ts` — AC-INS-04 (терапевту форми немає), AC-INS-06 (гість → `redirect("/login")`); дія — терапевт отримує відмову без запиту `update`
- [x] 2.2 Виправлення, якщо тест червоний (сторінка не рендерить форму для терапевта; дія перевіряє роль до запиту) — не знадобилось: усі тести зелені, падіння доведено мутантами I1–I4
- [x] 2.3 Доказ, що тести відмов падають (мутанти в `scripts/mutants.mjs`, D4): `clients_update_insurance_staff` без обох перевірок ролі (`using (true) with check (insurance_status <> 'not_set')`) → AC-INS-05 `KILLED` (`npm run mutation:sql`); сторінка картки без `redirect("/login")` → AC-INS-06 (`page.test.ts`) червоний (`--kind ts`); дія без перевірки ролі → тест дії червоний; таблиця «AC → мутант → тест» в описі PR
- [x] 2.4 Рядки `docs/conformance.md` AC-INS-04, -05, -06 → «реалізовано»

Done when: AC-INS-04, AC-INS-05, AC-INS-06

## 3. UAT на кожен AC (`task/uat-insurance-status`)

- [x] 3.1 `tests/e2e/insurance-status.spec.ts` (F03): по одному `test` на AC-INS-01…06 з анотацією `ac`, тегом `@uat`, `given` / `when` / `thenStep` і дослівним «Тоді»; AC-INS-02, -03 — `@writes`, картка з `uatEmail()` і прибирання (`OWNED_ROWS`, `deleteUatUsers`); AC-INS-05 — крок «що не змінилося» на екрані
- [x] 3.2 Прогін на проді — людина: `npm run uat -- --url https://therapy-scheduling-three.vercel.app`; пояснення звіту (F04); `npm run uat:nc` → FAIL
- [x] 3.3 `docs/qa/uat/<дата>/` (`report.md`, `manifest.json`, `frames/`); у `docs/conformance.md` — шлях специфікації для кожного AC-INS; `npx openspec archive impl-insurance-status -y`

Done when: AC-INS-01, AC-INS-02, AC-INS-03, AC-INS-04, AC-INS-05, AC-INS-06
