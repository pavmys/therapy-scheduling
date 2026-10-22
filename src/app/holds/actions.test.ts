import { beforeEach, describe, expect, it, vi } from "vitest";

// Підмінений Supabase (ADR 0002): роль і відповіді функцій hold_slot / confirm_hold задає тест.
// Правила підтвердження виконує база; тест перевіряє виклик і мапінг коду помилки в текст PM.
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

const { confirmHold } = await import("./actions");
const { holdSlot } = await import("@/app/slots/actions");

const HOLD = "a1111111-1111-4111-8111-111111111111";
const SLOT = "11111111-1111-4111-8111-111111111110";
const CLIENT = "c1111111-1111-4111-8111-111111111111";

function confirmForm(holdId: string) {
  const data = new FormData();
  data.set("hold_id", holdId);
  return data;
}

const ok = (): RpcResult => ({ data: { expires_at: "2026-11-03T22:30:00Z" }, error: null });
const failed = (code: string): RpcResult => ({ data: null, error: { message: code, code: "P0001" } });

beforeEach(() => {
  fake.role = "scheduler";
  fake.rpcResults = [];
  fake.rpcCalls = [];
});

describe("confirmHold", () => {
  it("AC-HOLD-12: планувальник підтверджує непрострочене утримання", async () => {
    fake.rpcResults = [ok()];
    expect(await confirmHold(null, confirmForm(HOLD))).toEqual({ ok: true, message: "Confirmed" });
    expect(fake.rpcCalls).toEqual([{ fn: "confirm_hold", args: { p_hold_id: HOLD } }]);
  });

  it("AC-HOLD-13: прострочене утримання не підтверджується", async () => {
    fake.rpcResults = [failed("HOLD_EXPIRED")];
    expect(await confirmHold(null, confirmForm(HOLD))).toEqual({
      ok: false,
      message: "This hold has expired. Hold the slot again.",
    });
  });

  it("AC-HOLD-14: терапевт не підтверджує утримання, запит до бази не йде", async () => {
    fake.role = "therapist";
    expect(await confirmHold(null, confirmForm(HOLD))).toEqual({
      ok: false,
      message: "Only schedulers and admins can confirm holds.",
    });
    expect(fake.rpcCalls).toEqual([]);
  });

  it("AC-HOLD-14: відмова бази для ролі теж дає текст PM", async () => {
    fake.rpcResults = [failed("CONFIRM_FORBIDDEN")];
    expect((await confirmHold(null, confirmForm(HOLD)))?.message).toBe("Only schedulers and admins can confirm holds.");
  });

  it("AC-HOLD-19: адміністратор утримує й підтверджує так само, як планувальник", async () => {
    fake.role = "admin";
    fake.rpcResults = [ok(), ok()];
    const holdForm = new FormData();
    holdForm.set("slot_id", SLOT);
    holdForm.set("client_id", CLIENT);
    expect((await holdSlot(null, holdForm))?.ok).toBe(true);
    expect(await confirmHold(null, confirmForm(HOLD))).toEqual({ ok: true, message: "Confirmed" });
    expect(fake.rpcCalls.map((c) => c.fn)).toEqual(["hold_slot", "confirm_hold"]);
  });

  it("AC-HOLD-22: слот уже почався — утримання не підтверджується", async () => {
    fake.rpcResults = [failed("SLOT_STARTED_CONFIRM")];
    expect(await confirmHold(null, confirmForm(HOLD))).toEqual({
      ok: false,
      message: "This slot has already started and cannot be confirmed.",
    });
  });

  it("AC-HOLD-23: за хвилину до початку слоту утримання підтверджується", async () => {
    fake.rpcResults = [ok()];
    expect((await confirmHold(null, confirmForm(HOLD)))?.ok).toBe(true);
  });

  it("AC-HOLD-27: інший планувальник підтверджує чуже утримання", async () => {
    fake.rpcResults = [ok()];
    expect(await confirmHold(null, confirmForm(HOLD))).toEqual({ ok: true, message: "Confirmed" });
  });

  it("AC-HOLD-36: повторне або одночасне підтвердження — «already confirmed»", async () => {
    // База серіалізує підтвердження блокуванням рядка утримання: друге бачить confirmed_at першого.
    fake.rpcResults = [ok(), failed("HOLD_ALREADY_CONFIRMED")];
    const results = await Promise.all([confirmHold(null, confirmForm(HOLD)), confirmHold(null, confirmForm(HOLD))]);
    expect(results.filter((r) => r?.ok)).toHaveLength(1);
    expect(results.find((r) => !r?.ok)?.message).toBe("This hold is already confirmed.");
  });

  it("некоректний id або видалене утримання", async () => {
    expect(await confirmHold(null, confirmForm("not-a-uuid"))).toEqual({ ok: false, message: "This hold no longer exists." });
    expect(fake.rpcCalls).toEqual([]);
    fake.rpcResults = [failed("HOLD_NOT_FOUND")];
    expect((await confirmHold(null, confirmForm(HOLD)))?.message).toBe("This hold no longer exists.");
  });
});
