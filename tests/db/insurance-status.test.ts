import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

// Статус перевірки страхування (openspec/specs/insurance-status) на рівні бази: default 'not_set',
// update планувальником/адміністратором під своєю роллю (RLS), видимість для іншого працівника.
let t: TestDb;

const ADULT = `insert into public.clients (client_type, full_name, email, date_of_birth, session_language)
  values ('adult', $1, $2, '1990-05-14', 'English')`;
const CHILD = `insert into public.clients
  (client_type, full_name, date_of_birth, session_language, guardian_name, guardian_email)
  values ('child', $1, '2015-03-02', 'Spanish', $2, $3)`;

const idOf = async (fullName: string) =>
  (await t.asService<{ id: string }>("select id from public.clients where full_name = $1", [fullName]))[0].id;

const SELECT_STATUS = "select insurance_status from public.clients where id = $1";
const SET_STATUS = "update public.clients set insurance_status = $1 where id = $2 returning id";

beforeAll(async () => {
  t = await createTestDb();
  await t.asService(ADULT, ["Client Six", "client6@example.test"]);
  await t.asService(CHILD, ["Client Seven", "Guardian Seven", "guardian7@example.test"]);
}, 60_000);

describe("статус перевірки страхування", () => {
  it("AC-INS-01: нову картку client6 створено без статусу — статус 'not_set'", async () => {
    const client6 = await idOf("Client Six");
    expect(await t.asService(SELECT_STATUS, [client6])).toEqual([{ insurance_status: "not_set" }]);
    expect(await t.asUser(t.users["scheduler1@example.test"], SELECT_STATUS, [client6])).toEqual([
      { insurance_status: "not_set" },
    ]);
  });

  it("AC-INS-01: картка, створена під scheduler1, теж має статус 'not_set'", async () => {
    const scheduler1 = t.users["scheduler1@example.test"];
    await t.asUser(scheduler1, ADULT, ["Client Thirteen", "client13@example.test"]);
    const client13 = await idOf("Client Thirteen");
    expect(await t.asUser(scheduler1, SELECT_STATUS, [client13])).toEqual([{ insurance_status: "not_set" }]);
  });

  it("AC-INS-02: scheduler1 позначає 'verified' — і бачить 'verified', відкривши картку знову", async () => {
    const scheduler1 = t.users["scheduler1@example.test"];
    const client6 = await idOf("Client Six");
    expect(await t.asUser(scheduler1, SET_STATUS, ["verified", client6])).toEqual([{ id: client6 }]);
    expect(await t.asUser(scheduler1, SELECT_STATUS, [client6])).toEqual([{ insurance_status: "verified" }]);
    expect(await t.asService(SELECT_STATUS, [client6])).toEqual([{ insurance_status: "verified" }]);
  });

  it("AC-INS-03: admin1 змінює 'verified' на 'private_pay' — і admin1, і scheduler2 бачать 'private_pay'", async () => {
    const client7 = await idOf("Client Seven");
    await t.asService("update public.clients set insurance_status = 'verified' where id = $1", [client7]);
    expect(await t.asService(SELECT_STATUS, [client7])).toEqual([{ insurance_status: "verified" }]);

    const admin1 = t.users["admin1@example.test"];
    expect(await t.asUser(admin1, SET_STATUS, ["private_pay", client7])).toEqual([{ id: client7 }]);

    for (const email of ["admin1@example.test", "scheduler2@example.test"]) {
      expect(await t.asUser(t.users[email], SELECT_STATUS, [client7])).toEqual([{ insurance_status: "private_pay" }]);
    }
  });
});
