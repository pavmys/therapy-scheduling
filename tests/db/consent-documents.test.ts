import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

// Документи згоди на рівні бази (openspec/specs/consent-documents; design.md impl-consent-documents, D1–D4):
// формування набору, позначка «підписано», видимість для терапевта й перевірка підписів у confirm_hold
// (openspec/specs/slot-holds, «Підтвердження утримання як сеансу»).
// Кожен відмовний тест перевіряє і відмову, і те, що дані не змінились.
let t: TestDb;
let scheduler1: string;
let scheduler2: string;
let admin1: string;
let therapist1: string;
let therapist2: string;

type Doc = {
  id: string;
  client_id: string;
  kind: string;
  prepared_on: string;
  signed_at: string | null;
  signed_by: string | null;
};
type Hold = { id: string; expires_at: string; confirmed_at: string | null };

const ADULT = `insert into public.clients (client_type, full_name, email, date_of_birth, session_language)
  values ('adult', $1, $2, '1990-05-14', 'English') returning id`;
const CHILD = `insert into public.clients
  (client_type, full_name, date_of_birth, session_language, guardian_name, guardian_email)
  values ('child', $1, '2015-03-02', 'Spanish', $2, $3) returning id`;

const PREPARE = "select * from public.prepare_consent_documents($1)";
const SIGN = "select * from public.sign_consent_document($1)";
const CONFIRM = "select * from public.confirm_hold($1)";

// Стан таблиці після дії читаємо як service_role (секретний ключ, в обхід RLS) — як в інших тестах бази.
async function raw<T>(sql: string, params: unknown[] = []) {
  return t.asService<T>(sql, params);
}

const docsOf = (clientId: string) =>
  raw<Doc>(
    `select id, client_id, kind, prepared_on::text as prepared_on, signed_at::text as signed_at, signed_by
     from public.consent_documents where client_id = $1 order by kind`,
    [clientId],
  );

const docOf = async (clientId: string, kind: string) => (await docsOf(clientId)).find((d) => d.kind === kind)!;

const holdState = async (holdId: string) =>
  (
    await t.asService<Hold>(
      "select id, expires_at::text as expires_at, confirmed_at::text as confirmed_at from public.holds where id = $1",
      [holdId],
    )
  )[0];

async function client(kind: "adult" | "child", n: number) {
  const [{ id }] =
    kind === "adult"
      ? await t.asService<{ id: string }>(ADULT, [`Client ${n}`, `client${n}@example.test`])
      : await t.asService<{ id: string }>(CHILD, [`Client ${n}`, `Guardian ${n}`, `guardian${n}@example.test`]);
  return id;
}

// Слоти в далекому майбутньому: тест не залежить від дат сиду й поточного часу; кожен — нова година.
let nextHour = 0;
async function futureSlot(therapistId: string) {
  nextHour += 1;
  const [{ id }] = await t.asService<{ id: string }>(
    `insert into public.slots (therapist_id, starts_at, ends_at)
     values ($1, '2031-03-03 00:00+00'::timestamptz + make_interval(hours => $2),
             '2031-03-03 01:00+00'::timestamptz + make_interval(hours => $2))
     returning id`,
    [therapistId, nextHour],
  );
  return id;
}

// Утримання, створене `createdAgo` тому (expires_at = created_at + 24 год за обмеженням таблиці).
async function hold(slotId: string, clientId: string, { createdAgo = "0 minutes", confirmed = false } = {}) {
  const [{ id }] = await t.asService<{ id: string }>(
    `insert into public.holds (slot_id, client_id, created_at, expires_at, confirmed_at)
     values ($1, $2, date_trunc('minute', now()) - $3::interval,
             date_trunc('minute', now()) - $3::interval + interval '1440 minutes',
             case when $4 then now() - $3::interval end)
     returning id`,
    [slotId, clientId, createdAgo, confirmed],
  );
  return id;
}

// Сформувати документи (scheduler1) і підписати всі, крім `leaveUnsigned`.
async function prepareAndSign(clientId: string, leaveUnsigned: string[] = []) {
  const docs = await t.asUser<Doc>(scheduler1, PREPARE, [clientId]);
  for (const d of docs.filter((d) => !leaveUnsigned.includes(d.kind))) await t.asUser(scheduler1, SIGN, [d.id]);
  return docs;
}

