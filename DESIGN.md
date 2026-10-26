# Дизайн-система: планування для практики психотерапії

- **Джерело:** артефакт Claude Design (Design System), згенерований з `requirements/product.md`; перенесено й знеособлено
  агентом (Claude Code): прибрано назву, логотипи, посилання на лендинг і кольори-«якорі» бренду, палітру задано
  заново в OKLCH. Посилання на артефакт і промпт — в описі PR дизайн-системи.
- **Вхід від PM:** розділ «Вигляд і тон» у `requirements/product.md` (знімок 2026-10-24).
- **Код:** токени — `src/app/globals.css`; компоненти — `src/components/ui/` (shadcn/ui); статуси —
  `src/components/ui/status-badge.tsx`; перевірка — `npm run check:design`.

## 1. Огляд

Внутрішній застосунок практики: адміністратори, планувальники й терапевти працюють у ньому щодня на робочому столі,
між сеансами й дзвінками; терапевти ще переглядають розклад з планшета. Клієнти й опікуни не входять. Тон —
**спокійний, стриманий, охайний, довірливий**; уникаємо тривожного червоного, яскравих акцентів, градієнтів, фото й
маркетингових блоків. Нейтральні кольори несуть інтерфейс, колір позначає лише дію й статус. Списки, слоти й розклад —
компактні; форми — просторі.

Принципи:

1. **Червоний — лише для помилок** (валідація, збій збереження). Бізнесовий результат («Expired», «Past») — не червоний.
2. **Статус одразу видно:** іконка + підпис + колір (`StatusBadge`), ніколи лише колір.
3. **Приватність за замовчуванням:** те, що ролі не можна бачити, не рендеримо взагалі (не розмиваємо).
4. **Одна основна дія на область** — `Button` `default`; решта — `outline`, `secondary` чи `ghost`.

## 2. Кольори

Семантичні токени з іменами shadcn/ui, значення — OKLCH. У сторінках — лише утиліти з колонки «Клас»: жодних hex,
`bg-[#…]`, сирих палітр (`zinc-500`, `bg-white`) і кольорів в inline style. Темна тема — за системою
(`@media (prefers-color-scheme: dark)`); вбудований `dark:` Tailwind 4 теж іде за системою.

Акцент дії — один приглушений синьо-зелений (hue ≈ 200); теплий бурштиновий — лише для статусу «Held».

