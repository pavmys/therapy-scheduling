import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

// Картки клієнтів (openspec/specs/client-cards) на рівні бази: RLS, column grants і check-обмеження картки.
// Кожен відмовний тест перевіряє і відмову, і те, що дані не змінились (asService).
let t: TestDb;

const ADULT = `insert into public.clients (client_type, full_name, email, date_of_birth, session_language)
  values ('adult', $1, $2, '1990-05-14', 'English')`;
const CHILD = `insert into public.clients
  (client_type, full_name, date_of_birth, session_language, guardian_name, guardian_email)
  values ('child', $1, '2015-03-02', 'Spanish', $2, $3)`;

const countClients = async () =>
  (await t.asService<{ n: number }>("select count(*)::int as n from public.clients"))[0].n;

beforeAll(async () => {
  t = await createTestDb();
  await t.asService(ADULT, ["Client Six", "client6@example.test"]);
  await t.asService(CHILD, ["Client Seven", "Guardian Seven", "guardian7@example.test"]);
  await t.asService(ADULT, ["Client Nine", "client9@example.test"]);
}, 60_000);

describe("створення картки", () => {
  it("AC-CARD-06: терапевт не створює картку клієнта напряму, кількість карток не змінилась", async () => {
    const before = await countClients();
    await expect(
      t.asUser(t.users["therapist1@example.test"], ADULT, ["Client Ten", "client10@example.test"]),
    ).rejects.toThrow(/row-level security/);
    expect(await countClients()).toBe(before);
    expect(
      await t.asService("select id from public.clients where email = 'client10@example.test'"),
    ).toHaveLength(0);
  });

  it("AC-CARD-03: картку дитини без імені чи email опікуна база не приймає навіть напряму", async () => {
    const scheduler1 = t.users["scheduler1@example.test"];
    const before = await countClients();
    for (const [name, email] of [
      ["", "guardian8@example.test"],
      ["Guardian Eight", null],
      ["Guardian Eight", "guardian8example.test"],
    ]) {
      await expect(t.asUser(scheduler1, CHILD, ["Client Eight", name, email])).rejects.toThrow(
        /clients_card_shape_check/,
      );
    }
    expect(await countClients()).toBe(before);
  });

  it("AC-CARD-01: планувальник створює картку дорослого з усіма даними анкети", async () => {
    const scheduler1 = t.users["scheduler1@example.test"];
    await t.asUser(scheduler1, ADULT, ["Client Eleven", "client11@example.test"]);
    const [card] = await t.asService(
      "select client_type, full_name, email, date_of_birth::text, session_language from public.clients where email = $1",
      ["client11@example.test"],
    );
    expect(card).toEqual({
      client_type: "adult",
      full_name: "Client Eleven",
      email: "client11@example.test",
      date_of_birth: "1990-05-14",
      session_language: "English",
    });
  });

  it("картку не змінює ніхто, навіть планувальник, напряму — редагування поза зрізом (Non-goals)", async () => {
    await expect(
      t.asUser(
        t.users["scheduler1@example.test"],
        "update public.clients set full_name = 'Changed' where email = 'client6@example.test'",
      ),
    ).rejects.toThrow(/permission denied/);
    const [card] = await t.asService<{ full_name: string }>(
      "select full_name from public.clients where email = 'client6@example.test'",
    );
    expect(card.full_name).toBe("Client Six");
  });
});

describe("список карток", () => {
  it("AC-CARD-10: scheduler2 і admin1 бачать усі три картки, у картці client7 — дані опікуна", async () => {
    for (const email of ["scheduler2@example.test", "admin1@example.test"]) {
      const rows = await t.asUser<{ full_name: string; guardian_name: string | null; guardian_email: string | null }>(
        t.users[email],
        `select full_name, guardian_name, guardian_email from public.clients
         where full_name in ('Client Six', 'Client Seven', 'Client Nine') order by full_name`,
      );
      expect(rows.map((r) => r.full_name)).toEqual(["Client Nine", "Client Seven", "Client Six"]);
      expect(rows.find((r) => r.full_name === "Client Seven")).toMatchObject({
        guardian_name: "Guardian Seven",
        guardian_email: "guardian7@example.test",
      });
    }
  });
});
