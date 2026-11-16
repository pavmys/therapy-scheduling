// UAT зрізу 5 «Документи згоди клієнта» (вимога PM HryhoriiHaponiukQuitCode/therapy-scheduling-spec#34): AC-DOC-01…11,
// по одному тесту на AC. Тексти в твердженнях — дослівно з вимог PM (requirements/34-…), а не з коду сторінок.
//
// Прогін — на СПІЛЬНІЙ продовій базі й неодноразово, а скасувати «Signed» чи сформувати документи вдруге база не
// дозволяє. Тому картки client6 / client7 / client9 із сиду НЕ змінюємо: кожен тест створює власну синтетичну картку
// (email дорослого або опікуна — uatEmail(…)) замість них («Припущення» PM: дані в «Дано» — приклади для тестів, тести
// створюють їх самі). Стан із «Дано» (документи, підписи, «свій клієнт» терапевта) задаємо секретним ключем
// (tests/e2e/support/admin.ts), тож усі тести — @writes. Прибирання: afterEach видаляє картку тесту з її утриманнями,
// слотом і документами (каскад), а teardown cleanup.teardown.ts — усі картки uat-…@example.test, що могли лишитись.
import { expect, type Page } from "@playwright/test";
import {
  consentDocumentsOf,
  createUatCard,
  createUatChildCard,
  deleteUatUsers,
  holdStateOf,
  makeOwnClient,
  prepareConsentDirectly,
  signConsentDirectly,
  uatEmail,
} from "./support/admin";
import { expectLoginOnly, test } from "./support/clients";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

const SCHEDULER1 = "scheduler1@example.test";
const SCHEDULER2 = "scheduler2@example.test";
const THERAPIST1 = "therapist1@example.test";

// Тексти — дослівно з AC PM.
const TREATMENT = "Consent to treatment";
const CANCELLATION = "Cancellation policy acknowledgement";
const RELEASE = "Release of information";
const NO_DOCUMENTS = "No consent documents yet.";
const ALL_SIGNED = "All consent documents signed.";
const SIGN_ALL_FIRST = "Sign all consent documents before confirming.";
const ONLY_STAFF_SIGN = "Only schedulers and admins can mark documents as signed.";
const NO_ACCESS = "You don't have access to this client.";
const SIGNED = /^Signed \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/** Email карток, створених поточним тестом: afterEach їх прибирає, навіть якщо тест упав. */
const createdCards: string[] = [];

async function adultCard(suffix: string, standsFor: string) {
  const email = uatEmail(suffix);
  createdCards.push(email);
  const id = await createUatCard(email, `UAT ${standsFor} (${suffix})`);
  return { id, name: `UAT ${standsFor} (${suffix})`, path: `/clients/${id}` };
}

async function childCard(suffix: string, standsFor: string, guardian: string) {
  const email = uatEmail(suffix);
  createdCards.push(email);
  const name = `UAT ${standsFor} (${suffix})`;
  const id = await createUatChildCard(email, name, guardian);
  return { id, name, path: `/clients/${id}` };
}

const docPath = (cardPath: string, slug: string) => `${cardPath}/consent/${slug}`;
const consentRows = (page: Page) => page.getByTestId("consent-list").locator("tbody tr");
const consentRow = (page: Page, title: string) => consentRows(page).filter({ hasText: title });
const summary = (page: Page) => page.getByTestId("consent-summary");
const headerEmail = (page: Page, email: string) => page.locator("header").getByText(email, { exact: true });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());

