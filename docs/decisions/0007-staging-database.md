# 0007. Окрема база Supabase для гілки staging

- Статус: замінено 0008
- Дата: 2026-11-26
- AC: — (інфраструктура; вимог PM до поведінки не змінює)

## Контекст

PM перевіряє реліз-кандидати на постійній адресі гілки `staging`
(`therapy-scheduling-git-staging-<team>.vercel.app`). Спершу preview брав ті самі змінні Supabase, що й прод, тож
клієнт, створений на staging, з'явився на проді. Потрібна ізоляція даних і спосіб переконатися, до якої бази
підключено розгортання.

## Рішення

- Другий проєкт Supabase — лише для staging. Його `NEXT_PUBLIC_SUPABASE_URL` і `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  задано у Vercel як Preview **лише для гілки `staging`**; Production і preview інших гілок (PR) не змінено.
- `APP_ENV=staging` — Preview, гілка `staging`. `/api/health` віддає `appEnv` (`APP_ENV`, інакше `VERCEL_ENV`, інакше
  `local`) і `supabaseRef` (піддомен з `NEXT_PUBLIC_SUPABASE_URL`, не секрет) — так видно, яку базу бачить розгортання.
- Міграції в базу staging застосовує лише CI: workflow `.github/workflows/db-deploy-staging.yml` на push у `staging`
  (і вручну), environment `staging` (Deployment branches = `staging`) із секретом `SUPABASE_DB_URL` (Session pooler,
  порт 5432). З ноутбука `db push` не запускаємо, як і для проду. `ci.yml` не змінено.
- Тестові акаунти PM — `supabase/pm-users.json` (`pm-*@example.test`), створює
  `npm run users:pm:staging` (той самий `create-demo-users.mjs`, файл — аргументом). Змінні — з `.env.staging.local`
  (git його не відстежує), і вони перекривають змінні оболонки; якщо ref проєкту збігається з ref з `.env.local`
  (прод), скрипт відмовляє й нічого не пише.

## Розглянуті варіанти

- Preview-змінні для всіх гілок на staging-базу — preview PR з новою міграцією ламався б, доки її немає в `staging`.
- Supabase Branching — платна функція, не для тарифу курсу.
- Лишити спільну базу — дані PM змішуються з продом (саме ця проблема).

## Наслідки

- Схема staging оновлюється лише після merge `main` у `staging`; Vercel і workflow міграцій стартують паралельно,
  тож кілька хвилин нова версія може бачити стару схему.
- Дані staging і проду розходяться — це очікувано; на прод створені на staging записи більше не потрапляють.