beforeAll(async () => {
  t = await createTestDb();
  scheduler1 = t.users["scheduler1@example.test"];
  scheduler2 = t.users["scheduler2@example.test"];
  admin1 = t.users["admin1@example.test"];
  therapist1 = t.users["therapist1@example.test"];
  therapist2 = t.users["therapist2@example.test"];
}, 60_000);

describe("формування документів згоди", () => {
  it("AC-DOC-02: scheduler1 формує документи для дорослого — рівно два, «Not signed», з датою формування", async () => {
    const client6 = await client("adult", 6);
    const returned = await t.asUser<Doc>(scheduler1, PREPARE, [client6]);
    expect(returned.map((d) => d.kind).sort()).toEqual(["cancellation_policy", "consent_to_treatment"]);

    const [{ today }] = await raw<{ today: string }>(
      "select (now() at time zone 'America/Los_Angeles')::date::text as today",
    );
    const docs = await docsOf(client6);
    expect(docs).toHaveLength(2);
    for (const d of docs) {
      expect(d).toMatchObject({ client_id: client6, prepared_on: today, signed_at: null, signed_by: null });
    }
    const [{ created_by }] = await raw<{ created_by: string }>(
      "select distinct created_by from public.consent_documents where client_id = $1",
      [client6],
    );
    expect(created_by).toBe(scheduler1);
  });

  it("AC-DOC-03: scheduler1 формує документи для дитини — три, разом із «Release of information»", async () => {
    const client7 = await client("child", 7);
    const returned = await t.asUser<Doc>(scheduler1, PREPARE, [client7]);
    expect(returned).toHaveLength(3);
    expect((await docsOf(client7)).map((d) => [d.kind, d.signed_at])).toEqual([
      ["cancellation_policy", null],
      ["consent_to_treatment", null],
      ["release_of_information", null],
    ]);
  });

  it("AC-DOC-02: повторне формування повертає той самий набір і не створює другого", async () => {
    const clientId = await client("adult", 21);
    const first = await t.asUser<Doc>(scheduler1, PREPARE, [clientId]);
    const again = await t.asUser<Doc>(scheduler1, PREPARE, [clientId]);
    expect(again.map((d) => d.id).sort()).toEqual(first.map((d) => d.id).sort());
    expect(await docsOf(clientId)).toHaveLength(2);
  });

  it("AC-DOC-02: scheduler1 і scheduler2 формують документи одного клієнта — лише один набір", async () => {
    // PGlite має одне з'єднання: справжньої паралельності тут немає, тож перевіряємо два формування поспіль
    // від різних планувальників (захист — блокування картки, `if not exists` і unique (client_id, kind)).
    const clientId = await client("child", 22);
    const bySched1 = await t.asUser<Doc>(scheduler1, PREPARE, [clientId]);
    const bySched2 = await t.asUser<Doc>(scheduler2, PREPARE, [clientId]);
    expect(bySched2.map((d) => d.id).sort()).toEqual(bySched1.map((d) => d.id).sort());

    const docs = await docsOf(clientId);
    expect(docs).toHaveLength(3);
    expect(new Set(docs.map((d) => d.kind)).size).toBe(3);
  });

  it("AC-DOC-02: therapist1, користувач без ролі й анонім не формують документів — нічого не створено", async () => {
    const clientId = await client("adult", 23);
    await expect(t.asUser(therapist1, PREPARE, [clientId])).rejects.toThrow("CONSENT_FORBIDDEN");
    await expect(t.asUser(t.users["newuser1@example.test"], PREPARE, [clientId])).rejects.toThrow(
      "CONSENT_FORBIDDEN",
    );
    await expect(t.asAnon(PREPARE, [clientId])).rejects.toThrow(/permission denied/);
    expect(await docsOf(clientId)).toEqual([]);
  });

  it("AC-DOC-02: scheduler1 не вставляє документ у таблицю напряму — лише через функцію", async () => {
    const clientId = await client("adult", 24);
    await expect(
      t.asUser(
        scheduler1,
        `insert into public.consent_documents (client_id, kind, prepared_on, created_by)
         values ($1, 'consent_to_treatment', current_date, $2)`,
        [clientId, scheduler1],
      ),
    ).rejects.toThrow(/permission denied/);
    expect(await docsOf(clientId)).toEqual([]);
  });
});

