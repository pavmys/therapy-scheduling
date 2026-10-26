import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

// «Свій клієнт» терапевта на рівні бази (openspec/specs/client-cards; design.md impl-client-cards, D3):
// терапевт бачить картку лише клієнта з утриманням «Held» або сеансом «Confirmed» з ним.
// Кожен відмовний тест перевіряє і відмову (0 рядків), і те, що дані не змінились (asService).
let t: TestDb;
let therapist1: string;
let therapist2: string;
const ids: Record<string, string> = {};

const ADULT = `insert into public.clients (client_type, full_name, email, date_of_birth, session_language)
  values ('adult', $1, $2, '1990-05-14', 'English') returning id`;
const CHILD = `insert into public.clients
  (client_type, full_name, date_of_birth, session_language, guardian_name, guardian_email)
  values ('child', $1, '2015-03-02', 'Spanish', $2, $3) returning id`;

// Власні слоти в далекому майбутньому: тест не залежить від дат сиду й поточного часу.
async function slot(therapistId: string, startsAtUtc: string) {
  const [{ id }] = await t.asService<{ id: string }>(
    `insert into public.slots (therapist_id, starts_at, ends_at)
     values ($1, $2::timestamptz, $2::timestamptz + interval '60 minutes') returning id`,
    [therapistId, startsAtUtc],
  );
  return id;
}

async function hold(slotId: string, clientId: string, { confirmed = false } = {}) {
  const [{ id }] = await t.asService<{ id: string }>(
    `insert into public.holds (slot_id, client_id, created_at, expires_at, confirmed_at)
     values ($1, $2, date_trunc('minute', now()), date_trunc('minute', now()) + interval '1440 minutes',
             case when $3 then now() end)
     returning id`,
    [slotId, clientId, confirmed],
  );
  return id;
}

const visibleTo = async (therapistId: string) =>
  (
    await t.asUser<{ full_name: string }>(therapistId, "select full_name from public.clients order by full_name")
  ).map((r) => r.full_name);

beforeAll(async () => {
  t = await createTestDb();
  therapist1 = t.users["therapist1@example.test"];
  therapist2 = t.users["therapist2@example.test"];

  [{ id: ids.client6 }] = await t.asService<{ id: string }>(ADULT, ["Client Six", "client6@example.test"]);
  [{ id: ids.client7 }] = await t.asService<{ id: string }>(CHILD, [
    "Client Seven",
    "Guardian Seven",
    "guardian7@example.test",
  ]);
  [{ id: ids.client9 }] = await t.asService<{ id: string }>(ADULT, ["Client Nine", "client9@example.test"]);

  ids.hold6 = await hold(await slot(therapist1, "2030-01-07 18:00+00"), ids.client6);
  await hold(await slot(therapist1, "2030-01-07 19:00+00"), ids.client7, { confirmed: true });
  await hold(await slot(therapist2, "2030-01-07 18:00+00"), ids.client9);
}, 60_000);

describe("свої клієнти терапевта", () => {
  it("AC-CARD-04: therapist1 бачить картки client6 («Held») і client7 («Confirmed») з даними анкети, але не client9", async () => {
    expect(await visibleTo(therapist1)).toEqual(["Client Seven", "Client Six"]);

    const [card7] = await t.asUser(
      therapist1,
      `select client_type, date_of_birth::text, session_language, guardian_name, guardian_email
       from public.clients where id = $1`,
      [ids.client7],
    );
    expect(card7).toEqual({
      client_type: "child",
      date_of_birth: "2015-03-02",
      session_language: "Spanish",
      guardian_name: "Guardian Seven",
      guardian_email: "guardian7@example.test",
    });
    const [card6] = await t.asUser<{ email: string }>(therapist1, "select email from public.clients where id = $1", [
      ids.client6,
    ]);
    expect(card6.email).toBe("client6@example.test");
  });

  it("AC-CARD-05: therapist1 не відкриває картку client9 — свого клієнта лише для therapist2, картка не змінилась", async () => {
    expect(await t.asUser(therapist1, "select * from public.clients where id = $1", [ids.client9])).toHaveLength(0);
    expect(await visibleTo(therapist2)).toEqual(["Client Nine"]);

    const [card9] = await t.asService<{ full_name: string; email: string }>(
      "select full_name, email from public.clients where id = $1",
      [ids.client9],
    );
    expect(card9).toEqual({ full_name: "Client Nine", email: "client9@example.test" });
  });

  it("AC-CARD-14: «Held», слот якого вже почався, не робить клієнта своїм, а минулий «Confirmed» — так", async () => {
    // Слоти, що почалися годину тому: утримання client12 ще «Held» (створене дві години тому, до 24 годин далеко),
    // сеанс client13 «Confirmed» — минулий.
    const [{ id: client12 }] = await t.asService<{ id: string }>(ADULT, ["Client Twelve", "client12@example.test"]);
    const [{ id: client13 }] = await t.asService<{ id: string }>(ADULT, ["Client Thirteen", "client13@example.test"]);
    const started = async () =>
      (
        await t.asService<{ id: string }>(
          `insert into public.slots (therapist_id, starts_at, ends_at)
           values ($1, date_trunc('hour', now()) - interval '1 hour', date_trunc('hour', now()))
           on conflict (therapist_id, starts_at) do update set ends_at = excluded.ends_at
           returning id`,
          [therapist1],
        )
      )[0].id;
    const startedSlot = await started();
    const [{ id: heldStarted }] = await t.asService<{ id: string }>(
      `insert into public.holds (slot_id, client_id, created_at, expires_at)
       values ($1, $2, date_trunc('minute', now()) - interval '2 hours',
               date_trunc('minute', now()) - interval '2 hours' + interval '1440 minutes')
       returning id`,
      [startedSlot, client12],
    );
    await t.asService(
      `insert into public.holds (slot_id, client_id, created_at, expires_at, confirmed_at)
       values ($1, $2, date_trunc('minute', now()) - interval '3 hours',
               date_trunc('minute', now()) - interval '3 hours' + interval '1440 minutes', now() - interval '3 hours')`,
      [await slot(therapist1, "2026-01-05 18:00+00"), client13],
    );

    const visible = await visibleTo(therapist1);
    expect(visible).toContain("Client Thirteen");
    expect(visible).not.toContain("Client Twelve");
    expect(await t.asUser(therapist1, "select * from public.clients where id = $1", [client12])).toHaveLength(0);

    // Утримання справді ще «Held» (не прострочене й не підтверджене) — відмова саме через початок слоту.
    const [held] = await t.asService<{ held: boolean }>(
      "select (confirmed_at is null and expires_at > now()) as held from public.holds where id = $1",
      [heldStarted],
    );
    expect(held.held).toBe(true);
  });

  it("AC-CARD-08: прострочене утримання client6 не робить його своїм — немає ні в списку, ні за посиланням", async () => {
    // Утримання client6 у therapist1 прострочилося: створене понад 24 години тому.
    await t.asService(
      `update public.holds
       set created_at = date_trunc('minute', now()) - interval '2 days',
           expires_at = date_trunc('minute', now()) - interval '2 days' + interval '1440 minutes'
       where id = $1`,
      [ids.hold6],
    );

    const visible = await visibleTo(therapist1);
    expect(visible).toContain("Client Seven");
    expect(visible).not.toContain("Client Six");
    expect(await t.asUser(therapist1, "select * from public.clients where id = $1", [ids.client6])).toHaveLength(0);

    const [card6] = await t.asService<{ full_name: string }>("select full_name from public.clients where id = $1", [
      ids.client6,
    ]);
    expect(card6.full_name).toBe("Client Six");
  });
});
