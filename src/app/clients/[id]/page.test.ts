import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRole } from "@/lib/auth";

// Картка клієнта за прямим посиланням (AC-CARD-05, AC-CARD-08, AC-CARD-16): якщо база під RLS не повернула картку,
// сторінка показує лише повідомлення PM для ролі — без імені й полів. Саме обмеження — tests/db/own-clients.test.ts.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

const fake = vi.hoisted(() => ({
  role: "therapist" as AppRole,
  row: null as Record<string, unknown> | null,
  queried: [] as string[],
}));

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getCurrentUser: async () => ({
    supabase: {
      from: () => ({
        select: () => ({
          eq: (_col: string, id: string) => {
            fake.queried.push(id);
            return { maybeSingle: async () => ({ data: fake.row, error: null }) };
          },
        }),
      }),
    },
    id: "therapist1",
    email: "therapist1@example.test",
    fullName: null,
    role: fake.role,
  }),
}));

const { default: ClientCardPage } = await import("./page");

function texts(node: unknown, out: string[] = []): string[] {
  if (node === null || node === undefined || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) texts(child, out);
    return out;
  }
  if (typeof node === "object" && "props" in node) texts((node as { props: { children?: unknown } }).props.children, out);
  return out;
}

const CLIENT9 = "9b2f6c1e-4d1a-4c8e-9f3a-2b7d5e8c1a09";
const render = async (id: string) =>
  texts(await ClientCardPage({ params: Promise.resolve({ id }) } as PageProps<"/clients/[id]">));

beforeEach(() => {
  fake.role = "therapist";
  fake.row = null;
  fake.queried = [];
});

describe("ClientCardPage", () => {
  it("AC-CARD-05: картку чужого клієнта база не віддала — лише «You don't have access to this client.», без даних", async () => {
    const page = await render(CLIENT9);
    expect(fake.queried).toEqual([CLIENT9]);
    expect(page).toContain("You don't have access to this client.");
    expect(page).not.toContain("Client type");
    expect(page).not.toContain("Email");
  });

  it("AC-CARD-08: за посиланням на картку клієнта з простроченим утриманням — та сама відмова; некоректний id до бази не йде", async () => {
    const page = await render("not-a-uuid");
    expect(fake.queried).toEqual([]);
    expect(page).toContain("You don't have access to this client.");
  });

  it("AC-CARD-04: свою картку терапевт бачить з усіма даними анкети, у старих картках — «Not provided»", async () => {
    fake.row = {
      full_name: "Client Six",
      email: "client6@example.test",
      client_type: "adult",
      date_of_birth: null,
      session_language: "English",
      guardian_name: null,
      guardian_email: null,
    };
    const page = await render(CLIENT9);
    expect(page).toContain("Client Six");
    expect(page).toContain("client6@example.test");
    expect(page).toContain("Not provided");
    expect(page).not.toContain("You don't have access to this client.");
  });

  it("AC-CARD-16: неіснуюча картка — планувальнику «This client card doesn't exist.», терапевту — відмова, без даних", async () => {
    fake.role = "scheduler";
    const scheduler = await render(CLIENT9);
    expect(scheduler).toContain("This client card doesn't exist.");
    expect(scheduler).not.toContain("You don't have access to this client.");
    expect(scheduler).not.toContain("Client type");

    fake.role = "therapist";
    const therapist = await render(CLIENT9);
    expect(therapist).toContain("You don't have access to this client.");
    expect(therapist).not.toContain("This client card doesn't exist.");
    expect(therapist).not.toContain("Client type");
  });
});