| Токен | Для чого | Світла | Темна | Клас |
|---|---|---|---|---|
| `background` / `foreground` | тло сторінки й основний текст | `oklch(0.975 0.004 200)` / `oklch(0.235 0.012 230)` | `oklch(0.175 0.007 230)` / `oklch(0.955 0.004 200)` | `bg-background`, `text-foreground` |
| `card` / `card-foreground` | картки, таблиці, форми | `oklch(1 0 0)` / як `foreground` | `oklch(0.215 0.008 230)` / як `foreground` | `bg-card`, `text-card-foreground` |
| `popover` / `popover-foreground` | меню, діалоги, списки вибору | як `card` | як `card` | `bg-popover`, `text-popover-foreground` |
| `primary` / `primary-foreground` | основна дія (одна на область), активне посилання | `oklch(0.47 0.065 200)` / `oklch(0.99 0.003 200)` | `oklch(0.79 0.07 195)` / `oklch(0.2 0.025 210)` | `bg-primary`, `text-primary-foreground`, `text-primary` |
| `secondary` / `secondary-foreground` | другорядна дія | `oklch(0.945 0.008 200)` / як `foreground` | `oklch(0.275 0.009 230)` / як `foreground` | `bg-secondary`, `text-secondary-foreground` |
| `muted` / `muted-foreground` | приглушене тло (шапка таблиці), підписи, «Not provided» | `oklch(0.955 0.005 200)` / `oklch(0.49 0.014 230)` | `oklch(0.255 0.008 230)` / `oklch(0.74 0.012 215)` | `bg-muted`, `text-muted-foreground` |
| `accent` / `accent-foreground` | наведення на рядок, пункт меню, `ghost` | `oklch(0.945 0.008 200)` / як `foreground` | `oklch(0.275 0.009 230)` / як `foreground` | `bg-accent`, `text-accent-foreground` |
| `destructive` | текст і рамка помилки | `oklch(0.53 0.19 27)` | `oklch(0.72 0.16 25)` | `text-destructive`, `border-destructive` |
| `success` / `success-foreground` | повідомлення про успішну дію | `oklch(0.955 0.04 155)` / `oklch(0.41 0.09 155)` | `oklch(0.3 0.05 155)` / `oklch(0.9 0.07 155)` | `bg-success`, `text-success-foreground` |
| `border` | розділювачі, межі карток і таблиць | `oklch(0.905 0.007 200)` | `oklch(0.32 0.009 230)` | `border-border`, `divide-border` |
| `input` | межа поля вводу (≥ 3:1) | `oklch(0.64 0.012 220)` | `oklch(0.58 0.012 220)` | `border-input` |
| `ring` | кільце фокусу (≥ 3:1) | `oklch(0.55 0.075 200)` | `oklch(0.74 0.075 195)` | `ring-ring` |
| `status-free` / `-foreground` | слот «Free» | `oklch(0.96 0.022 200)` / `oklch(0.39 0.06 205)` | `oklch(0.29 0.035 205)` / `oklch(0.9 0.045 200)` | `bg-status-free`, `text-status-free-foreground` |
| `status-held` / `-foreground` | «Held» (слот і утримання) | `oklch(0.955 0.045 85)` / `oklch(0.43 0.085 65)` | `oklch(0.3 0.05 75)` / `oklch(0.9 0.075 85)` | `bg-status-held`, `text-status-held-foreground` |
| `status-confirmed` / `-foreground` | «Confirmed» (слот, утримання, сеанс) | `oklch(0.955 0.04 155)` / `oklch(0.41 0.09 155)` | `oklch(0.3 0.05 155)` / `oklch(0.9 0.07 155)` | `bg-status-confirmed`, `text-status-confirmed-foreground` |
| `status-expired` / `-foreground` | «Expired» — треба діяти, нічого не зламано | `oklch(0.955 0.035 55)` / `oklch(0.45 0.115 48)` | `oklch(0.31 0.05 50)` / `oklch(0.9 0.06 60)` | `bg-status-expired`, `text-status-expired-foreground` |
| `status-past` / `-foreground` | «Past» — закритий результат | `oklch(0.955 0.005 200)` / `oklch(0.47 0.014 230)` | `oklch(0.255 0.008 230)` / `oklch(0.76 0.012 215)` | `bg-status-past`, `text-status-past-foreground` |

### Контраст

Пораховано за WCAG 2.1 (OKLCH → sRGB → відносна яскравість) для кожної пари в обох темах. Текст ≥ 4.5:1, межі
полів і фокус ≥ 3:1. Усі пари проходять.

| Пара | Світла | Темна | Норма |
|---|---|---|---|
| `foreground` на `background` | 15.50 | 16.65 | ≥ 4.5 |
| `foreground` на `card` | 16.64 | 15.37 | ≥ 4.5 |
| `foreground` на `secondary` / `accent` | 14.20 | 13.00 | ≥ 4.5 |
| `muted-foreground` на `background` | 5.81 | 8.25 | ≥ 4.5 |
| `muted-foreground` на `card` | 6.24 | 7.62 | ≥ 4.5 |
| `muted-foreground` на `muted` | 5.48 | 6.85 | ≥ 4.5 |
| `primary-foreground` на `primary` | 6.44 | 9.58 | ≥ 4.5 |
| `primary` (посилання) на `card` | 6.62 | 9.31 | ≥ 4.5 |
| `destructive` на `card` | 5.82 | 6.58 | ≥ 4.5 |
| `destructive` на `background` | 5.42 | 7.13 | ≥ 4.5 |
| `success-foreground` на `card` | 8.45 | 13.32 | ≥ 4.5 |
| `status-free-foreground` на `status-free` | 8.39 | 10.51 | ≥ 4.5 |
| `status-held-foreground` на `status-held` | 7.27 | 10.17 | ≥ 4.5 |
| `status-confirmed-foreground` на `status-confirmed` | 7.52 | 10.17 | ≥ 4.5 |
| `status-expired-foreground` на `status-expired` | 6.72 | 9.80 | ≥ 4.5 |
| `status-past-foreground` на `status-past` | 5.97 | 7.36 | ≥ 4.5 |
| `input` на `card` | 3.35 | 4.10 | ≥ 3 |
| `input` на `background` | 3.12 | 4.44 | ≥ 3 |
| `ring` на `background` | 4.36 | 8.48 | ≥ 3 |
| `ring` на `card` | 4.69 | 7.83 | ≥ 3 |

