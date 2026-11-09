// UAT зрізу 3 «Статус перевірки страхування» (вимога PM #33): AC-INS-01…06, по одному тесту на AC.
// Тексти в твердженнях — дослівно з вимог PM (requirements/33-…), а не з коду сторінок.
//
// Прогін — на СПІЛЬНІЙ продовій базі й неодноразово, а повернути статус «Not set» база не дозволяє. Тому картки
// client6 і client7 із сиду НЕ змінюємо: кожен тест створює власну синтетичну картку з email uatEmail(…) — вона й
// стоїть замість client6 / client7 («Припущення» PM: «Дані в «Дано» — приклади для тестів: тести створюють їх самі»).
// Стан із «Дано» (статус, «свій клієнт» therapist1) задаємо секретним ключем (tests/e2e/support/admin.ts), тож УСІ
// шість тестів — @writes. Прибирання: afterEach видаляє картку тесту з її утриманнями й слотом (deleteUatUsers з
// email картки), а teardown cleanup.teardown.ts — усі картки uat-…@example.test і слоти UAT, що могли лишитись.
import { expect, type Page } from "@playwright/test";
import {
  createUatCard,
  deleteUatUsers,
  insuranceStatusOf,
  makeOwnClient,
  setInsuranceStatusDirectly,
  uatEmail,
  type InsuranceStatus,
} from "./support/admin";
import { expectLoginOnly, signInAs, test } from "./support/clients";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

const ADMIN1 = "admin1@example.test";
const SCHEDULER1 = "scheduler1@example.test";
const SCHEDULER2 = "scheduler2@example.test";
const THERAPIST1 = "therapist1@example.test";

/** Email карток, створених поточним тестом: afterEach їх прибирає, навіть якщо тест упав. */
const createdCards: string[] = [];

/** Синтетична картка замість client6 / client7: email uat-<прогін>-<суфікс>@example.test. Повертає адресу картки. */
async function standInCard(suffix: string, standsFor: string, status?: InsuranceStatus) {
  const email = uatEmail(suffix);
  createdCards.push(email);
  const id = await createUatCard(email, `UAT ${standsFor} (${suffix})`, status);
  return { id, path: `/clients/${id}` };
}

const insuranceLine = (page: Page) => page.getByTestId("insurance-status");
const insuranceForm = (page: Page) => page.getByTestId("insurance-form");
const headerEmail = (page: Page, email: string) => page.locator("header").getByText(email, { exact: true });

/** Позначити статус у формі картки, як це робить працівник: вибрати у списку «Insurance status» і зберегти. */
async function markInsurance(page: Page, label: string) {
  await page.getByLabel("Insurance status").selectOption({ label });
  await page.getByRole("button", { name: "Save insurance status" }).click();
}

/** Access token сесії з cookie @supabase/ssr контексту сторінки (sb-<ref>-auth-token[.N], «base64-» + base64url JSON). */
function accessTokenOf(cookies: { name: string; value: string }[]): string {
  const chunk = (name: string) => Number(name.match(/\.(\d+)$/)?.[1] ?? -1);
  const raw = cookies
    .filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => chunk(a.name) - chunk(b.name))
    .map((c) => c.value)
    .join("");
  const json = raw.startsWith("base64-") ? Buffer.from(raw.slice("base64-".length), "base64url").toString("utf8") : raw;
  const token = (JSON.parse(json) as { access_token?: string }).access_token;
  if (!token) throw new Error("у cookie сесії немає access_token");
  return token;
}

/**
 * Прямий запит до Supabase REST (PostgREST) з сесією користувача сторінки — повз сторінки й Server Actions застосунку.
 * Спершу GET тим самим токеном: терапевт бачить свою картку з очікуваним статусом — отже, токен справжній, і
 * «нічого не змінилося» нижче означає відмову бази, а не 401 від простроченої сесії. Потім PATCH insurance_status.
 * Повертає HTTP-статус PATCH і рядки, які база змінила (для 4xx — жодного).
 */
