// НЕГАТИВНІ КОНТРОЛІ — навмисно хибні очікування: показують, що UAT уміє падати. Не AC-тести: назви починаються з NC-,
// а не з AC ID, тож ac:coverage їх не рахує. У звичайному прогоні їх немає (проєкт chromium має grepInvert
// @negative-control); запуск: npm run uat:nc (UAT_NEGATIVE_CONTROLS=1 → проєкт negative-controls). Лише читання.
// Що мають показати (AC-CARD-16, роль scheduler1):
//   NC-1 — у тесті неправильний очікуваний текст → перевірка падає → FAIL, хоч би що сказав агент (R1);
//   NC-2 — текст «Тоді» у вимозі уточнено, а тест і застосунок ні → перевірки зелені, агент звіряє кадр із НОВИМ
//          текстом PM і не погоджується → NEEDS-HUMAN (R3).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/scheduler.json" });

const MISSING_CARD = "/clients/00000000-0000-4000-8000-000000000016";
const MESSAGE = "This client card doesn't exist.";
const WRONG_MESSAGE = "This client card was not found.";
const CLAUSE = `scheduler1 бачить повідомлення «${MESSAGE}»`;

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "NC-1 (AC-CARD-16, навмисно хибне очікування в тесті: інший текст повідомлення)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-CARD-16" },
      { type: "case", description: "NC-1" },
    ],
  },
  async ({ page }) => {
    await given("картки клієнта, на яку веде посилання, не існує", async () => {
      await page.goto("/clients");
    });
    await when("scheduler1 відкриває це посилання", async () => {
      await page.goto(MISSING_CARD);
    });
    await thenStep(page, { clause: CLAUSE, visible: [`повідомлення «${MESSAGE}»`] }, async () => {
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(WRONG_MESSAGE, { timeout: 5_000 });
    });
  },
);

test(
  "NC-2 (AC-CARD-16, текст «Тоді» у вимозі уточнено, тест і застосунок — ні)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-CARD-16" },
      { type: "case", description: "NC-2" },
      {
        type: "ac-text",
        description: `AC-CARD-16: Дано картки клієнта, на яку веде посилання, не існує. Коли scheduler1, а потім therapist1 відкриває це посилання. Тоді scheduler1 бачить повідомлення «${WRONG_MESSAGE}», therapist1 — «You don't have access to this client.», і жоден із них не бачить жодних даних клієнтів.`,
      },
    ],
  },
  async ({ page }) => {
    await given("картки клієнта, на яку веде посилання, не існує", async () => {
      await page.goto("/clients");
    });
    await when("scheduler1 відкриває це посилання", async () => {
      await page.goto(MISSING_CARD);
    });
    await thenStep(page, { clause: CLAUSE, visible: [`повідомлення «${MESSAGE}»`] }, async () => {
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(MESSAGE);
    });
  },
);