/** Дата й час у поясі практики (як показує застосунок): «РРРР-ММ-ДД ГГ:ХХ». */
function practiceDateTime(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// Спершу помилки сторінки, потім прибирання: картку тесту з утриманнями, слотом і документами видаляємо й тоді,
// коли тест упав.
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
    "AC-DOC-01: картка client6 без документів згоди — «No consent documents yet.» і жодного документа",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOC-01" } },
    async ({ page }) => {
      let card = { id: "", name: "", path: "" };
      await given("картку client6 (тип «Adult») створено, і документів згоди для неї ще не формували", async () => {
        card = await adultCard("doc01", "client6");
        expect(await consentDocumentsOf(card.id)).toEqual([]);
      });

      await when("scheduler1 відкриває картку client6", async () => {
        await page.goto(card.path);
      });

      await thenStep(
        page,
        {
          clause: "в картці показано повідомлення «No consent documents yet.» і жодного документа",
          visible: ["у блоці «Consent documents» — «No consent documents yet.»", "жодного документа в блоці немає"],
          hidden: ["у базі документів згоди картки немає"],
        },
        async () => {
          await expect(headerEmail(page, SCHEDULER1)).toBeVisible();
          await expect(summary(page)).toHaveText(NO_DOCUMENTS);
          await expect(page.getByTestId("consent-list")).toHaveCount(0);
          expect(await consentDocumentsOf(card.id)).toEqual([]);
        },
      );
    },
  );

  test(
    "AC-DOC-02: scheduler1 формує документи для дорослого client6 — рівно два «Not signed» і «Missing signatures: …»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOC-02" } },
    async ({ page }) => {
      let card = { id: "", name: "", path: "" };
      await given("для client6 (тип «Adult») документів згоди ще немає", async () => {
        card = await adultCard("doc02", "client6");
        await page.goto(card.path);
        await expect(summary(page)).toHaveText(NO_DOCUMENTS);
      });

      await when("scheduler1 формує документи згоди для client6", async () => {
        await page.getByRole("button", { name: "Prepare consent documents" }).click();
      });

      await thenStep(
        page,
        {
          clause: `в картці client6 показано рівно два документи — «${TREATMENT}» і «${CANCELLATION}», кожен зі станом «Not signed», і рядок «Missing signatures: ${TREATMENT}, ${CANCELLATION}»`,
          visible: [
            `рядки «${TREATMENT} — Not signed» і «${CANCELLATION} — Not signed»`,
            `рядок «Missing signatures: ${TREATMENT}, ${CANCELLATION}»`,
          ],
          hidden: ["у базі в картки рівно два документи, обидва без підпису"],
        },
        async () => {
          await expect(consentRows(page)).toHaveCount(2);
          await expect(consentRows(page).nth(0)).toContainText(TREATMENT);
          await expect(consentRows(page).nth(1)).toContainText(CANCELLATION);
          for (const title of [TREATMENT, CANCELLATION]) await expect(consentRow(page, title)).toContainText("Not signed");
          await expect(summary(page)).toHaveText(`Missing signatures: ${TREATMENT}, ${CANCELLATION}`);
          expect(await consentDocumentsOf(card.id)).toEqual([
            { kind: "cancellation_policy", signed_at: null },
            { kind: "consent_to_treatment", signed_at: null },
          ]);
        },
      );
    },
  );

  test(
    "AC-DOC-03: scheduler1 формує документи для дитини client7 з опікуном — рівно три «Not signed»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOC-03" } },
    async ({ page }) => {
      let card = { id: "", name: "", path: "" };
      await given("для client7 (тип «Child», опікун «Guardian Seven») документів згоди ще немає", async () => {
        card = await childCard("doc03", "client7", "UAT Guardian Seven");
        await page.goto(card.path);
        await expect(summary(page)).toHaveText(NO_DOCUMENTS);
      });

      await when("scheduler1 формує документи згоди для client7", async () => {
        await page.getByRole("button", { name: "Prepare consent documents" }).click();
      });

      await thenStep(
        page,
        {
          clause: `в картці client7 показано рівно три документи — «${TREATMENT}», «${CANCELLATION}» і «${RELEASE}», кожен зі станом «Not signed»`,
          visible: [`рядки «${TREATMENT}», «${CANCELLATION}», «${RELEASE}», кожен — «Not signed»`],
          hidden: ["у базі в картки рівно три документи, усі без підпису"],
        },
        async () => {
          await expect(consentRows(page)).toHaveCount(3);
          for (const [i, title] of [TREATMENT, CANCELLATION, RELEASE].entries()) {
            await expect(consentRows(page).nth(i)).toContainText(title);
            await expect(consentRows(page).nth(i)).toContainText("Not signed");
          }
          const docs = await consentDocumentsOf(card.id);
          expect(docs.map((d) => d.kind)).toEqual(["cancellation_policy", "consent_to_treatment", "release_of_information"]);
          expect(docs.every((d) => d.signed_at === null)).toBe(true);
        },
      );
    },
  );

  test(
    "AC-DOC-04: scheduler1 відкриває «Release of information» client7 — заголовок, Client, Guardian, Prepared",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOC-04" } },
    async ({ page }) => {
      let card = { id: "", name: "", path: "" };
      const guardian = "UAT Guardian Seven";
      await given(
        "scheduler1 сформував документи згоди для client7 (тип «Child», ім'я «Client Seven», опікун «Guardian Seven») 2026-11-04",
        async () => {
          card = await childCard("doc04", "Client Seven", guardian);
          await prepareConsentDirectly(card.id, "2026-11-04");
        },
      );

      await when(`scheduler1 відкриває документ «${RELEASE}» client7`, async () => {
        await page.goto(docPath(card.path, "release-of-information"));
      });

      await thenStep(
        page,
        {
          clause: `він бачить документ англійською із заголовком «${RELEASE}», рядками «Client: Client Seven», «Guardian: Guardian Seven» і «Prepared: 2026-11-04»`,
          visible: [
            `заголовок сторінки «${RELEASE}»`,
            `рядки «Client: ${card.name}», «Guardian: ${guardian}», «Prepared: 2026-11-04»`,
            "текст згоди англійською",
          ],
          hidden: ["ім'я клієнта й опікуна — синтетичні замість «Client Seven» і «Guardian Seven» (картку створює тест)"],
        },
        async () => {
          await expect(page.getByRole("heading", { level: 1, name: RELEASE })).toBeVisible();
          const doc = page.getByTestId("consent-document");
          await expect(doc.getByText(`Client: ${card.name}`, { exact: true })).toBeVisible();
          await expect(doc.getByText(`Guardian: ${guardian}`, { exact: true })).toBeVisible();
          await expect(doc.getByText("Prepared: 2026-11-04", { exact: true })).toBeVisible();
        },
      );
    },
  );

  test(
    "AC-DOC-05: scheduler1 позначає «Consent to treatment» підписаним — «Signed …» і «Missing signatures: Cancellation policy acknowledgement»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOC-05" } },
    async ({ page }) => {
      let card = { id: "", name: "", path: "" };
      await given("обидва документи згоди client6 мають стан «Not signed»", async () => {
        card = await adultCard("doc05", "client6");
        await prepareConsentDirectly(card.id, today());
        await page.goto(card.path);
        await expect(consentRows(page)).toHaveCount(2);
      });

      await when(`scheduler1 позначає «${TREATMENT}» підписаним`, async () => {
        await page.getByRole("button", { name: `Mark ${TREATMENT} as signed` }).click();
      });

      await thenStep(
        page,
        {
          // «Тоді» — дослівно з AC. Дата й час «2026-11-04 10:15» — приклад PM («Дано» — приклади для тестів): тест
          // позначає документ зараз, тож на кадрі — дата й час цієї позначки; що це саме момент позначки, доводять
          // приховані перевірки нижче, а не кадр.
          clause: `«${TREATMENT}» показано зі станом «Signed 2026-11-04 10:15», а рядок у картці — «Missing signatures: ${CANCELLATION}»`,
          visible: [
            `рядок «${TREATMENT}» зі станом «Signed РРРР-ММ-ДД ГГ:ХХ» — дата й час позначки в цьому прогоні замість прикладу PM 2026-11-04 10:15`,
            `рядок «${CANCELLATION}» — «Not signed»`,
            `рядок «Missing signatures: ${CANCELLATION}»`,
          ],
          hidden: [
            "показаний час дорівнює signed_at документа в базі (America/Los_Angeles, до хвилини)",
            "signed_at у базі — не раніше ніж за 5 хвилин до перевірки, тобто момент цієї позначки",
          ],
        },
        async () => {
          await expect(consentRow(page, TREATMENT).getByText(SIGNED)).toBeVisible();
          await expect(consentRow(page, CANCELLATION)).toContainText("Not signed");
          await expect(summary(page)).toHaveText(`Missing signatures: ${CANCELLATION}`);
          const signed = (await consentDocumentsOf(card.id)).find((d) => d.kind === "consent_to_treatment")!;
          expect(Date.now() - Date.parse(signed.signed_at!)).toBeLessThan(5 * 60_000);
          const { date, time } = practiceDateTime(signed.signed_at!);
          await expect(consentRow(page, TREATMENT)).toContainText(`Signed ${date} ${time}`);
        },
      );
    },
  );

  test(
    "AC-DOC-06: scheduler2 позначає другий документ підписаним — обидва «Signed …», «All consent documents signed.»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOC-06" } },
    async ({ scheduler2Page }) => {
      let card = { id: "", name: "", path: "" };
      await given(`«${TREATMENT}» client6 має стан «Signed», а «${CANCELLATION}» — «Not signed»`, async () => {
        card = await adultCard("doc06", "client6");
        await prepareConsentDirectly(card.id, today());
        await signConsentDirectly(card.id, "consent_to_treatment", new Date(Date.now() - 60 * 60_000).toISOString());
      });

      await when(`scheduler2 позначає «${CANCELLATION}» підписаним`, async () => {
        await scheduler2Page.goto(card.path);
        await expect(headerEmail(scheduler2Page, SCHEDULER2)).toBeVisible();
        await scheduler2Page.getByRole("button", { name: `Mark ${CANCELLATION} as signed` }).click();
      });

      await thenStep(
        scheduler2Page,
        {
          clause: "обидва документи показано зі станом «Signed …», а замість рядка «Missing signatures» картка показує «All consent documents signed.»",
          visible: ["обидва рядки документів — «Signed <дата й час>»", "рядок «All consent documents signed.»"],
          hidden: ["у базі обидва документи підписано"],
        },
        async () => {
          for (const title of [TREATMENT, CANCELLATION]) {
            await expect(consentRow(scheduler2Page, title).getByText(SIGNED)).toBeVisible();
          }
          await expect(summary(scheduler2Page)).toHaveText(ALL_SIGNED);
          await expect(scheduler2Page.getByText(/Missing signatures/)).toHaveCount(0);
          expect((await consentDocumentsOf(card.id)).every((d) => d.signed_at !== null)).toBe(true);
        },
      );
    },
  );

  test(
    "AC-DOC-07: scheduler1 пробує підтвердити утримання client6 з непідписаним документом — «Sign all consent documents before confirming.», лишається «Held»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOC-07" } },
    async ({ page }) => {
      let card = { id: "", name: "", path: "" };
      let hold = { holdId: "", therapistId: "", slotStartsAt: "", expiresAt: "" };
      let heldUntil = "";
      await given(
        `client6 має утримання «Held» у therapist1, документи згоди сформовано, і «${CANCELLATION}» має стан «Not signed»`,
        async () => {
          card = await adultCard("doc07", "client6");
          hold = await makeOwnClient(card.id, THERAPIST1);
          await prepareConsentDirectly(card.id, today());
          await signConsentDirectly(card.id, "consent_to_treatment", new Date().toISOString());
          await page.goto("/holds");
          const row = page.getByTestId("hold-list").locator("tbody tr").filter({ hasText: card.name });
          await expect(row).toHaveAttribute("data-status", "held");
          heldUntil = (await row.getByText(/^Held until /).innerText()).trim();
        },
      );

      await when("scheduler1 пробує підтвердити це утримання", async () => {
        const row = page.getByTestId("hold-list").locator("tbody tr").filter({ hasText: card.name });
        await row.getByRole("button", { name: "Confirm" }).click();
      });

      await thenStep(
        page,
        {
          clause: `утримання не підтверджується, scheduler1 бачить повідомлення «${SIGN_ALL_FIRST}», а утримання лишається зі статусом «Held» і тим самим «Held until»`,
          visible: [`повідомлення «${SIGN_ALL_FIRST}»`, `рядок утримання client6 — «Held» і «${heldUntil}»`],
          hidden: ["у базі утримання не підтверджене, expires_at той самий"],
        },
        async () => {
          const row = page.getByTestId("hold-list").locator("tbody tr").filter({ hasText: card.name });
          // Результат підтвердження — одне повідомлення над таблицею утримань (confirm-form.tsx, ConfirmFeedback).
          await expect(page.getByTestId("confirm-result").getByRole("alert")).toHaveText(SIGN_ALL_FIRST);
          await expect(row).toHaveAttribute("data-status", "held");
          await expect(row.getByText(heldUntil, { exact: true })).toBeVisible();
          const state = await holdStateOf(hold.holdId);
          expect(state.confirmed_at).toBeNull();
          expect(Date.parse(state.expires_at)).toBe(Date.parse(hold.expiresAt));
        },
      );
    },
  );

  test(
    "AC-DOC-08: усі документи client6 підписано — scheduler1 підтверджує утримання, слот «Confirmed» без «Held until»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOC-08" } },
    async ({ page }) => {
      let card = { id: "", name: "", path: "" };
      let hold = { holdId: "", therapistId: "", slotStartsAt: "", expiresAt: "" };
      await given(
        "client6 має утримання «Held» у therapist1, утримання ще не прострочене й слот ще не почався, а всі документи згоди мають стан «Signed»",
        async () => {
          card = await adultCard("doc08", "client6");
          hold = await makeOwnClient(card.id, THERAPIST1);
          await prepareConsentDirectly(card.id, today());
          for (const kind of ["consent_to_treatment", "cancellation_policy"] as const) {
            await signConsentDirectly(card.id, kind, new Date().toISOString());
          }
          await page.goto("/holds");
        },
      );

      await when("scheduler1 підтверджує це утримання", async () => {
        const row = page.getByTestId("hold-list").locator("tbody tr").filter({ hasText: card.name });
        await row.getByRole("button", { name: "Confirm" }).click();
        // Підтверджене утримання — уже сеанс: список утримань його не показує (AC-HOLD-38).
        await expect(page.getByTestId("hold-list").locator("tbody tr").filter({ hasText: card.name })).toHaveCount(0);
      });

      await thenStep(
        page,
        {
          clause: "слот має статус «Confirmed», а «Held until» більше не показано",
          visible: ["слот therapist1 у списку слотів дня — «Confirmed»", "біля слоту немає «Held until»"],
          hidden: ["у базі утримання підтверджене (confirmed_at є)"],
        },
        async () => {
          const at = practiceDateTime(hold.slotStartsAt);
          await page.goto(`/slots?${new URLSearchParams({ therapist: hold.therapistId, date: at.date })}`);
          const slot = page.getByTestId("slot-list").locator("li").filter({ hasText: `${at.time}–` }).filter({ hasText: card.name });
          await expect(slot).toHaveAttribute("data-status", "confirmed");
          await expect(slot.getByText(/Held until/)).toHaveCount(0);
          expect((await holdStateOf(hold.holdId)).confirmed_at).not.toBeNull();
        },
      );
    },
  );
});

