// Помічники UAT для карток клієнтів (зріз 2): лише читання. Друга роль у тому самому тесті — фікстура з окремим
// контекстом і збереженою сесією з auth.setup.ts (контекст закривається й тоді, коли тест упав).
// Кадрів-доказів тут не знімаємо — це «Дано» і невидимі частини «Тоді» («жодна картка не змінилася»).
import { expect, test as base, type Page } from "@playwright/test";

const asRole = (role: "scheduler" | "therapist") =>
  async ({ browser }: { browser: import("@playwright/test").Browser }, use: (page: Page) => Promise<void>) => {
    const context = await browser.newContext({ storageState: `playwright/.auth/${role}.json` });
    await use(await context.newPage());
    await context.close();
  };

export const test = base.extend<{ schedulerPage: Page; therapistPage: Page }>({
  schedulerPage: asRole("scheduler"),
  therapistPage: asRole("therapist"),
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
