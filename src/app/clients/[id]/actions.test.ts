import { beforeEach, describe, expect, it, vi } from "vitest";

// Підмінений Supabase (ADR 0002): роль користувача й результат update задає тест.
const fake = vi.hoisted(() => ({
  role: "scheduler" as string | null,
  updates: [] as { table: string; values: unknown; column: string; value: unknown }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getClaims: async () => ({ data: { claims: { sub: "user-1", email: "scheduler1@example.test" } } }),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: fake.role ? { role: fake.role } : null }),
            }),
          }),
        };
      }
      return {
        update: (values: unknown) => ({
          eq: (column: string, value: unknown) => {
            fake.updates.push({ table, values, column, value });
            return { select: async () => ({ data: [{ id: value }], error: null }) };
          },
        }),
      };
    },
  }),
}));

const { setInsuranceStatus } = await import("./actions");

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const CLIENT6 = "c0000000-0000-4000-8000-000000000006";

beforeEach(() => {
  fake.role = "scheduler";
  fake.updates = [];
});

describe("setInsuranceStatus", () => {
  it("AC-INS-02: scheduler1 позначає «Verified» — «Insurance status saved.», update саме для client6", async () => {
    const state = await setInsuranceStatus(null, form({ client_id: CLIENT6, insurance_status: "verified" }));
    expect(state).toEqual({ ok: true, message: "Insurance status saved." });
    expect(fake.updates).toEqual([
      { table: "clients", values: { insurance_status: "verified" }, column: "id", value: CLIENT6 },
    ]);
  });

  it("AC-INS-05: therapist1 напряму викликає дію «Verified» для client6 — відмова, запиту update до clients немає", async () => {
    fake.role = "therapist";
    const state = await setInsuranceStatus(null, form({ client_id: CLIENT6, insurance_status: "verified" }));
    expect(state?.ok).toBe(false);
    expect(state?.message).not.toBe("Insurance status saved.");
    expect(fake.updates).toEqual([]);
  });
});
