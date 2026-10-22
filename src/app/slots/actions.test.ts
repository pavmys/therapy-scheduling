import { beforeEach, describe, expect, it, vi } from "vitest";

// Підмінений Supabase (ADR 0002): роль і відповідь функції hold_slot задає тест.
// Правила утримання виконує база; тест перевіряє виклик і мапінг коду помилки в текст PM.
type RpcResult = { data: { expires_at: string } | null; error: { message: string; code?: string } | null };

const fake = vi.hoisted(() => ({
  role: "scheduler" as string | null,
  rpcResults: [] as RpcResult[],
  rpcCalls: [] as { fn: string; args: unknown }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "user-1" } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: fake.role ? { role: fake.role } : null }) }),
      }),
    }),
    rpc: async (fn: string, args: unknown) => {
      fake.rpcCalls.push({ fn, args });
      return fake.rpcResults.shift() ?? { data: null, error: { message: "no result" } };
    },
  }),
}));

const { holdSlot } = await import("./actions");

const SLOT_T1_10 = "11111111-1111-4111-8111-111111111110";
const SLOT_T2_10 = "22222222-2222-4222-8222-222222222210";
const CLIENT_1 = "c1111111-1111-4111-8111-111111111111";
const CLIENT_2 = "c2222222-2222-4222-8222-222222222222";

function form(slotId: string, clientId: string) {
  const data = new FormData();
  data.set("slot_id", slotId);
  data.set("client_id", clientId);
  return data;
}

// Утримання 2026-11-02 14:30 у часі практики (PST, UTC−8) → expires_at 2026-11-03 14:30.
const held = (): RpcResult => ({ data: { expires_at: "2026-11-03T22:30:00Z" }, error: null });
const failed = (code: string): RpcResult => ({ data: null, error: { message: code, code: "P0001" } });

beforeEach(() => {
  fake.role = "scheduler";
  fake.rpcResults = [];
  fake.rpcCalls = [];
});

describe("holdSlot", () => {
  it("AC-HOLD-02: утримання вільного слоту — «Held until» через 24 години", async () => {
    fake.rpcResults = [held()];
    const state = await holdSlot(null, form(SLOT_T1_10, CLIENT_1));
    expect(state).toEqual({ ok: true, message: "Held until 2026-11-03 14:30" });
    expect(fake.rpcCalls).toEqual([{ fn: "hold_slot", args: { p_slot_id: SLOT_T1_10, p_client_id: CLIENT_1 } }]);
  });

  it("AC-HOLD-03: слот уже утримано за іншим клієнтом", async () => {
    fake.rpcResults = [failed("SLOT_UNAVAILABLE")];
    const state = await holdSlot(null, form(SLOT_T1_10, CLIENT_2));
    expect(state).toEqual({ ok: false, message: "This slot is no longer available." });
  });

  it("AC-HOLD-04: одночасне утримання — одне успішне, інше бачить «no longer available»", async () => {
    // База серіалізує виклики блокуванням рядка слоту: другий бачить утримання першого.
    fake.rpcResults = [held(), failed("SLOT_UNAVAILABLE")];
    const results = await Promise.all([
      holdSlot(null, form(SLOT_T1_10, CLIENT_1)),
      holdSlot(null, form(SLOT_T1_10, CLIENT_2)),
    ]);
    expect(results.filter((r) => r?.ok)).toHaveLength(1);
    expect(results.find((r) => !r?.ok)?.message).toBe("This slot is no longer available.");
  });

  it("AC-HOLD-07: слот, що вже почався, не утримується", async () => {
    fake.rpcResults = [failed("SLOT_STARTED")];
    const state = await holdSlot(null, form(SLOT_T1_10, CLIENT_1));
    expect(state).toEqual({ ok: false, message: "This slot has already started and cannot be held." });
  });

  it("AC-HOLD-08: терапевт не утримує слоти, запит до бази не йде", async () => {
    fake.role = "therapist";
    const state = await holdSlot(null, form(SLOT_T1_10, CLIENT_1));
    expect(state).toEqual({ ok: false, message: "Only schedulers and admins can hold slots." });
    expect(fake.rpcCalls).toEqual([]);
  });

  it("AC-HOLD-08: відмова бази для ролі теж дає текст PM", async () => {
    fake.rpcResults = [failed("HOLD_FORBIDDEN")];
    const state = await holdSlot(null, form(SLOT_T1_10, CLIENT_1));
    expect(state).toEqual({ ok: false, message: "Only schedulers and admins can hold slots." });
  });

  it("AC-HOLD-17: повторне утримання того самого слоту за тим самим клієнтом", async () => {
    fake.rpcResults = [failed("SLOT_UNAVAILABLE")];
    const state = await holdSlot(null, form(SLOT_T1_10, CLIENT_1));
    expect(state).toEqual({ ok: false, message: "This slot is no longer available." });
  });

  it("AC-HOLD-25: клієнт уже має утримання на цей час", async () => {
    fake.rpcResults = [failed("CLIENT_OVERLAP")];
    const state = await holdSlot(null, form(SLOT_T2_10, CLIENT_1));
    expect(state).toEqual({ ok: false, message: "This client already has a hold or session at this time." });
  });

  it("AC-HOLD-26: прострочене утримання клієнта не заважає — утримання створено", async () => {
    fake.rpcResults = [held()];
    const state = await holdSlot(null, form(SLOT_T2_10, CLIENT_1));
    expect(state?.ok).toBe(true);
  });

  it("без клієнта або з некоректним id — підказка, запит до бази не йде", async () => {
    for (const clientId of ["", "not-a-uuid"]) {
      expect(await holdSlot(null, form(SLOT_T1_10, clientId))).toEqual({ ok: false, message: "Select a client." });
    }
    expect(await holdSlot(null, form("1; drop table", CLIENT_1))).toEqual({
      ok: false,
      message: "This slot is no longer available.",
    });
    const withFile = form(SLOT_T1_10, CLIENT_1);
    withFile.set("client_id", new Blob(["x"]), "x.txt");
    expect(await holdSlot(null, withFile)).toEqual({ ok: false, message: "Select a client." });
    expect(fake.rpcCalls).toEqual([]);
  });

  it("слот або клієнта видалено після завантаження сторінки", async () => {
    fake.rpcResults = [failed("SLOT_NOT_FOUND"), failed("CLIENT_NOT_FOUND")];
    expect((await holdSlot(null, form(SLOT_T1_10, CLIENT_1)))?.message).toBe("This slot is no longer available.");
    expect((await holdSlot(null, form(SLOT_T1_10, CLIENT_1)))?.message).toBe(
      "This client no longer exists. Select another client.",
    );
  });
});
