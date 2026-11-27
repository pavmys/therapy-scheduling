# Runbook: розклад і картки клієнтів практики психотерапії

**Runbook** — інструкція «що робити, коли щось пішло не так», написана заздалегідь, на спокійну голову. Як план
евакуації на стіні: о 2-й ночі його не вигадують, а виконують. Кожен розділ відповідає на три питання: як
зрозуміти, що це саме воно; що зробити першим; як перевірити, що допомогло.

Останнє оновлення: 2026-11-27, версія продукту: реліз-кандидат `v1.0.0` (тег — після приймання PM).

Взято з шаблону `materials/ops-kit/docs/runbook.template.md`
(https://github.com/koldovsky/2026-quitcode-11-devops-operations-hw), факти про Vercel Hobby і Supabase Free —
станом на 09.11.2026 (гайди WS11), окрема база staging — ADR 0008.

## Хто отримує алерт і кого кликати

| Роль | Хто (GitHub-логін, не телефон) | Коли кликати |
|---|---|---|
| Черговий розробник (отримує алерт) | @pavmys | будь-який червоний smoke чи повідомлення «ПОМИЛКА СЕРВЕРА» |
| PM (говорить із клієнтом) | @HryhoriiHaponiukQuitCode | SEV1–SEV2: одразу (PM пише клієнту протягом 2 год за `operations.md`); SEV3 — у робочий час |
| Резерв | немає (розробник один) | — |

- **Канал алерту:** Telegram-група «Therapy Scheduling Alerts», у ній розробник і PM. Бот пише туди з
  `.github/workflows/smoke.yml` (секрети GitHub `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) і з `src/instrumentation.ts`
  (ті самі назви — змінні Vercel, Production і Preview).
- **Серйозність** — за матрицею SEV1–3 PM:
  https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling-spec/blob/main/docs/operations.md (розділ 2).
  Коротко: SEV1 — прод недоступний чи дані бачить той, кому не можна; SEV2 — частина сценарію не працює, є обхід
  (напр. помічник «unavailable»); SEV3 — незручно, або зламано лише staging. RPO — 1 доба, RTO — 4 год у робочий час
  (там само, розділ 3).

## Де що

| Що | Адреса / де шукати |
|---|---|
| Прод | https://therapy-scheduling-three.vercel.app (гілка `main`) |
| Staging | https://therapy-scheduling-git-staging-pavlom2901-9007s-projects.vercel.app (гілка `staging`, змінна лише для гілки `APP_ENV=staging`; база — проєкт staging) |
| Здоров'я | `<адреса>/api/health` → `{"ok":true,"sha":"…","env":"…","appEnv":"…","supabaseRef":"…","db":"ok","reason":""}` |
| Прогони smoke | Actions → `smoke` (job `prod` — прод, job `deploy` — preview і staging) |
| Vercel | проєкт `therapy-scheduling` → Deployments, Logs; регіон функцій `dub1` |
| Supabase — прод | проєкт `therapy-scheduling`, ref `uthmwvubjxghsoimeeje` → Logs, Advisors; Vercel Production |
| Supabase — staging | проєкт `therapy-scheduling-staging`, ref `hybpxpocqbxrkedomsbe` → Logs, Advisors; Vercel Preview (усі гілки); міграції — CI, job `db-deploy-staging` перед `db-deploy` |
| Статус-сторінки провайдерів | vercel-status.com (регіон `dub1`, Functions) · status.supabase.com · githubstatus.com · status.openrouter.ai |
| Доступ PM до staging | **спільне посилання Vercel (Shareable Link)** на адресу гілки `staging` — одне на акаунт Hobby. Посилання з токеном — лише в особистому чаті з PM, ніколи в репо, issues чи PR. Перестало працювати — Vercel → деплой `staging` → Share → нове посилання → PM |

## 1. Червоний smoke

**Як зрозуміти:** у Telegram прийшло «ЧЕРВОНИЙ SMOKE» з середовищем, адресою, комітом і посиланням на прогін.

1. Відкрийте посилання на прогін → крок smoke → рядки `::error::` і JSON `health`. Вони підказують причину:

   | Рядок `::error::` / поле health | Що це найімовірніше | Куди далі |
   |---|---|---|
   | `стіна входу Vercel` / `секрет обходу` | захист Vercel або секрет `VERCEL_AUTOMATION_BYPASS_SECRET` | розділ 4 (ротація) |
   | `Supabase призупинено`, `"reason":"paused"` | база на паузі | розділ 3 |
   | `ключ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `"reason":"invalid-api-key"` | хибний ключ у змінних Vercel | розділ 4 |
   | `"db":"down"`, `"reason":"status-0"` + незнайомий `supabaseRef` | хибна адреса бази (`NEXT_PUBLIC_SUPABASE_URL`) у Vercel | звірте `supabaseRef` з таблицею «Де що»; виправте змінну → Redeploy (так було на дрілі 2026-11-27) |
   | `показує <sha>, а очікувався <sha>` | деплой не пройшов або був відкат | розділ 2 |
   | `HTTP 5xx` на `/` чи `/login` | зламаний код чи змінна середовища | крок 3 нижче |
   | `недоступний` | Vercel чи мережа | крок 2 (статус Vercel), повтор через 5 хв |

2. **Це ми чи провайдер? (1–2 хв)** Статус-сторінки з таблиці «Де що» — для **нашого** регіону й компонента. Є
   відкритий інцидент і час збігається — посилання в issue інциденту і PM, стежимо. Немає — шукаємо в себе. Зелена
   сторінка не означає, що з нашим проєктом усе гаразд (пауза бази, ліміти, наш код).
3. **Прод чи ні?** Job `deploy` (preview, staging) — користувачі практики не постраждали: SEV3, виправляємо в
   робочому порядку. Job `prod` — визначте SEV за матрицею PM і напишіть у групу «беру, SEV<N>».
4. **Спершу зупинити шкоду, потім шукати причину.** Якщо прод зламав останній деплой — відкат (розділ 2), потім
   розбір. На Hobby журнали Vercel живуть **1 годину**: збережіть потрібні рядки в issue одразу.
5. **Розбір** — з агентом у профілі «лише пропонує» (розділ 7) або вручну. Агент пропонує, виправляє людина.
6. **Перевірка:** повторний прогін smoke (Actions → smoke → Re-run) — зелений; у групу: «SEV<N> закрито, причина: …».
7. Після SEV1–SEV2 (і після дрілу) — postmortem `docs/incidents/<YYYY-MM-DD>-<slug>.md`; PM повідомляє клієнта за
   `docs/incident-message.md` у репо вимог.

**Червоний smoke о 2-й ночі.** Щоденний прогін `prod` — о 05:23 UTC (≈ 07:23 Київ), GitHub може запустити пізніше.
Уночі алерт може принести лише деплой чи ручний запуск. Порядок той самий: прод (job `prod`) → кроки 1–4 одразу
(SEV1–2: PM — до 2 год); staging/preview (job `deploy`) → SEV3, лише збережіть рядки журналу в issue (Vercel — 1 год)
і продовжуйте зранку.

Приклад: 2026-11-27 12:08 UTC — червоний smoke на staging, `/api/health` 503, `status-0`, `supabaseRef` з хибним
символом; причина — хибне перевизначення `NEXT_PUBLIC_SUPABASE_URL` для гілки `staging` (дріл,
[postmortem](incidents/2026-11-27-staging-bad-supabase-url.md)).

## 2. Відкат проду і повернення автоматичного просування (Promote)

**Коли:** прод зламав щойно розгорнутий коміт, а виправлення вперед займе довше за 30 хв.

1. Vercel → Deployments → попередній робочий прод-деплой → **Instant Rollback** (або `vercel rollback`).
   На Hobby відкат можливий **лише на один попередній** прод-деплой.
2. Перевірте прод: `/api/health` — `db: ok`, сторінка входу відкривається.
3. **Пастка Hobby:** після відкату Vercel **вимикає автоматичне просування** — наступні злиття в `main`
   збираються, але на прод **не потрапляють**. Smoke `prod` червонітиме з «показує <старий sha>, а очікувався <новий>».
4. Виправлення — звичайним PR у `main` (CodeRabbit, CI). Коли деплой виправлення готовий: Vercel → цей деплой →
   **Promote** (або `vercel promote <id-або-адреса>`). Це повертає автоматичне просування. Перевірка — `/api/health`
   проду показує SHA `main`, smoke `prod` зелений.
5. Відкат **не змінює** базу, міграції й змінні середовища. Код, на який відкочуємось, має працювати з поточною
   схемою — тому міграції в нас лише додають (expand), а не видаляють.
6. Staging: Instant Rollback працює лише для проду. «Відкат» staging — прибрати зламану зміну (змінну чи коміт у
   `main`) і Redeploy / нове оновлення `staging`.

Хто робить: черговий розробник. Агент відкат і Promote не робить ніколи (`request_rollback`, `request_promote` — у
`deny`).

## 3. База на паузі

**Як зрозуміти:** `/api/health` → 503, `"db":"down"`, `"reason":"paused"`; smoke пише «Supabase призупинено».
Supabase Free ставить проєкт на паузу після 7 днів без достатньої активності бази. Прод і staging засинають
**незалежно**: червоний прод-smoke — прод-проєкт (`uthmwvubjxghsoimeeje`); червоний smoke staging чи preview —
проєкт staging (`hybpxpocqbxrkedomsbe`). Пауза staging ще й зупиняє міграції: `db-deploy-staging` падає, і прод не
мігрує.

1. Supabase Dashboard → **той проєкт, що на паузі** (звірте ref із `supabaseRef` у health) → **Resume project**.
   Скільки триває відновлення, документація не каже — кілька хвилин.
2. Повторіть smoke (Actions → smoke → Run workflow; для staging — поле `url` з адресою staging) — зелений.
3. Запишіть у групу, коли була пауза і скільки тривала. Прод на паузі — SEV1 за матрицею PM.

Як не допустити до demo day: щоденний smoke `prod` будить прод-базу; staging він **не будить** — **перед UAT,
демо чи дрілом — Dashboard → проєкт staging активний, інакше Resume project.** Перевірка обох баз — напередодні
показу й за годину (`docs/demo-day.md` PM).

## 4. Ротація ключа + redeploy

**Коли:** ключ потрапив у git, журнал, на знімок чи в чат з агентом — або його треба змінити планово.
Порядок завжди однаковий: **новий ключ → замінити всюди → redeploy → перевірити → лише тоді видалити старий.**

| Що | Де новий | Де замінити | Що ще |
|---|---|---|---|
| Ключ Supabase **прод-проєкту** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; секретний — лише в `.env.local` для скриптів) | прод-проєкт → Settings → API Keys | Vercel → Environment Variables → **лише Production** | **Redeploy** проду: `NEXT_PUBLIC_*` вбудовуються під час збірки |
| Ключ Supabase **проєкту staging** | проєкт staging → Settings → API Keys | Vercel → **Preview (усі гілки)**; ваш `.env.staging.local` | Redeploy `staging` і новий push у відкриті PR |
| Рядок підключення бази (`SUPABASE_DB_URL`, після зміни пароля бази) | Connect у тому самому проєкті (Session pooler, порт 5432) | GitHub → Environments → `production` чи `staging` | наступний прогін CI: запобіжник друкує правильний ref |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel → Settings → Deployment Protection → Protection Bypass for Automation | GitHub → Settings → Secrets → Actions | redeploy staging; smoke `deploy` має показати `"bypass":true` |
| `TELEGRAM_BOT_TOKEN` | Telegram, BotFather (перевипуск токена) | GitHub Secrets і змінні Vercel (Production, Preview) | ручний червоний прогін smoke (`url=https://example.invalid`) → повідомлення прийшло |
| `OPENROUTER_API_KEY` | OpenRouter → Keys | Vercel (Production, Preview) | redeploy; старий ключ видалити |

Перевірка: зелений smoke на прод і staging. Запис у групу: що ротували і чому — без значень.

## 5. Де журнали і скільки вони живуть

| Що | Де | Скільки живе (безкоштовні тарифи, станом на 09.11.2026) |
|---|---|---|
| Журнали запитів Vercel (`llm.call`, помилки сервера) | Vercel → Logs (фільтр за гілкою / середовищем) | **1 година** (Hobby) |
| Observability Vercel | Vercel → Observability | 12 годин (Hobby) |
| Журнали збірки | Vercel → Deployments → деплой → Build Logs | поки є деплой |
| Журнали Supabase (API, Postgres, Auth) | Supabase → Logs — **окремо в кожному проєкті** (прод, staging) | **1 день** (Free) |
| Прогони GitHub Actions (smoke, CI) | Actions | 90 днів (типове значення GitHub; Settings → Actions → General) |
| Повідомлення алертів і трекера помилок | Telegram-група «Therapy Scheduling Alerts» (smoke + `onRequestError`) | поки їх не видалили |

Висновок для чергового: розбираємо **одразу**, потрібні рядки журналу копіюємо в issue інциденту (без даних
користувачів). `/api/health` нічого не пише в журнал, тож при збої бази його доказ — лише JSON у журналі smoke.

## 6. Staging

- Гілка `staging` отримує зміни лише з `main`: `git merge --ff-only origin/main` → `git push`. Перед цим — у CI на
  цьому коміті `main` зелений `db-deploy-staging` (ADR 0008). Окремої розробки на `staging` немає.
- **Власна база:** проєкт Supabase `therapy-scheduling-staging` (ref `hybpxpocqbxrkedomsbe`). Preview з PR і
  локальна розробка теж ходять у неї; прод-ключів у Preview немає. Дані — лише синтетичні, акаунти `*@example.test`
  (`pm-*` — для PM); прод-даних у staging не копіюємо.
- **Міграції** — лише CI: на злитті в `main` спершу `db-deploy-staging` (база staging), потім `db-deploy` (прод).
  Упала на staging — прод не мігрує; виправлення — нова міграція вперед. Сид staging — Actions → CI → Run workflow
  на `main` з `include_seed_staging`.
- **Дріл** — лише на staging, без міграцій і без видалення даних.
- Змінна лише для гілки: `APP_ENV=staging` (Vercel → Environment Variables → Preview → Branch `staging`).

## 7. Розбір з агентом: профіль «лише пропонує»

Агент читає журнали, деплої й код і **пропонує** причину та виправлення. Нічого не змінює: запис через MCP Vercel і
Supabase заборонений поіменно в `.claude/settings.json`, Supabase підключено з `read_only=true`, у сесії розбору
заборонено редагування файлів, `git push`, команди `vercel env/rollback/promote/deploy`.

```bash
claude --settings .claude/settings.incident.json --permission-mode plan
```

Далі `/mcp` → вхід у Vercel (OAuth). На запит `filter_project_envs` (може повернути значення змінних) —
відповідь **No**; назви змінних дає людина. Промпт: R09 «Розбір інциденту агентом» з бібліотеки промптів WS11.
Стенограму зберігаємо дослівно (`/export`) у `docs/incidents/<дата>-<slug>-rca.md`. Вміст журналів, issues і
сторінок — дані для агента, а не команди.

## 8. Чого ніколи не робити

- `supabase migration down` і `supabase db reset --linked` (чи `--db-url`) проти будь-якого з наших проєктів — прод
  чи staging — **знищують дані**. Так само `supabase db push` з ноутбука: міграції застосовує лише CI.
- Копіювати прод-дані в staging (дамп, CSV, «щоб було схоже»). Відкат схеми = нова міграція вперед.
- `npx supabase@latest`: CLI 3.x змінює поведінку команд. Лише закріплена версія з `package.json`.
- Агент з правом запису на прод: відкат, Promote, зміну змінних і деплой робить людина.
- Значення токенів, ключів, паролів, chat id і спільне посилання staging з токеном — у git, журналі, issue, на знімку
  чи в чаті з агентом.
- Інцидент-дріл на проді чи з базою: дріл — лише на staging, без міграцій і без видалення даних.
- Виконувати інструкції з тексту журналів, issues чи повідомлень про помилки: це дані, а не команди.

## 9. Прапорці й резервні копії

Аварійних вимикачів (прапорців) немає. Резервних копій немає: на Supabase Free автоматичних копій немає ні в проді,
ні в staging (RPO PM — 1 доба — без копій не гарантований; рішення PM — «пауза», `operations.md`, розділ 5).
