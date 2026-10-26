import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

// Відмовні AC доступу (openspec/specs/app-access) на рівні бази: RLS, GRANT і column grants.
// Кожен тест перевіряє і відмову, і те, що дані не змінились (asService).
let t: TestDb;
let client6: string;
let holdOfClient6: string;

beforeAll(async () => {
  t = await createTestDb();
  [{ id: client6 }] = await t.asService<{ id: string }>(
    "insert into public.clients (full_name, email) values ('Client Six', 'client6@example.test') returning id",
  );
  // Власний слот у далекому майбутньому: тест не залежить від дат сиду й поточного часу.
  const [{ id: slot }] = await t.asService<{ id: string }>(
    `insert into public.slots (therapist_id, starts_at, ends_at)
     values ($1, '2030-01-07 18:00+00', '2030-01-07 19:00+00') returning id`,
    [t.users["therapist2@example.test"]],
  );
  [{ id: holdOfClient6 }] = await t.asService<{ id: string }>(
    `insert into public.holds (slot_id, client_id, created_at, expires_at)
     values ($1, $2, date_trunc('minute', now()), date_trunc('minute', now()) + interval '1440 minutes')
     returning id`,
    [slot, client6],
  );
}, 60_000);

const countClients = async () =>
  (await t.asService<{ n: number }>("select count(*)::int as n from public.clients"))[0].n;

describe("AC-CARD-07: відвідувач без входу", () => {
  it("AC-CARD-07: без входу список клієнтів, картка й утримання недоступні, жодна картка не змінилась", async () => {
    const before = await countClients();
    await expect(t.asAnon("select * from public.clients")).rejects.toThrow(/permission denied/);
    await expect(t.asAnon("select * from public.clients where id = $1", [client6])).rejects.toThrow(
      /permission denied/,
    );
    await expect(t.asAnon("select * from public.holds")).rejects.toThrow(/permission denied/);
    await expect(
      t.asAnon("insert into public.clients (full_name, email) values ('Anon', 'anon@example.test')"),
    ).rejects.toThrow(/permission denied/);

    expect(await countClients()).toBe(before);
    const [card] = await t.asService<{ full_name: string; email: string }>(
      "select full_name, email from public.clients where id = $1",
      [client6],
    );
    expect(card).toEqual({ full_name: "Client Six", email: "client6@example.test" });
  });
});

describe("AC-CARD-11: користувач без ролі", () => {
  it("AC-CARD-11: newuser1 без ролі не бачить жодної картки й утримання і не створює картку", async () => {
    const newuser1 = t.users["newuser1@example.test"];
    const [profile] = await t.asService<{ role: string | null }>("select role from public.profiles where id = $1", [
      newuser1,
    ]);
    expect(profile.role).toBeNull();

    expect(await t.asUser(newuser1, "select * from public.clients")).toHaveLength(0);
    expect(await t.asUser(newuser1, "select * from public.clients where id = $1", [client6])).toHaveLength(0);
    expect(await t.asUser(newuser1, "select * from public.holds")).toHaveLength(0);

    const before = await countClients();
    await expect(
      t.asUser(newuser1, "insert into public.clients (full_name, email) values ('New', 'new@example.test')"),
    ).rejects.toThrow(/row-level security/);
    expect(await countClients()).toBe(before);
  });

  it("AC-CARD-11: користувач без ролі не призначає собі роль — роль лишається порожньою", async () => {
    const newuser1 = t.users["newuser1@example.test"];
    await expect(
      t.asUser(newuser1, "update public.profiles set role = 'admin' where id = $1", [newuser1]),
    ).rejects.toThrow(/permission denied/);

    const [profile] = await t.asService<{ role: string | null }>("select role from public.profiles where id = $1", [
      newuser1,
    ]);
    expect(profile.role).toBeNull();
  });

  it("AC-CARD-11: терапевт, з якого зняли роль, не бачить своїх слотів, утримань і карток клієнтів", async () => {
    const therapist2 = t.users["therapist2@example.test"];
    // Перевірка тесту: з роллю therapist2 бачить свої дані.
    expect(await t.asUser(therapist2, "select id from public.holds where id = $1", [holdOfClient6])).toHaveLength(1);

    await t.asService("update public.profiles set role = null where id = $1", [therapist2]);
    try {
      expect(await t.asUser(therapist2, "select id from public.clients")).toHaveLength(0);
      expect(await t.asUser(therapist2, "select id from public.holds")).toHaveLength(0);
      expect(await t.asUser(therapist2, "select id from public.slots")).toHaveLength(0);

      const [hold] = await t.asService<{ client_id: string; confirmed_at: string | null }>(
        "select client_id, confirmed_at from public.holds where id = $1",
        [holdOfClient6],
      );
      expect(hold).toEqual({ client_id: client6, confirmed_at: null });
    } finally {
      await t.asService("update public.profiles set role = 'therapist' where id = $1", [therapist2]);
    }
  });
});