async function directInsuranceUpdate(page: Page, clientId: string, expectedBefore: InsuranceStatus, next: InsuranceStatus) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Для прямого запиту потрібні NEXT_PUBLIC_SUPABASE_URL і NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const endpoint = `${url.replace(/\/+$/, "")}/rest/v1/clients?id=eq.${clientId}`;
  const headers = { apikey: key, Authorization: `Bearer ${accessTokenOf(await page.context().cookies())}` };

  const seen = await page.request.get(`${endpoint}&select=insurance_status`, { headers });
  expect(seen.status(), "GET тим самим токеном — сесія терапевта дійсна").toBe(200);
  expect(await seen.json(), "терапевт бачить свою картку").toEqual([{ insurance_status: expectedBefore }]);

  const res = await page.request.patch(endpoint, {
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    data: { insurance_status: next },
  });
  const rows: unknown[] = res.ok() ? await res.json() : [];
  return { status: res.status(), rows };
}

// Спершу помилки сторінки, потім прибирання: картку тесту з утриманнями й слотом видаляємо й тоді, коли тест упав.
test.afterEach(async ({ page }) => {
  await attachRuntimeErrors(page);
  for (const email of createdCards.splice(0)) {
    const result = await deleteUatUsers(email);
    expect(result.remaining, `картка ${email} лишилась після прибирання`).toEqual([]);
    expect(result.leftoverRequests, `лишились утримання чи слоти картки ${email}`).toBe(0);
  }
});

test.describe("планувальник", () => {
  test.use({ storageState: "playwright/.auth/scheduler.json" });

  test(
    "AC-INS-01: нова картка, статус страхування ще ніхто не позначав — scheduler1 бачить «Insurance: Not set»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-01" } },
    async ({ page }) => {
      let card = { id: "", path: "" };
      await given("картку client6 створено, і статус перевірки страхування ще ніхто не позначав", async () => {
        // Без статусу при створенні — як у застосунку: значення дає default бази.
        card = await standInCard("ins01", "client6");
        expect(await insuranceStatusOf(card.id)).toBe("not_set");
      });

      await when("scheduler1 відкриває картку client6", async () => {
        await page.goto(card.path);
      });

      await thenStep(
        page,
        {
          clause: "в картці показано «Insurance: Not set»",
          visible: ["у картці клієнта — рядок «Insurance: Not set»", "у шапці — scheduler1@example.test"],
          hidden: ["картка — синтетична uat-…@example.test замість client6 (тест створив її сам)", "у базі статус картки — not_set"],
        },
        async () => {
          await expect(headerEmail(page, SCHEDULER1)).toBeVisible();
          await expect(insuranceLine(page)).toHaveText("Insurance: Not set");
          expect(await insuranceStatusOf(card.id)).toBe("not_set");
        },
      );
    },
  );

  test(
    "AC-INS-02: scheduler1 позначає «Verified» — бачить «Insurance status saved.», картка показує «Insurance: Verified» і після повторного відкриття",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-02" } },
    async ({ page }) => {
      let card = { id: "", path: "" };
      await given("картка client6 показує «Insurance: Not set»", async () => {
        card = await standInCard("ins02", "client6");
        await page.goto(card.path);
        await expect(insuranceLine(page)).toHaveText("Insurance: Not set");
      });

      await when("scheduler1 позначає статус перевірки страхування «Verified»", async () => {
        await markInsurance(page, "Verified");
      });

      await thenStep(
        page,
        {
          clause: "scheduler1 бачить повідомлення «Insurance status saved.», а картка client6 показує «Insurance: Verified»",
          visible: [
            "повідомлення «Insurance status saved.»",
            "у картці клієнта — рядок «Insurance: Verified»",
            "поле «Insurance status» показує збережене значення «Verified», а не «Select a status…»",
            "у шапці — scheduler1@example.test",
          ],
          hidden: ["у базі статус картки — verified"],
        },
        async () => {
          await expect(headerEmail(page, SCHEDULER1)).toBeVisible();
          await expect(insuranceForm(page).getByRole("status")).toHaveText("Insurance status saved.");
          await expect(insuranceLine(page)).toHaveText("Insurance: Verified");
          // Після дії React скидає форму; поле має лишитись на збереженому значенні (рев'ю PR #48).
          await expect(page.locator("#insurance_status")).toHaveValue("verified");
          expect(await insuranceStatusOf(card.id)).toBe("verified");
        },
      );

      await when("scheduler1 відкриває картку client6 знову", async () => {
        await page.goto(card.path);
      });

      await thenStep(
        page,
        {
          clause: "картка client6 показує «Insurance: Verified» і після того, як scheduler1 відкриє її знову",
          visible: ["у картці клієнта — рядок «Insurance: Verified»", "у шапці — scheduler1@example.test"],
          hidden: ["сторінку картки відкрито заново (новий перехід за адресою картки), повідомлення про збереження вже немає"],
        },
        async () => {
          await expect(headerEmail(page, SCHEDULER1)).toBeVisible();
          await expect(insuranceForm(page).getByRole("status")).toHaveCount(0);
          await expect(insuranceLine(page)).toHaveText("Insurance: Verified");
        },
      );
    },
  );
});