## 3. Типографіка

Дві родини через `next/font/google`: **Inter** (`--font-sans`, увесь інтерфейс; справжні табличні цифри) і
**Manrope** (`--font-heading`, лише заголовки). Мова інтерфейсу — англійська. Мінімальний розмір — 12px.

| Роль | Клас | Де |
|---|---|---|
| Заголовок сторінки | `font-heading text-2xl font-semibold tracking-tight` | один на сторінку (Slots, Holds, Clients, My schedule) |
| Заголовок розділу | `font-heading text-lg font-semibold` | розділи сторінки, заголовок картки |
| Заголовок групи | `font-heading text-sm font-semibold` | день у розкладі, група полів форми |
| Основний текст | `text-sm` (14/20) | клітинки, поля, меню — за замовчуванням |
| Підпис, допоміжний текст | `text-sm text-muted-foreground` або `text-xs text-muted-foreground` | email біля імені, «Held until», підказки |
| Дата й час | `tabular-nums` | кожна дата, час і проміжок |

- Дати — `YYYY-MM-DD`, час — 24 години: «2026-11-03 14:30»; проміжок — через en dash: «14:00–15:00».
- Тиждень — понеділок–неділя; увесь час — у поясі практики America/Los_Angeles.

## 4. Відступи й радіуси

- Шкала Tailwind з кроком 4px: `gap-2` (8) між іконкою й текстом і в рядку дій, `gap-3` (12) між полями в рядку,
  `gap-4` (16) між полями форми, `gap-6` (24) між блоками сторінки, `gap-8` (32) між розділами.
- Ширина контенту: сторінки `max-w-3xl` (768px), форма входу `max-w-sm`, одноколонкові форми не ширші за `max-w-xl`.
  Відступ сторінки — `px-6 py-12`.
- Щільність: рядки списків і таблиць компактні (`py-2`, висота ≈ 36px); форми — просторі.
- `--radius: 0.5rem`. `rounded-md` — кнопки, поля, меню; `rounded-lg` — картки, діалоги; `rounded-full` — бейджі
  статусів. Тіні — лише легкі (`shadow-xs` на картці); жодних градієнтів, скла й кольорових тіней.

## 5. Компоненти й варіанти

Лише з `@/components/ui` (shadcn/ui на Base UI, CLI 4). Новий компонент — `npx shadcn@latest add <назва>`;
змінюємо його лише в `src/components/ui/`, кольори — лише токенами.

| Компонент | Варіанти | Правило |
|---|---|---|
| `Button` | `default`, `secondary`, `outline`, `ghost`, `link`; розміри `sm`, `default` | `default` — одна основна дія на область («Hold», «Confirm», «Create client»); дієслово в підписі; `destructive` — не використовуємо: у WS6–WS7 небезпечних дій немає |
| `Input` + `Label` | — | у кожного поля `Label` з `htmlFor`; placeholder — не замість підпису |
| `NativeSelect` | — | вибір зі списку в серверній формі (терапевт, клієнт); завжди з `Label` або `aria-label` |
| `Card` | `CardHeader`, `CardTitle`, `CardContent` | групує форму чи список на сторінці |
| `Table` | — | списки записів (утримання, клієнти); шапка — `text-muted-foreground`, рядки — компактні |
| `Badge` / `StatusBadge` | статуси домену | статус — іконка + підпис + колір, підписи дослівно з вимог PM |
| `Alert` | `default`, `destructive` | повідомлення про помилку чи результат дії; текст — дослівно з AC |
| `Dialog` | — | підтвердження дії, якщо PM його вимагатиме |

Статуси (`StatusBadge`, іконки — `lucide-react`):

