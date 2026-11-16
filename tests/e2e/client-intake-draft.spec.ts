// UAT зрізу 4 «Чернетка картки клієнта з тексту звернення» (вимога PM #36): AC-INTAKE-03 і AC-INTAKE-06
// (design.md impl-client-intake-draft, «Тести й evals»). Тексти в твердженнях — дослівно з вимог PM, а не з коду.
//
// Обидва тести викликають СПРАВЖНЮ модель на проді: кожен прогін — 2 запити з денного ліміту безкоштовних моделей
// OpenRouter (50/добу на акаунт; той самий ліміт ділять eval і приймання PM). Перед прогоном — `npm run ai:quota`.
// Помічник недоступний (ліміт, тайм-аут) → тест червоний: «Дано» AC-INTAKE-03 вимагає заповненої чернетки.
//
// Нічого не пишуть (без @writes): чернетка лише заповнює форму, картку не створює ніхто. Спільна продова база може
// вже мати картку «Client Ten» (наприклад, з приймання PM), тому email у тексті AC-INTAKE-01 замінено синтетичним
// uatEmail(…) цього прогону («Припущення» PM: дані в «Дано» — приклади для тестів), а «картки Client Ten немає»
// доводимо так: картки з цим email немає ні до, ні після, і кількість карток «Client Ten» не змінилася.
import { expect, type Page } from "@playwright/test";
import { uatEmail } from "./support/admin";
import { test } from "./support/clients";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

const SCHEDULER1 = "scheduler1@example.test";
// Тексти — дослівно з AC PM (requirements/36-…).
const DRAFT_READY = "Draft ready. Check the fields and create the card.";
const REFUSED = "This text can't be used to draft a client card. Paste the client's request or fill in the form manually.";
const BOOK_QUESTION = "Can you recommend a good book about anxiety?";

const requestOf = (email: string) =>
  `Hi, my name is Client Ten, I was born on May 14, 1990. I'd like individual sessions in English. My email is ${email}.`;

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

/** Скільки карток знаходить пошук списку клієнтів (порожній результат — 0). */
async function cardsFound(page: Page, query: string): Promise<number> {
  await page.goto(`/clients?q=${encodeURIComponent(query)}`);
  await expect(page.getByRole("heading", { level: 1, name: "Clients" })).toBeVisible();
  const rows = page.getByTestId("client-list").locator("tbody tr");
  await expect(rows.or(page.getByTestId("clients-empty")).first()).toBeVisible();
  return rows.count();
}

/** Попросити чернетку, як це робить планувальник: вставити текст і натиснути «Draft from request». */
async function askDraft(page: Page, text: string) {
  await page.getByLabel("Client's request").fill(text);
  await page.getByRole("button", { name: "Draft from request" }).click();
  // Модель відповідає до 25 с (D1); повідомлення чернетки — role="status" у формі.
  await expect(page.getByRole("main").getByRole("status")).toBeVisible({ timeout: 35_000 });
}

test.describe("планувальник", () => {
  test.use({ storageState: "playwright/.auth/scheduler.json" });

  test(
    "AC-INTAKE-03: чернетку Client Ten заповнено у формі, scheduler1 не створює картку — у списку клієнтів її немає",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-INTAKE-03" } },
    async ({ page }) => {
      const email = uatEmail("intake03");
      let clientTenBefore = 0;

      await given("чернетку за текстом з AC-INTAKE-01 заповнено у формі нової картки", async () => {
        expect(await cardsFound(page, email), `картка ${email} вже є — дані прогону не чисті`).toBe(0);
        clientTenBefore = await cardsFound(page, "Client Ten");
        await page.goto("/clients/new");
        await expect(page.locator("header").getByText(SCHEDULER1, { exact: true })).toBeVisible();
        await askDraft(page, requestOf(email));
        await expect(page.getByRole("main").getByRole("status")).toHaveText(DRAFT_READY);
        await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Client Ten");
        await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
      });

      await when("scheduler1 не створює картку й відкриває список клієнтів", async () => {
        await page.getByRole("link", { name: "Clients", exact: true }).click();
        await expect(page).toHaveURL((url) => url.pathname === "/clients");
        await expect(page.getByRole("heading", { level: 1, name: "Clients" })).toBeVisible();
      });

      await thenStep(
        page,
        {
          clause:
            "картки «Client Ten» у списку немає: картку створює лише сам планувальник, коли зберігає форму",
          visible: ["список клієнтів scheduler1 (сторінка Clients)", "у списку немає рядка «Client Ten» з email цього прогону"],
          hidden: [
            `пошук за email ${email} після чернетки — 0 карток`,
            "кількість карток «Client Ten» до і після чернетки — однакова",
          ],
        },
        async () => {
          await expect(page.getByTestId("client-list").getByText(email)).toHaveCount(0);
          expect(await cardsFound(page, email)).toBe(0);
          expect(await cardsFound(page, "Client Ten")).toBe(clientTenBefore);
        },
      );
    },
  );

  test(
    "AC-INTAKE-06: текст не є зверненням нового клієнта — поля форми не змінено (Name лишається «Client Fifteen»)",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-INTAKE-06" } },
    async ({ page }) => {
      await given("у формі нової картки вже введено Name «Client Fifteen»", async () => {
        await page.goto("/clients/new");
        await expect(page.locator("header").getByText(SCHEDULER1, { exact: true })).toBeVisible();
        await page.getByLabel("Name", { exact: true }).fill("Client Fifteen");
      });

      await when(`scheduler1 просить скласти чернетку з тексту звернення «${BOOK_QUESTION}»`, async () => {
        await askDraft(page, BOOK_QUESTION);
      });

      await thenStep(
        page,
        {
          clause:
            "поля форми не змінено (Name лишається «Client Fifteen»), і scheduler1 бачить повідомлення «This text can't be used to draft a client card. Paste the client's request or fill in the form manually.»",
          visible: [
            `повідомлення «${REFUSED}»`,
            "поле Name — «Client Fifteen»",
            "Client type — Adult, Date of birth, Session language і Email — порожні, як до запиту",
          ],
          hidden: ["картку не створено: форма лишилась на /clients/new без повідомлення про створення"],
        },
        async () => {
          await expect(page.getByRole("main").getByRole("status")).toHaveText(REFUSED);
          await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Client Fifteen");
          await expect(page.getByLabel("Client type")).toHaveValue("adult");
          await expect(page.getByLabel("Date of birth")).toHaveValue("");
          await expect(page.getByLabel("Session language")).toHaveValue("");
          await expect(page.getByLabel("Email", { exact: true })).toHaveValue("");
          await expect(page).toHaveURL((url) => url.pathname === "/clients/new");
          await expect(page.getByText(/^Client card created/)).toHaveCount(0);
        },
      );
    },
  );
});