test.describe("адміністратор, потім інший планувальник", () => {
  test(
    "AC-INS-03: admin1 змінює статус на «Private pay» — і admin1, і scheduler2 бачать «Insurance: Private pay»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-03" } },
    async ({ page, scheduler2Page }) => {
      let card = { id: "", path: "" };
      await given("картка client7 показує «Insurance: Verified»", async () => {
        card = await standInCard("ins03", "client7", "verified");
        // admin1 немає в auth.setup.ts: входить через signInAs (пароль лише в Node, не в записаному браузері).
        await signInAs(page, ADMIN1, "admin");
        await page.goto(card.path);
        await expect(headerEmail(page, ADMIN1)).toBeVisible();
        await expect(insuranceLine(page)).toHaveText("Insurance: Verified");
      });

      await when("admin1 змінює статус перевірки страхування на «Private pay»", async () => {
        await markInsurance(page, "Private pay");
        // Збереження завершилось, перш ніж scheduler2 відкриє картку.
        await expect(insuranceForm(page).getByRole("status")).toHaveText("Insurance status saved.");
      });

      await when("а потім scheduler2 відкриває картку client7", async () => {
        await scheduler2Page.goto(card.path);
      });

      await thenStep(
        page,
        {
          clause: "і admin1, і scheduler2 бачать у картці «Insurance: Private pay»",
          visible: ["у картці клієнта — рядок «Insurance: Private pay»", "у шапці — admin1@example.test"],
          hidden: ["картка — синтетична uat-…@example.test замість client7 (тест створив її сам)"],
        },
        async () => {
          await expect(headerEmail(page, ADMIN1)).toBeVisible();
          await expect(insuranceLine(page)).toHaveText("Insurance: Private pay");
        },
      );

      await thenStep(
        scheduler2Page,
        {
          clause: "і admin1, і scheduler2 бачать у картці «Insurance: Private pay»",
          visible: ["у картці клієнта — рядок «Insurance: Private pay»", "у шапці — scheduler2@example.test"],
          hidden: ["у базі статус картки — private_pay"],
        },
        async () => {
          await expect(headerEmail(scheduler2Page, SCHEDULER2)).toBeVisible();
          await expect(insuranceLine(scheduler2Page)).toHaveText("Insurance: Private pay");
          expect(await insuranceStatusOf(card.id)).toBe("private_pay");
        },
      );
    },
  );
});

