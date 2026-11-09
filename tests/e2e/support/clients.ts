// Помічники UAT для карток клієнтів (зріз 2): лише читання. Друга роль у тому самому тесті — фікстура з окремим
// контекстом і збереженою сесією з auth.setup.ts (контекст закривається й тоді, коли тест упав).
// Кадрів-доказів тут не знімаємо — це «Дано» і невидимі частини «Тоді» («жодна картка не змінилася»).
// Зріз 3 (AC-INS-03): ролі поза auth.setup.ts (admin1, scheduler2) входять через signInAs — без форми входу.
import { createServerClient } from "@supabase/ssr";
import { expect, test as base, type Browser, type Page } from "@playwright/test";

const asRole = (role: "scheduler" | "therapist") =>
  async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>) => {
    const context = await browser.newContext({ storageState: `playwright/.auth/${role}.json` });
    await use(await context.newPage());
    await context.close();
  };

/**
 * Вхід акаунта з supabase/demo-users.json у контекст сторінки — БЕЗ форми входу: тести записуються (відео й траса),
 * а форма вводила б пароль у записаному браузері (тому auth.setup.ts іде без запису). Тут пароль бачить лише Node:
 * signInWithPassword клієнтом @supabase/ssr (тим самим, що й застосунок), а в браузер ідуть лише cookie сесії.
 * Пароль — UAT_PASSWORD_<РОЛЬ> або DEMO_USER_PASSWORD, як в auth.setup.ts; значень не друкуємо.
 */
export async function signInAs(page: Page, email: string, role: string) {
  const password = process.env[`UAT_PASSWORD_${role.toUpperCase()}`] ?? process.env.DEMO_USER_PASSWORD;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const baseURL = test.info().project.use.baseURL;
  if (!password || !url || !key || !baseURL) {
    throw new Error(
      `Для входу ${email} потрібні DEMO_USER_PASSWORD (або UAT_PASSWORD_${role.toUpperCase()}), ` +
        "NEXT_PUBLIC_SUPABASE_URL і NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (.env.local)",
    );
  }
  const jar: { name: string; value: string }[] = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => [],
      setAll: (cookies) => {
        jar.push(...cookies.map(({ name, value }) => ({ name, value })));
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Вхід ${email} не вдався: ${error.message}`);
  expect(jar.length, `після входу ${email} немає cookie сесії`).toBeGreaterThan(0);
  await page.context().addCookies(jar.map(({ name, value }) => ({ name, value, url: baseURL, sameSite: "Lax" as const })));
}

const asUser = (email: string, role: string) =>
  async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInAs(page, email, role);
    await use(page);
    await context.close();
  };

export const test = base.extend<{ schedulerPage: Page; therapistPage: Page; scheduler2Page: Page }>({
  schedulerPage: asRole("scheduler"),
  therapistPage: asRole("therapist"),
  scheduler2Page: asUser("scheduler2@example.test", "scheduler2"),
});

/** Рядки списку карток, як їх бачить планувальник (порожній список — 0). */
export async function clientCardCount(page: Page): Promise<number> {
  await page.goto("/clients");
  await expect(page.getByRole("heading", { level: 1, name: "Clients" })).toBeVisible();
  return page.getByTestId("client-list").locator("tbody tr").count();
}

/** Адреса картки клієнта за його email (пошук у списку планувальника) і вміст картки — щоб звірити «не змінилася». */
export async function clientCard(page: Page, email: string): Promise<{ path: string; text: string }> {
  await page.goto(`/clients?q=${encodeURIComponent(email)}`);
  const rows = page.getByTestId("client-list").locator("tbody tr").filter({ hasText: email });
  await expect(rows, `на проді немає картки клієнта ${email} — дані з вимог PM`).toHaveCount(1);
  const path = (await rows.getByRole("link").getAttribute("href")) ?? "";
  expect(path).toMatch(/^\/clients\/[0-9a-f-]{36}$/);
  return { path, text: await cardText(page, path) };
}

/** Текст картки клієнта за адресою (під роллю сторінки). */
export async function cardText(page: Page, path: string): Promise<string> {
  await page.goto(path);
  return page.getByTestId("client-card").innerText();
}

/** Усі адреси @example.test, які видно на сторінці. */
export async function visibleEmails(page: Page): Promise<string[]> {
  const text = await page.locator("body").innerText();
  return [...new Set(text.match(/[\w.+-]+@example\.test/gi) ?? [])];
}

/** Сторінка входу і жодних даних клієнтів чи утримань: ні списків, ні картки, ні адрес @example.test. */
export async function expectLoginOnly(page: Page) {
  await expect(page).toHaveURL((url) => url.pathname === "/login");
  await expect(page.getByRole("heading", { level: 1, name: "Вхід" })).toBeVisible();
  await expect(page.getByLabel("Пароль")).toBeVisible();
  for (const id of ["client-list", "client-card", "hold-list", "slot-list"]) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
  expect(await visibleEmails(page)).toEqual([]);
}
