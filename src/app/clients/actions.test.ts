import { beforeEach, describe, expect, it, vi } from "vitest";

// Підмінений Supabase (ADR 0002): роль користувача й результат insert задає тест.
const fake = vi.hoisted(() => ({
  role: "scheduler" as string | null,
  insertError: null as { code: string } | null,
  inserted: [] as unknown[],
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
        insert: async (row: unknown) => {
          fake.inserted.push(row);
          return { error: fake.insertError };
        },
      };
    },
  }),
}));

const { createClientCard } = await import("./actions");

function form(fullName: string, email: string) {
  const data = new FormData();
  data.set("full_name", fullName);
  data.set("email", email);
  return data;
}

beforeEach(() => {
  fake.role = "scheduler";
  fake.insertError = null;
  fake.inserted = [];
});

describe("createClientCard", () => {
  it("AC-HOLD-10: планувальник створює клієнта з іменем і email", async () => {
    const state = await createClientCard(null, form("Client Three", "client3@example.test"));
    expect(state?.ok).toBe(true);
    expect(fake.inserted).toEqual([{ full_name: "Client Three", email: "client3@example.test" }]);
  });

  it("AC-HOLD-11: порожнє ім'я — клієнта не створено", async () => {
    const state = await createClientCard(null, form("", "client3@example.test"));
    expect(state).toEqual({ ok: false, message: "Enter the client's name and a valid email." });
    expect(fake.inserted).toEqual([]);
  });

  it("AC-HOLD-15: email без @ — клієнта не створено", async () => {
    const state = await createClientCard(null, form("Client Three", "client3example.test"));
    expect(state).toEqual({ ok: false, message: "Enter the client's name and a valid email." });
    expect(fake.inserted).toEqual([]);
  });

  it("AC-HOLD-16: дублікат email — повідомлення PM", async () => {
    fake.insertError = { code: "23505" };
    const state = await createClientCard(null, form("Client One", "client1@example.test"));
    expect(state).toEqual({ ok: false, message: "A client with this email already exists." });
  });

  it("AC-HOLD-34: дублікат з великими літерами й пробілами — той самий email", async () => {
    fake.insertError = { code: "23505" };
    const state = await createClientCard(null, form("Client One", " Client1@Example.TEST "));
    expect(fake.inserted).toEqual([{ full_name: "Client One", email: "client1@example.test" }]);
    expect(state).toEqual({ ok: false, message: "A client with this email already exists." });
  });

  it("AC-HOLD-35: email зберігається малими літерами без пробілів", async () => {
    const state = await createClientCard(null, form("Client Three", " Client3@Example.TEST "));
    expect(state).toEqual({ ok: true, message: "Client created: Client Three (client3@example.test)." });
    expect(fake.inserted).toEqual([{ full_name: "Client Three", email: "client3@example.test" }]);
  });

  it("адміністратор теж створює клієнта", async () => {
    fake.role = "admin";
    expect((await createClientCard(null, form("Client Three", "client3@example.test")))?.ok).toBe(true);
  });

  it("терапевт і користувач без профілю не створюють клієнта", async () => {
    for (const role of ["therapist", null]) {
      fake.role = role;
      const state = await createClientCard(null, form("Client Three", "client3@example.test"));
      expect(state).toEqual({ ok: false, message: "Only schedulers and admins can create clients." });
    }
    expect(fake.inserted).toEqual([]);
  });
});