describe("позначка «підписано»", () => {
  let clientId: string;
  let ownHold: string;
  let n = 300;

  // Кожен тест — власна картка й набір документів: тест можна запустити окремо (фільтр Vitest), порядок не важить.
  beforeEach(async () => {
    // Свій клієнт therapist1: утримання «Held» у його майбутньому слоті.
    n += 1;
    clientId = await client("adult", n);
    ownHold = await hold(await futureSlot(therapist1), clientId);
    await t.asUser(scheduler1, PREPARE, [clientId]);
  });

  it("AC-DOC-09: therapist1 бачить документ свого клієнта, але не підписує його — стан лишається «Not signed»", async () => {
    const consent = await docOf(clientId, "consent_to_treatment");
    const visible = await t.asUser<Doc>(therapist1, "select id, signed_at from public.consent_documents where client_id = $1", [
      clientId,
    ]);
    expect(visible.map((d) => d.id)).toContain(consent.id);
    expect(visible.every((d) => d.signed_at === null)).toBe(true);

    await expect(t.asUser(therapist1, SIGN, [consent.id])).rejects.toThrow("SIGN_FORBIDDEN");
    expect(await docOf(clientId, "consent_to_treatment")).toMatchObject({ signed_at: null, signed_by: null });
    // Свій клієнт — саме через «Held», а не через роль: утримання ще не підтверджене.
    expect((await holdState(ownHold)).confirmed_at).toBeNull();
  });

  it("AC-DOC-09: користувач без ролі й анонім не підписують і не читають документи", async () => {
    const consent = await docOf(clientId, "consent_to_treatment");
    await expect(t.asUser(t.users["newuser1@example.test"], SIGN, [consent.id])).rejects.toThrow("SIGN_FORBIDDEN");
    expect(
      await t.asUser(t.users["newuser1@example.test"], "select id from public.consent_documents where client_id = $1", [
        clientId,
      ]),
    ).toEqual([]);
    await expect(t.asAnon(SIGN, [consent.id])).rejects.toThrow(/permission denied/);
    await expect(t.asAnon("select id from public.consent_documents")).rejects.toThrow(/permission denied/);
    expect(await docOf(clientId, "consent_to_treatment")).toMatchObject({ signed_at: null, signed_by: null });
  });

  it("AC-DOC-05: scheduler1 підписує «Consent to treatment» — серверний час до хвилини, підписав scheduler1", async () => {
    const consent = await docOf(clientId, "consent_to_treatment");
    const [signed] = await t.asUser<Doc>(scheduler1, SIGN, [consent.id]);
    expect(signed.id).toBe(consent.id);
    expect(signed.signed_by).toBe(scheduler1);

    const [check] = await raw<{ truncated: boolean; recent: boolean }>(
      `select signed_at = date_trunc('minute', signed_at) as truncated,
              signed_at <= now() and signed_at > now() - interval '2 minutes' as recent
       from public.consent_documents where id = $1`,
      [consent.id],
    );
    expect(check).toEqual({ truncated: true, recent: true });
    // Другий документ — досі «Not signed».
    expect(await docOf(clientId, "cancellation_policy")).toMatchObject({ signed_at: null, signed_by: null });
  });

  it("AC-DOC-06: scheduler2 підписує другий документ — підписано обидва", async () => {
    // «Дано»: «Consent to treatment» уже підписав scheduler1.
    await t.asUser(scheduler1, SIGN, [(await docOf(clientId, "consent_to_treatment")).id]);
    const policy = await docOf(clientId, "cancellation_policy");
    const [signed] = await t.asUser<Doc>(scheduler2, SIGN, [policy.id]);
    expect(signed.signed_by).toBe(scheduler2);
    const docs = await docsOf(clientId);
    expect(docs.every((d) => d.signed_at !== null)).toBe(true);
    expect(docs.map((d) => d.signed_by).sort()).toEqual([scheduler1, scheduler2].sort());
  });

  it("AC-DOC-06: повторна позначка не перезаписує час і автора першого підпису", async () => {
    const consent = await docOf(clientId, "consent_to_treatment");
    // «Дано»: перший підпис — scheduler1.
    await t.asUser(scheduler1, SIGN, [consent.id]);
    // Зсуваємо перший підпис у минуле, щоб перезапис часу був помітний навіть у ту саму хвилину.
    await raw("update public.consent_documents set signed_at = '2026-11-04 18:15+00' where id = $1", [consent.id]);
    const before = await docOf(clientId, "consent_to_treatment");

    const [again] = await t.asUser<Doc>(scheduler2, `select id, signed_at::text as signed_at, signed_by from (${SIGN}) as s`, [
      consent.id,
    ]);
    expect(again).toEqual({ id: consent.id, signed_at: before.signed_at, signed_by: scheduler1 });
    expect(await docOf(clientId, "consent_to_treatment")).toEqual(before);
  });

  it("AC-DOC-06: scheduler1 не змінює документ напряму (update) — лише через функцію", async () => {
    const policy = await docOf(clientId, "cancellation_policy");
    await expect(
      t.asUser(scheduler1, "update public.consent_documents set signed_at = null, signed_by = null where id = $1", [
        policy.id,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      t.asUser(scheduler1, "delete from public.consent_documents where id = $1", [policy.id]),
    ).rejects.toThrow(/permission denied/);
    expect(await docOf(clientId, "cancellation_policy")).toEqual(policy);
  });
});

describe("видимість документів", () => {
  it("AC-DOC-10: therapist1 не бачить документів client9 (свого лише для therapist2), staff бачить усі", async () => {
    const client9 = await client("adult", 9);
    await hold(await futureSlot(therapist2), client9);
    await t.asUser(scheduler1, PREPARE, [client9]);
    const ids = (await docsOf(client9)).map((d) => d.id).sort();
    expect(ids).toHaveLength(2);

    const SELECT = "select id from public.consent_documents where client_id = $1 order by id";
    expect(await t.asUser(therapist1, SELECT, [client9])).toEqual([]);
    expect((await t.asUser<{ id: string }>(therapist2, SELECT, [client9])).map((r) => r.id)).toEqual(ids);
    for (const staff of [scheduler1, scheduler2, admin1]) {
      expect((await t.asUser<{ id: string }>(staff, SELECT, [client9])).map((r) => r.id)).toEqual(ids);
    }
    // therapist1 не підписує документ чужого клієнта, стан не змінився.
    await expect(t.asUser(therapist1, SIGN, [ids[0]])).rejects.toThrow("SIGN_FORBIDDEN");
    expect((await docsOf(client9)).every((d) => d.signed_at === null)).toBe(true);
  });
});

describe("підтвердження утримання з документами згоди", () => {
  it("AC-DOC-07: непідписаний документ — CONSENT_NOT_SIGNED, утримання «Held» з тим самим expires_at", async () => {
    const clientId = await client("adult", 41);
    const holdId = await hold(await futureSlot(therapist1), clientId);
    await prepareAndSign(clientId, ["cancellation_policy"]);
    const before = await holdState(holdId);

    await expect(t.asUser(scheduler1, CONFIRM, [holdId])).rejects.toThrow("CONSENT_NOT_SIGNED");
    const after = await holdState(holdId);
    expect(after).toEqual(before);
    expect(after.confirmed_at).toBeNull();
    // Відмову дає саме документ: «Consent to treatment» підписано, «Cancellation policy» — ні.
    expect((await docOf(clientId, "cancellation_policy")).signed_at).toBeNull();
    expect((await docOf(clientId, "consent_to_treatment")).signed_at).not.toBeNull();
  });

  it("AC-DOC-08: усі документи підписано — scheduler1 підтверджує утримання", async () => {
    const clientId = await client("child", 42);
    const holdId = await hold(await futureSlot(therapist1), clientId);
    const docs = await prepareAndSign(clientId, ["release_of_information"]);
    await expect(t.asUser(scheduler1, CONFIRM, [holdId])).rejects.toThrow("CONSENT_NOT_SIGNED");

    await t.asUser(scheduler1, SIGN, [docs.find((d) => d.kind === "release_of_information")!.id]);
    const [confirmed] = await t.asUser<Hold>(scheduler1, CONFIRM, [holdId]);
    expect(confirmed.id).toBe(holdId);
    expect((await holdState(holdId)).confirmed_at).not.toBeNull();
  });

  it("AC-HOLD-12: клієнт без документів згоди — підтвердження як у зрізі 1", async () => {
    const clientId = await client("adult", 43);
    const holdId = await hold(await futureSlot(therapist1), clientId);
    expect(await docsOf(clientId)).toEqual([]);
    await t.asUser(scheduler2, CONFIRM, [holdId]);
    expect((await holdState(holdId)).confirmed_at).not.toBeNull();
  });

  it("AC-DOC-07: прострочене утримання з непідписаним документом — HOLD_EXPIRED (перевірки зрізу 1 першими)", async () => {
    const clientId = await client("adult", 44);
    const holdId = await hold(await futureSlot(therapist1), clientId, { createdAgo: "2 days" });
    await prepareAndSign(clientId, ["consent_to_treatment"]);
    const before = await holdState(holdId);

    await expect(t.asUser(scheduler1, CONFIRM, [holdId])).rejects.toThrow("HOLD_EXPIRED");
    expect(await holdState(holdId)).toEqual(before);
  });

  it("AC-HOLD-13: прострочене утримання клієнта без документів — HOLD_EXPIRED", async () => {
    const clientId = await client("adult", 45);
    const holdId = await hold(await futureSlot(therapist1), clientId, { createdAgo: "2 days" });
    await expect(t.asUser(scheduler1, CONFIRM, [holdId])).rejects.toThrow("HOLD_EXPIRED");
    expect((await holdState(holdId)).confirmed_at).toBeNull();
  });

  it("AC-HOLD-22: слот уже почався, документ не підписано — SLOT_STARTED_CONFIRM", async () => {
    const clientId = await client("adult", 46);
    // Слот почався годину тому; утримання створене дві години тому — ще не прострочене.
    const [{ id: startedSlot }] = await t.asService<{ id: string }>(
      `insert into public.slots (therapist_id, starts_at, ends_at)
       values ($1, date_trunc('hour', now()) - interval '1 hour', date_trunc('hour', now()))
       on conflict (therapist_id, starts_at) do update set ends_at = excluded.ends_at
       returning id`,
      [therapist2],
    );
    const holdId = await hold(startedSlot, clientId, { createdAgo: "2 hours" });
    await prepareAndSign(clientId, ["cancellation_policy"]);

    await expect(t.asUser(scheduler1, CONFIRM, [holdId])).rejects.toThrow("SLOT_STARTED_CONFIRM");
    expect((await holdState(holdId)).confirmed_at).toBeNull();
  });

  it("AC-HOLD-36: уже підтверджене утримання з непідписаним документом — HOLD_ALREADY_CONFIRMED", async () => {
    const clientId = await client("adult", 47);
    const holdId = await hold(await futureSlot(therapist1), clientId, { confirmed: true });
    await prepareAndSign(clientId, ["consent_to_treatment"]);
    const before = await holdState(holdId);

    await expect(t.asUser(scheduler1, CONFIRM, [holdId])).rejects.toThrow("HOLD_ALREADY_CONFIRMED");
    expect(await holdState(holdId)).toEqual(before);
  });

  it("AC-HOLD-14: therapist1 не підтверджує утримання свого клієнта — CONFIRM_FORBIDDEN", async () => {
    const clientId = await client("adult", 48);
    const holdId = await hold(await futureSlot(therapist1), clientId);
    await prepareAndSign(clientId);

    await expect(t.asUser(therapist1, CONFIRM, [holdId])).rejects.toThrow("CONFIRM_FORBIDDEN");
    expect((await holdState(holdId)).confirmed_at).toBeNull();
  });
});