test.describe("терапевт", () => {
  test.use({ storageState: "playwright/.auth/therapist.json" });

  test(
    "AC-INS-04: therapist1 відкриває картку свого клієнта — бачить «Insurance: Not accepted», змінити статус не запропоновано",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-04" } },
    async ({ page }) => {
      let card = { id: "", path: "" };
      await given("client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted»", async () => {
        card = await standInCard("ins04", "client6");
        // «Свій клієнт» — утримання «Held» у слоті therapist1 (private.is_own_client); слот і утримання — синтетичні.
        await makeOwnClient(card.id, THERAPIST1);
        await setInsuranceStatusDirectly(card.id, "not_accepted");
      });

      await when("therapist1 відкриває картку client6", async () => {
        await page.goto(card.path);
      });

      await thenStep(
        page,
        {
          clause: "він бачить «Insurance: Not accepted», а змінити статус перевірки страхування в картці йому не запропоновано",
          visible: [
            "у картці клієнта — рядок «Insurance: Not accepted»",
            "у картці немає списку «Insurance status» і кнопки «Save insurance status»",
            "у шапці — therapist1@example.test",
          ],
          hidden: ["на сторінці немає форми статусу страхування й жодного поля вибору"],
        },
        async () => {
          await expect(headerEmail(page, THERAPIST1)).toBeVisible();
          await expect(insuranceLine(page)).toHaveText("Insurance: Not accepted");
          await expect(insuranceForm(page)).toHaveCount(0);
          await expect(page.getByLabel("Insurance status")).toHaveCount(0);
          await expect(page.getByRole("combobox")).toHaveCount(0);
          await expect(page.getByRole("button", { name: /insurance/i })).toHaveCount(0);
        },
      );
    },
  );

  test(
    "AC-INS-05: therapist1 напряму (Supabase REST) пробує змінити статус на «Verified» — статус не змінився, scheduler1 бачить «Insurance: Not accepted»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-05" } },
    async ({ page, schedulerPage }) => {
      let card = { id: "", path: "" };
      let attempt = { status: 0, rows: [] as unknown[] };
      await given("client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted»", async () => {
        card = await standInCard("ins05", "client6");
        await makeOwnClient(card.id, THERAPIST1);
        await setInsuranceStatusDirectly(card.id, "not_accepted");
        await page.goto(card.path);
        await expect(insuranceLine(page)).toHaveText("Insurance: Not accepted");
      });

      await when(
        "therapist1 напряму, оминаючи сторінки застосунку, пробує змінити статус перевірки страхування client6 на «Verified»",
        async () => {
          // PATCH /rest/v1/clients із сесією therapist1 з його ж браузерного контексту — без сторінок і Server Actions.
          attempt = await directInsuranceUpdate(page, card.id, "not_accepted", "verified");
        },
      );

      await when("scheduler1 відкриває картку client6", async () => {
        await schedulerPage.goto(card.path);
      });

      await thenStep(
        schedulerPage,
        {
          clause: "статус не змінився: scheduler1 у картці client6 бачить «Insurance: Not accepted»",
          visible: ["у картці клієнта — рядок «Insurance: Not accepted»", "у шапці — scheduler1@example.test"],
          hidden: [
            "прямий PATCH therapist1 не змінив жодного рядка (відповідь без рядків або відмова 4xx)",
            "у базі статус картки — not_accepted",
          ],
        },
        async () => {
          expect(attempt.status, "прямий запит не впав на сервері").toBeLessThan(500);
          expect(attempt.rows, "база не змінила жодного рядка").toEqual([]);
          expect(await insuranceStatusOf(card.id)).toBe("not_accepted");
          await expect(headerEmail(schedulerPage, SCHEDULER1)).toBeVisible();
          await expect(insuranceLine(schedulerPage)).toHaveText("Insurance: Not accepted");
        },
      );
    },
  );
});

test.describe("без входу", () => {
  test(
    "AC-INS-06: без входу за прямим посиланням на картку — лише сторінка входу, scheduler1 після цього бачить «Insurance: Verified»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-06" } },
    async ({ page, schedulerPage }) => {
      let card = { id: "", path: "" };
      await given("користувач не увійшов у застосунок, а картка client6 показує «Insurance: Verified»", async () => {
        card = await standInCard("ins06", "client6", "verified");
        expect((await page.context().cookies()).filter((c) => c.name.startsWith("sb-"))).toEqual([]);
      });

      await when("він відкриває картку client6 за прямим посиланням", async () => {
        await page.goto(card.path);
      });

      await thenStep(
        page,
        {
          clause: "він бачить лише сторінку входу, статусу страхування й інших даних client6 не показано",
          visible: [
            "сторінка входу (заголовок «Вхід», поля Email і Пароль)",
            "рядка «Insurance: …» і жодних даних клієнта на сторінці немає",
          ],
          hidden: ["адреса сторінки — /login", "на сторінці немає жодного email @example.test"],
        },
        async () => {
          await expectLoginOnly(page);
          await expect(insuranceLine(page)).toHaveCount(0);
          await expect(page.getByText(/Insurance:/)).toHaveCount(0);
        },
      );

      await when("scheduler1 після цього відкриває картку client6", async () => {
        await schedulerPage.goto(card.path);
      });

      await thenStep(
        schedulerPage,
        {
          clause: "scheduler1 після цього бачить у картці client6 «Insurance: Verified»",
          visible: ["у картці клієнта — рядок «Insurance: Verified»", "у шапці — scheduler1@example.test"],
          hidden: ["у базі статус картки — verified"],
        },
        async () => {
          await expect(headerEmail(schedulerPage, SCHEDULER1)).toBeVisible();
          await expect(insuranceLine(schedulerPage)).toHaveText("Insurance: Verified");
          expect(await insuranceStatusOf(card.id)).toBe("verified");
        },
      );
    },
  );
});
