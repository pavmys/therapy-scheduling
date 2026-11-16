# Tasks

Кожна група — одна задача й один PR «Реалізація» (`task/<коротко>`). Тести на AC задачі пише окрема сесія агента
(промпт K06), перевіряємо, що вони ловлять ваду. Перед комітом — `npm run lint`, `npm run typecheck`, `npm test`,
`npm run build`, `npm run ac:coverage`, `npm run spec:check`, `npm run check:design`. Рядки `docs/conformance.md` і
галочки цього файлу — у тому самому PR. Джерело запозичених файлів — в описі PR («взято з
`koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature/…`»).

## 1. Ядро помічника: модель, схема, правила, промпт, golden офлайн (`task/ai-intake-core`)

- [x] 1.1 ADR `docs/decisions/0006-ai-feature-openrouter.md` (з шаблону набору, контекст — чернетка картки клієнта); залежності з точними версіями `ai@7.0.162 @openrouter/ai-sdk-provider@3.1.0 zod@4.6.7 server-only@0.0.1`; скрипти `eval`, `ai:models`, `ai:quota`; `OPENROUTER_API_KEY=` у `.env.example`
- [x] 1.2 Файли набору: `src/lib/ai/{models,openrouter,draft,scorer}.ts`, `prompts/judge.ts`, `evals/golden.live.eval.ts`, `vitest.eval.config.mts`, `scripts/{free-models,quota}.mjs`, `tests/ai-key.test.ts`; `npm run ai:models` — ланцюжок існує
- [x] 1.3 Домен (D2–D4): `IntakeDraftSchema`, промпт `intake-v1` з `sanitizeRequest` і «сьогодні», `normalizeDraft` і повідомлення станів у `src/lib/ai/intake.ts`; помилки → `unavailable` (D6)
- [x] 1.4 `tests/fixtures/golden/cases.json` — GC-01…10 дослівно з таблиці PM; `recorded.json` — заглушки під нашу схему (позначені як заглушки до задачі 3)
- [x] 1.5 Тести (окрема сесія, K06): `tests/golden.test.ts` — `it.each` за групами AC (AC-INTAKE-01, -02, -04, -05, -06, -07); `src/lib/ai/intake.test.ts` — правила D3 (дата в майбутньому, вік < 18, email, порядок «Missing»); збої AC-INTAKE-08 (немає ключа, 429, 429 у 200, таймаут, не за схемою); ін'єкція AC-INTAKE-07 (межа `<document>`, вирізані теги); `npm test` зелений без ключа

Done when: AC-INTAKE-04, AC-INTAKE-05, AC-INTAKE-06, AC-INTAKE-07, AC-INTAKE-08 доведено офлайн (логіка й збої); `tests/ai-key.test.ts` зелений

## 2. Чернетка у формі нової картки (`task/intake-draft-form`)

- [ ] 2.1 Server Action `requestIntakeDraft` (`src/app/clients/new/draft-actions.ts`): `getCurrentUser()` і роль до моделі (Auth), межа 2000 символів, нічого не пише (D7), повертає значення полів і стан
- [ ] 2.2 `Textarea` (`npx shadcn@latest add textarea`), блок чернетки в `ClientForm`: підказка PM, `Button` `secondary` «Draft from request», `Alert` станів з дослівними текстами; без чернетки форма не змінюється
- [ ] 2.3 Тести (окрема сесія, K06): дія — AC-INTAKE-01, -02 (форма заповнена, «Draft ready…»), AC-INTAKE-03 (запису немає, `createClientCard` не викликано), AC-INTAKE-06 (поля повернуто без змін), AC-INTAKE-08 (без ключа — стан, а не помилка сторінки), AC-INTAKE-09 (терапевт → відмова без виклику моделі); сторінка — терапевт не бачить блоку чернетки
- [ ] 2.4 Ручна перевірка: `OPENROUTER_API_KEY=" " npm run dev` → «The assistant is unavailable right now. Fill in the form manually.», картка створюється вручну; з ключем — один кейс, що проходить, і одна відмова
- [ ] 2.5 Рядки `docs/conformance.md` AC-INTAKE-01…09 → «реалізовано» для доведених тестами

Done when: AC-INTAKE-01, AC-INTAKE-02, AC-INTAKE-03, AC-INTAKE-09 на екрані форми; усі AC-INTAKE мають тест

## 3. Живий eval, записи, UAT і прод (`task/intake-eval-uat`)

- [ ] 3.1 `OPENROUTER_API_KEY` у Vercel (Production + Preview) — людина; `/api/health` з SHA `main`
- [ ] 3.2 Живий прогін — людина: `npm run ai:quota`, потім `RECORD=1 npm run eval`; звіт `evals/reports/<дата>.md` і `recorded.json` без заглушок; розбір кожного FAIL (K07); поріг PM ≥ 8/10 з GC-09 і GC-10
- [ ] 3.3 UAT (K08): `tests/e2e/client-intake-draft.spec.ts` — AC-INTAKE-03 і AC-INTAKE-06 з тегом `@uat`; прогін — людина, `npm run uat -- --url https://therapy-scheduling-three.vercel.app`; звіт у `docs/qa/uat/<дата>/`
- [ ] 3.4 `docs/conformance.md` — шляхи коду, тестів, звіту eval і UAT для кожного AC-INTAKE; самоперевірка K09; `npx openspec archive impl-client-intake-draft -y`

Done when: AC-INTAKE-01, AC-INTAKE-02, AC-INTAKE-03, AC-INTAKE-04, AC-INTAKE-05, AC-INTAKE-06, AC-INTAKE-07, AC-INTAKE-08, AC-INTAKE-09