test.describe("терапевт", () => {
  test.use({ storageState: "playwright/.auth/therapist.json" });

  test(
    "AC-DOC-09: therapist1 відкриває «Consent to treatment» свого client6 — бачить «Not signed», позначити не може",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOC-09" } },
    async ({ page, schedulerPage }) => {
      let card = { id: "", name: "", path: "" };
      await given(`client6 — свій клієнт therapist1, і документ «${TREATMENT}» client6 має стан «Not signed»`, async () => {
        card = await adultCard("doc09", "client6");
        await makeOwnClient(card.id, THERAPIST1);
        await prepareConsentDirectly(card.id, today());
      });

      await when("therapist1 відкриває цей документ за прямим посиланням", async () => {
        await page.goto(docPath(card.path, "consent-to-treatment"));
      });

      await thenStep(
        page,
        {
          clause: `він бачить документ і стан «Not signed», позначити його підписаним йому не запропоновано — замість цього він бачить повідомлення «${ONLY_STAFF_SIGN}»`,
          visible: [`документ «${TREATMENT}» і стан «Not signed»`, `повідомлення «${ONLY_STAFF_SIGN}»`, "кнопки «Mark as signed» немає"],
          hidden: [],
        },
        async () => {
          await expect(headerEmail(page, THERAPIST1)).toBeVisible();
          await expect(page.getByRole("heading", { level: 1, name: TREATMENT })).toBeVisible();
          await expect(page.getByTestId("consent-state")).toHaveText("Not signed");
          await expect(page.getByTestId("consent-sign-forbidden")).toHaveText(ONLY_STAFF_SIGN);
          await expect(page.getByRole("button", { name: /Mark .* as signed/ })).toHaveCount(0);
        },
      );

      await thenStep(
        schedulerPage,
        {
          clause: "scheduler1 після цього бачить у документа той самий стан «Not signed»",
          visible: [`у scheduler1 документ «${TREATMENT}» — «Not signed»`],
          hidden: ["у базі документ не підписано"],
        },
        async () => {
          await schedulerPage.goto(docPath(card.path, "consent-to-treatment"));
          await expect(headerEmail(schedulerPage, SCHEDULER1)).toBeVisible();
          await expect(schedulerPage.getByTestId("consent-state")).toHaveText("Not signed");
          const doc = (await consentDocumentsOf(card.id)).find((d) => d.kind === "consent_to_treatment")!;
          expect(doc.signed_at).toBeNull();
        },
      );
    },
  );

  test(
    "AC-DOC-10: therapist1 відкриває документ client9 (свій лише для therapist2) — «You don't have access to this client.»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOC-10" } },
    async ({ page }) => {
      let card = { id: "", name: "", path: "" };
      await given("client9 — свій клієнт лише для therapist2, і для client9 сформовано документи згоди", async () => {
        card = await adultCard("doc10", "client9");
        await makeOwnClient(card.id, "therapist2@example.test");
        await prepareConsentDirectly(card.id, today());
      });

      await when(`therapist1 відкриває документ «${TREATMENT}» client9 за прямим посиланням`, async () => {
        await page.goto(docPath(card.path, "consent-to-treatment"));
      });

      await thenStep(
        page,
        {
          clause: `therapist1 бачить повідомлення «${NO_ACCESS}», жодного тексту документа чи даних client9 не показано, а стан документа не змінився`,
          visible: [`повідомлення «${NO_ACCESS}»`, "жодного тексту документа й даних клієнта"],
          hidden: ["у базі документи client9 не підписано"],
        },
        async () => {
          await expect(headerEmail(page, THERAPIST1)).toBeVisible();
          await expect(page.getByRole("main").getByRole("alert")).toHaveText(NO_ACCESS);
          await expect(page.getByTestId("consent-document")).toHaveCount(0);
          await expect(page.getByText(card.name)).toHaveCount(0);
          await expect(page.getByText(/^Client: /)).toHaveCount(0);
          expect((await consentDocumentsOf(card.id)).every((d) => d.signed_at === null)).toBe(true);
        },
      );
    },
  );
});

