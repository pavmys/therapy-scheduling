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
  signedIn: true,
  tables: [] as string[],
}));

// Підмінено лише клієнт Supabase: getCurrentUser справжній — JWT через getClaims, роль із profiles.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getClaims: async () =>
        fake.signedIn
          ? { data: { claims: { sub: "therapist1", email: "therapist1@example.test" } }, error: null }
          : { data: null, error: null },
    },
    from: (table: string) => {
      fake.tables.push(table);
      return {
        select: () => ({
          eq: (_col: string, id: string) => {
            if (table === "profiles") {
              const profile = { email: "therapist1@example.test", full_name: null, role: fake.role };
              return { maybeSingle: async () => ({ data: profile, error: null }) };
            }
            fake.queried.push(id);
            return { maybeSingle: async () => ({ data: fake.row, error: null }) };
          },
        }),
      };
    },
  }),
}));

const { default: ClientCardPage } = await import("./page");
const { InsuranceForm } = await import("./insurance-form");

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

// Усі React-елементи дерева сторінки (дочірні компоненти не рендеримо — шукаємо сам елемент за типом).
function elements(node: unknown, out: { type: unknown; props: Record<string, unknown> }[] = []) {
  if (node === null || node === undefined || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) elements(child, out);
    return out;
  }
  if ("props" in node && "type" in node) {
    const element = node as { type: unknown; props: Record<string, unknown> };
    out.push(element);
    elements(element.props.children, out);
  }
  return out;
}

const CLIENT9 = "9b2f6c1e-4d1a-4c8e-9f3a-2b7d5e8c1a09";
const renderTree = (id: string) => ClientCardPage({ params: Promise.resolve({ id }) } as PageProps<"/clients/[id]">);
const render = async (id: string) => texts(await renderTree(id));

beforeEach(() => {
  fake.role = "therapist";
  fake.row = null;
  fake.queried = [];
  fake.signedIn = true;
  fake.tables = [];
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

  it("AC-INS-04: терапевт у картці свого client6 бачить «Insurance: Not accepted», форми зміни статусу немає", async () => {
    const client6 = {
      full_name: "Client Six",
      email: "client6@example.test",
      client_type: "adult",
      date_of_birth: "1990-05-14",
      session_language: "English",
      guardian_name: null,
      guardian_email: null,
      insurance_status: "not_accepted",
    };
    fake.row = client6;
    const tree = await renderTree(CLIENT9);
    const page = texts(tree);
    expect(page).toContain("Insurance: Not accepted");
    expect(page).not.toContain("You don't have access to this client.");
    expect(elements(tree).filter((el) => el.type === InsuranceForm)).toHaveLength(0);
    expect(elements(tree).filter((el) => el.props["data-testid"] === "insurance-form")).toHaveLength(0);
    expect(page).not.toContain("Save insurance status");

    // Контроль детектора: планувальнику та сама картка показує форму.
    fake.role = "scheduler";
    fake.row = client6;
    const staffTree = await renderTree(CLIENT9);
    expect(texts(staffTree)).toContain("Insurance: Not accepted");
    expect(elements(staffTree).filter((el) => el.type === InsuranceForm)).toHaveLength(1);
  });

  it("AC-INS-06: гість без входу за прямим посиланням на картку — redirect на /login, картку з бази не запитано", async () => {
    fake.signedIn = false;
    fake.row = {
      full_name: "Client Six",
      email: "client6@example.test",
      client_type: "adult",
      date_of_birth: "1990-05-14",
      session_language: "English",
      guardian_name: null,
      guardian_email: null,
      insurance_status: "verified",
    };
    await expect(render(CLIENT9)).rejects.toThrow("redirect:/login");
    expect(fake.queried).toEqual([]);
    expect(fake.tables).not.toContain("clients");
  });
});