| Сутність | Підпис | Токен | Іконка |
|---|---|---|---|
| Слот | «Free» | `status-free` | `CircleDashed` |
| Слот, утримання | «Held» | `status-held` | `Hourglass` (поруч завжди «Held until …») |
| Слот, утримання, сеанс | «Confirmed» | `status-confirmed` | `CircleCheck` |
| Утримання | «Expired» | `status-expired` | `TimerOff` |
| Слот | «Past» | `status-past` | `History` |

## 6. Стани

| Стан | Як виглядає | Приклад тексту |
|---|---|---|
| Порожній список | `text-sm text-muted-foreground` у межах картки, без ілюстрацій | «No holds waiting for a decision.», «No clients yet. Clients appear here when a scheduler holds a slot with you.» |
| Помилка дії | `Alert` `destructive` під формою; введене лишається у формі | «Enter the guardian's name and a valid email.», «This hold has expired. Hold the slot again.» |
| Помилка завантаження | `Alert` `destructive` замість списку | «Could not load holds. Try again.» |
| Відмова в доступі | `Alert` з іконкою `Lock` і текстом PM, без імен, кількостей і назв полів | «You don't have access to this client.» |
| Без ролі | лише повідомлення, жодних даних | «Your account has no access yet. Contact an administrator.» |
| Не увійшов | лише сторінка входу | — |
| Завантаження | кнопка `disabled` під час відправлення форми | — |
| Успіх | `Alert` з `bg-success text-success-foreground` (role="status") | «Hold created.» |
| Відсутнє значення | `text-muted-foreground` | «Not provided» |

Тексти: короткі ввічливі речення «що сталося → що робити далі»; без «I/we», емодзі й знаків оклику; регістр речення
в заголовках і кнопках; словник — client, guardian, therapist, scheduler, slot, hold, session, schedule (не calendar).

## 7. Доступність — мінімум

- Label у кожного поля; помилка поля пов'язана з полем (`aria-describedby`), повідомлення форми — `role="alert"`.
- Видимий фокус: кільце `ring` (`focus-visible:ring-3 ring-ring/50` у компонентах); Tab проходить форму по порядку.
- Контраст — таблиця в розділі 2.
- Статус ніколи не лише кольором — поруч завжди іконка й текст.
- Спершу семантичний HTML (`<button>`, `<table>`, `<label>`); `aria-*` — там, де HTML бракує.
- Під `prefers-reduced-motion: reduce` — без руху, лише короткі зміни прозорості.

## 8. Do / Don't

| ✅ Робимо | ❌ Не робимо |
|---|---|
| `bg-primary text-primary-foreground` | `bg-zinc-900 text-white`, `bg-[#…]`, `style={{ color: "#…" }}` |
| компонент `Button` з потрібним варіантом | власний `<button className="…">` у сторінці |
| `<StatusBadge status="held" />` | статус лише кольором фону чи лише текстом без іконки |
| `text-destructive` лише для помилок | червоний для «Expired», «Past» чи інших бізнесових результатів |
| не показувати email клієнта в розкладі терапевта | розмивати чи маскувати дані, яких ролі бачити не можна |
| новий токен через розділ 9 | новий колір «лише для цієї сторінки» або сирий клас у `src/components/ui` |
| синтетичні дані `*@example.test` на знімках | справжні назви, логотипи, кольори бренду клієнта |

## 9. Як додати токен

1. Опишіть токен у таблиці розділу 2: для чого, значення в обох темах, контраст.
2. `src/app/globals.css`: `--<назва>` у `:root` і в `@media (prefers-color-scheme: dark)`.
3. `--color-<назва>: var(--<назва>);` у `@theme inline` → з'являються класи `bg-<назва>`, `text-<назва>`, `border-<назва>`.
4. `npm run check:design` і знімок сторінки у світлій і темній темі.

## 10. Перевірка

- `npm run check:design` — жодного hex, довільного кольору, сирої палітри чи кольору в inline style поза
  `src/components/ui` і `globals.css`. CI: `.github/workflows/architecture.yml`, job «Дизайн-система: лише токени».
- Виняток — коментар `design-ok: <причина>` у тому самому рядку; кожен виняток — з реальною причиною.
- Візуально: знімки ключових сторінок у світлій і темній темі (`docs/img/ws7-*`), Tab по формі, контраст.
