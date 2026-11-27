# 0008. Усі preview — на базі staging, міграції staging — з `main`

- Статус: замінює 0007
- Дата: 2026-11-27
- AC: — (інфраструктура; вимог PM до поведінки не змінює)

## Контекст

За ADR 0007 база staging обслуговувала лише гілку `staging`, а preview з PR брали змінні Supabase проду. Через це
кожен PR-preview читав і писав прод-дані, а прод-ключ був у середовищі Preview. Операційні вимоги WS11 цього не
дозволяють: Preview на всіх гілках має йти в окремий проєкт, а прод-ключів у Preview не має бути. Крім того, міграції
staging застосовувались push-ем у `staging` окремим workflow. Тому прод міг мігрувати навіть тоді, коли на staging
міграція падала.

## Рішення

- Vercel: кожна змінна Supabase має два записи. **Production** — прод-проєкт. **Preview (усі гілки)** — проєкт
  staging. Development — staging або не задано. `APP_ENV=staging` і (якщо потрібен) `SUPABASE_SECRET_KEY` staging
  задано як Preview **лише для гілки `staging`**. Тому `appEnv` у PR-preview дорівнює `preview`, а `supabaseRef` —
  ref staging.
- CI: у `ci.yml` додано job `db-deploy-staging`. Він працює лише на `main`, через environment `staging`
  (Deployment branches = `main`). Перед міграцією він звіряє ref із рядка Session pooler зі змінною репо
  `SUPABASE_STAGING_REF` і друкує «Ціль міграцій: проєкт <ref> (staging)». `db-deploy` (прод) чекає на нього і так
  само звіряє свій ref із `SUPABASE_PROD_REF`. Вхід `include_seed_staging` запускає seed у staging вручну.
  `.github/workflows/db-deploy-staging.yml` видалено.
- `staging` отримує код лише з `main` (`git merge --ff-only origin/main` або PR `main → staging`). Схему staging
  на той момент уже оновив CI.
- Взято з `materials/ops-kit/ci-examples/db-deploy-staging.yml` репо домашки WS11.

## Розглянуті варіанти

- Лишити ADR 0007 (preview PR на проді): прод-дані змінюються з будь-якого PR, і це суперечить вимогам.
- Окремий workflow на push у `staging` (як було): прод не залежить від успіху міграції staging.

## Наслідки

- Preview PR з **новою, ще не злитою** міграцією бачить стару схему staging, доки PR не злито в `main`. Тому сторінки,
  яким потрібна нова схема, на такому preview можуть падати. Перевіряємо їх локально (`db-check` у CI) або на
  staging після злиття.
- Дані PR-preview і UAT PM — спільні (одна база staging). Для дрілу — лише змінна гілки `staging`, без міграцій.
- Якщо секрет чи змінні з ref не задано, `db-deploy-staging` червоніє, і прод не мігрує. Це навмисно.
