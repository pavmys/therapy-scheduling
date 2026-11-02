// UAT зрізу 2 «Картка клієнта» (Sofiia-pm/therapy-scheduling-spec#19): 3 AC з docs/qa/proof-pack.md.
// Усі три лише читають: відмова й повідомлення під роллю, без входу — сторінка входу. Безпечно на спільному проді.
// Тексти в твердженнях — дослівно з вимог PM (requirements/19-…), а не з коду сторінок.
import { expect } from "@playwright/test";
import { cardText, clientCard, clientCardCount, expectLoginOnly, test, visibleEmails } from "./support/clients";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

const THERAPIST1 = "therapist1@example.test";
const SCHEDULER1 = "scheduler1@example.test";
const CLIENT6 = "client6@example.test";
// Картки з таким id немає: UUID v4 з нулями, такий база сама не видає (gen_random_uuid — випадкові біти).
const MISSING_CARD = "/clients/00000000-0000-4000-8000-000000000016";
const NO_DATA = "жодних даних клієнтів чи утримань на сторінці немає";
const LOGIN_PAGE = "сторінка входу (заголовок «Вхід», поля Email і Пароль)";

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test.describe("терапевт", () => {
  test.use({ storageState: "playwright/.auth/therapist.json" });

  test(
    "AC-CARD-06: терапевт за прямим посиланням на нову картку бачить лише відмову, кількість карток не змінилась",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-CARD-06" } },
    async ({ page, schedulerPage }) => {
      let before = 0;
      await given("therapist1 увійшов у застосунок", async () => {
        await page.goto("/");
        await expect(page.locator("header").getByText(THERAPIST1, { exact: true })).toBeVisible();
        before = await clientCardCount(schedulerPage);
      });

      await when("він відкриває форму нової картки клієнта за прямим посиланням", async () => {
        await page.goto("/clients/new");
      });

      await thenStep(
        page,
        {
          clause:
            "форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася",
          visible: [
            "повідомлення «Only schedulers and admins can create client cards.»",
            "форми нової картки клієнта (полів анкети й кнопки створення) на сторінці немає",
          ],
          hidden: [
            "відмову показано одразу під час відкриття сторінки, без надсилання форми",
            "кількість карток клієнтів у списку scheduler1 до і після — однакова",
          ],
        },
        async () => {
          await expect(page).toHaveURL((url) => url.pathname === "/clients/new");
          await expect(page.getByRole("main").getByRole("alert")).toHaveText(
            "Only schedulers and admins can create client cards.",
          );
          await expect(page.getByRole("main").getByRole("textbox")).toHaveCount(0);
          await expect(page.getByRole("button", { name: /create/i })).toHaveCount(0);
          expect(await clientCardCount(schedulerPage)).toBe(before);
        },
      );
    },
  );
});

test.describe("планувальник, потім терапевт", () => {
  test.use({ storageState: "playwright/.auth/scheduler.json" });

  test(
    "AC-CARD-16: посилання на картку, якої немає — scheduler1 бачить «This client card doesn't exist.», therapist1 — «You don't have access to this client.»",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-CARD-16" } },
    async ({ page, therapistPage }) => {
      await given("картки клієнта, на яку веде посилання, не існує", async () => {
        await page.goto("/clients");
        await expect(page.locator("header").getByText(SCHEDULER1, { exact: true })).toBeVisible();
      });

      await when("scheduler1 відкриває це посилання", async () => {
        await page.goto(MISSING_CARD);
      });

      await thenStep(
        page,
        {
          clause: "scheduler1 бачить повідомлення «This client card doesn't exist.»",
          visible: ["повідомлення «This client card doesn't exist.»", "жодних даних клієнта (полів картки) на сторінці немає"],
          hidden: ["на сторінці немає жодного email, крім власного scheduler1@example.test"],
        },
        async () => {
          await expect(page.getByRole("main").getByRole("alert")).toHaveText("This client card doesn't exist.");
          await expect(page.getByTestId("client-card")).toHaveCount(0);
          expect(await visibleEmails(page)).toEqual([SCHEDULER1]);
        },
      );

      await when("потім therapist1 відкриває це посилання", async () => {
        await therapistPage.goto(MISSING_CARD);
      });

      await thenStep(
        therapistPage,
        {
          clause: "therapist1 — «You don't have access to this client.», і жоден із них не бачить жодних даних клієнтів",
          visible: ["повідомлення «You don't have access to this client.»", "жодних даних клієнта (полів картки) на сторінці немає"],
          hidden: ["на сторінці немає жодного email, крім власного therapist1@example.test"],
        },
        async () => {
          await expect(therapistPage.locator("header").getByText(THERAPIST1, { exact: true })).toBeVisible();
          await expect(therapistPage.getByRole("main").getByRole("alert")).toHaveText(
            "You don't have access to this client.",
          );
          await expect(therapistPage.getByTestId("client-card")).toHaveCount(0);
          expect(await visibleEmails(therapistPage)).toEqual([THERAPIST1]);
        },
      );
    },
  );
});

test.describe("без входу", () => {
  test(
    "AC-CARD-07: без входу за прямим посиланням на клієнтів, картку client6 чи утримання — лише сторінка входу",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-CARD-07" } },
    async ({ page, schedulerPage }) => {
      let card = { path: "", text: "" };
      let before = 0;
      await given("користувач не увійшов у застосунок", async () => {
        // Адресу картки client6 і її вміст бере планувальник в окремому контексті; у page сесії немає.
        card = await clientCard(schedulerPage, CLIENT6);
        before = await clientCardCount(schedulerPage);
        expect((await page.context().cookies()).filter((c) => c.name.startsWith("sb-"))).toEqual([]);
      });

      await when("він відкриває за прямим посиланням список клієнтів", async () => {
        await page.goto("/clients");
      });
      await thenStep(
        page,
        {
          clause: "він бачить лише сторінку входу, жодних даних клієнтів чи утримань не показано",
          visible: [LOGIN_PAGE, NO_DATA],
          hidden: ["адреса сторінки — /login"],
        },
        () => expectLoginOnly(page),
      );

      await when("він відкриває за прямим посиланням картку client6", async () => {
        await page.goto(card.path);
      });
      await thenStep(
        page,
        {
          clause: "він бачить лише сторінку входу, жодних даних клієнтів чи утримань не показано",
          visible: [LOGIN_PAGE, NO_DATA],
          hidden: ["адреса сторінки — /login"],
        },
        () => expectLoginOnly(page),
      );

      await when("він відкриває за прямим посиланням список утримань", async () => {
        await page.goto("/holds");
      });
      await thenStep(
        page,
        {
          clause:
            "він бачить лише сторінку входу, жодних даних клієнтів чи утримань не показано, і жодна картка не змінилася",
          visible: [LOGIN_PAGE, NO_DATA],
          hidden: [
            "адреса сторінки — /login",
            "картка client6 і кількість карток у списку scheduler1 — такі самі, як до спроб",
          ],
        },
        async () => {
          await expectLoginOnly(page);
          expect(await cardText(schedulerPage, card.path)).toBe(card.text);
          expect(await clientCardCount(schedulerPage)).toBe(before);
        },
      );
    },
  );
});
