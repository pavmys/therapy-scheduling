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

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

// Картка дорослого з анкети; правила імені й email зрізу 1 перевіряємо в цій самій формі, де решта полів
// заповнена правильно (design.md impl-client-cards, D2; до відповіді PM на Sofiia-pm/therapy-scheduling-spec#20).
const adult = (fullName: string, email: string) =>
  form({ client_type: "adult", full_name: fullName, email, date_of_birth: "1990-05-14", session_language: "English" });

const adultRow = (fullName: string, email: string) => ({
  client_type: "adult",
  full_name: fullName,
  date_of_birth: "1990-05-14",
  session_language: "English",
  email,
  guardian_name: null,
  guardian_email: null,
});

const child = {
  client_type: "child",
  full_name: "Client Seven",
  date_of_birth: "2015-03-02",
  session_language: "Spanish",
  guardian_name: "Guardian Seven",
  guardian_email: "guardian7@example.test",
};

beforeEach(() => {
  fake.role = "scheduler";
  fake.insertError = null;
  fake.inserted = [];
});

describe("createClientCard", () => {
  it("AC-CARD-01: scheduler1 створює картку дорослого Client Six з усіма даними анкети", async () => {
    const state = await createClientCard(null, adult("Client Six", "client6@example.test"));
    expect(state).toEqual({ ok: true, message: "Client card created: Client Six (client6@example.test)." });
    expect(fake.inserted).toEqual([adultRow("Client Six", "client6@example.test")]);
  });

  it("AC-CARD-02: картка дитини Client Seven з опікуном — без власного email, з даними опікуна", async () => {
    const state = await createClientCard(null, form(child));
    expect(state).toEqual({
      ok: true,
      message: "Client card created: Client Seven (guardian guardian7@example.test).",
    });
    expect(fake.inserted).toEqual([
      {
        client_type: "child",
        full_name: "Client Seven",
        date_of_birth: "2015-03-02",
        session_language: "Spanish",
        email: null,
        guardian_name: "Guardian Seven",
        guardian_email: "guardian7@example.test",
      },
    ]);
  });

  it("AC-CARD-03: без імені чи email опікуна картку дитини не створено, введене лишається у формі", async () => {
    const card = { ...child, full_name: "Client Eight", date_of_birth: "2016-01-10", session_language: "English" };
    for (const missing of ["guardian_name", "guardian_email"]) {
      const state = await createClientCard(null, form({ ...card, [missing]: "" }));
      expect(state?.ok).toBe(false);
      expect(state?.message).toBe("Enter the guardian's name and a valid email.");
      expect(state?.values).toMatchObject({
        clientType: "child",
        fullName: "Client Eight",
        dateOfBirth: "2016-01-10",
        sessionLanguage: "English",
      });
    }
    expect(fake.inserted).toEqual([]);
  });

  it("AC-CARD-06: терапевт не створює картку — повідомлення PM, запису немає", async () => {
    fake.role = "therapist";
    const state = await createClientCard(null, adult("Client Six", "client6@example.test"));
    expect(state).toEqual({ ok: false, message: "Only schedulers and admins can create client cards." });
    expect(fake.inserted).toEqual([]);
  });

  it("AC-HOLD-10: планувальник створює клієнта з іменем і email", async () => {
    const state = await createClientCard(null, adult("Client Three", "client3@example.test"));
    expect(state?.ok).toBe(true);
    expect(fake.inserted).toEqual([adultRow("Client Three", "client3@example.test")]);
  });

  it("AC-HOLD-11: порожнє ім'я — клієнта не створено", async () => {
    const state = await createClientCard(null, adult("", "client3@example.test"));
    expect(state).toMatchObject({ ok: false, message: "Enter the client's name and a valid email." });
    expect(fake.inserted).toEqual([]);
  });

  it("AC-HOLD-15: email без @ — клієнта не створено", async () => {
    const state = await createClientCard(null, adult("Client Three", "client3example.test"));
    expect(state).toMatchObject({ ok: false, message: "Enter the client's name and a valid email." });
    expect(fake.inserted).toEqual([]);
  });

  it("AC-HOLD-16: дублікат email — повідомлення PM", async () => {
    fake.insertError = { code: "23505" };
    const state = await createClientCard(null, adult("Client One", "client1@example.test"));
    expect(state).toMatchObject({ ok: false, message: "A client with this email already exists." });
  });

  it("AC-HOLD-34: дублікат з великими літерами й пробілами — той самий email", async () => {
    fake.insertError = { code: "23505" };
    const state = await createClientCard(null, adult("Client One", " Client1@Example.TEST "));
    expect(fake.inserted).toEqual([adultRow("Client One", "client1@example.test")]);
    expect(state).toMatchObject({ ok: false, message: "A client with this email already exists." });
  });

  it("AC-HOLD-35: email зберігається малими літерами без пробілів", async () => {
    const state = await createClientCard(null, adult("Client Three", " Client3@Example.TEST "));
    expect(state).toEqual({ ok: true, message: "Client card created: Client Three (client3@example.test)." });
    expect(fake.inserted).toEqual([adultRow("Client Three", "client3@example.test")]);
  });

  it("AC-HOLD-39: некоректні форми email — клієнта не створено", async () => {
    for (const email of ["client3@example", "client3@@example.test", "@example.test", "client 3@example.test"]) {
      expect(await createClientCard(null, adult("Client Three", email))).toMatchObject({
        ok: false,
        message: "Enter the client's name and a valid email.",
      });
    }
    expect(fake.inserted).toEqual([]);
  });

  it("AC-HOLD-41: ім'я з пробілів відхилено, « Client Four » збережено як «Client Four»", async () => {
    expect(await createClientCard(null, adult("   ", "client5@example.test"))).toMatchObject({
      ok: false,
      message: "Enter the client's name and a valid email.",
    });
    const state = await createClientCard(null, adult(" Client Four ", "client4@example.test"));
    expect(state).toEqual({ ok: true, message: "Client card created: Client Four (client4@example.test)." });
    expect(fake.inserted).toEqual([adultRow("Client Four", "client4@example.test")]);
  });

  it("адміністратор теж створює картку", async () => {
    fake.role = "admin";
    expect((await createClientCard(null, adult("Client Three", "client3@example.test")))?.ok).toBe(true);
  });

  it("користувач без ролі не створює картку", async () => {
    fake.role = null;
    const state = await createClientCard(null, adult("Client Three", "client3@example.test"));
    expect(state).toEqual({ ok: false, message: "Only schedulers and admins can create client cards." });
    expect(fake.inserted).toEqual([]);
  });

  it("без дати народження, мови чи з датою в майбутньому картку не створено (текст розробника до відповіді PM, #21)", async () => {
    const base = { client_type: "adult", full_name: "Client Six", email: "client6@example.test" };
    for (const extra of [
      { date_of_birth: "", session_language: "English" },
      { date_of_birth: "1990-05-14", session_language: "" },
      { date_of_birth: "2999-01-01", session_language: "English" },
      { date_of_birth: "1990-02-30", session_language: "English" },
    ]) {
      expect(await createClientCard(null, form({ ...base, ...extra }))).toMatchObject({
        ok: false,
        message: "Fill in all fields. The date of birth can't be later than today.",
      });
    }
    expect(fake.inserted).toEqual([]);
  });
});