test.describe("без входу", () => {
  test(
    "AC-DOC-11: без входу за прямим посиланням на «Consent to treatment» client6 — лише сторінка входу",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOC-11" } },
    async ({ page }) => {
      let card = { id: "", name: "", path: "" };
      await given("користувач не увійшов у застосунок, а для client6 сформовано документи згоди", async () => {
        card = await adultCard("doc11", "client6");
        await prepareConsentDirectly(card.id, today());
        expect((await page.context().cookies()).filter((c) => c.name.startsWith("sb-"))).toEqual([]);
      });

      await when(`він відкриває документ «${TREATMENT}» client6 за прямим посиланням`, async () => {
        await page.goto(docPath(card.path, "consent-to-treatment"));
      });

      await thenStep(
        page,
        {
          clause: "він бачить лише сторінку входу, тексту документа й даних client6 не показано, і стан документа не змінився",
          visible: ["сторінка входу (заголовок «Вхід», поля Email і Пароль)", "жодного тексту документа чи даних клієнта"],
          hidden: ["адреса сторінки — /login", "у базі документи не підписано"],
        },
        async () => {
          await expectLoginOnly(page);
          await expect(page.getByText(card.name)).toHaveCount(0);
          expect((await consentDocumentsOf(card.id)).every((d) => d.signed_at === null)).toBe(true);
        },
      );
    },
  );
});
