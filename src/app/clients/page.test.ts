import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRole } from "@/lib/auth";

// Список клієнтів терапевта (AC-CARD-09) і порожній список staff (AC-CARD-15). Що віддає база під RLS, задає тест
// (підмінений Supabase, ADR 0002); саме обмеження «лише свої клієнти» перевіряють tests/db/own-clients.test.ts.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

const fake = vi.hoisted(() => ({ role: "therapist" as AppRole | null, rows: [] as unknown[] }));

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getCurrentUser: async () => ({
    supabase: {
      // Ланцюжок запиту: select → order → limit → or; await на будь-якій ланці — рядки, які задав тест.
      from: () => {
        const query = {
          select: () => query,
          order: () => query,
          limit: () => query,
          or: () => query,
          then: (resolve: (r: { data: unknown[]; error: null }) => unknown) => resolve({ data: fake.rows, error: null }),
        };
        return query;
      },
    },
    id: "therapist2",
    email: "therapist2@example.test",
    fullName: null,
    role: fake.role,
  }),
}));

const { default: ClientsPage } = await import("./page");

// Текстові вузли дерева React-елементів (без рендера в DOM); компоненти-функції розгортаємо.
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
  if (typeof node === "object" && "props" in node) {
    const el = node as { type: unknown; props: Record<string, unknown> };
    if (typeof el.type === "function" && el.type.name === "ClientsTable") {
      return texts((el.type as (p: unknown) => unknown)(el.props), out);
    }
    texts(el.props.children, out);
  }
  return out;
}

const render = async (searchParams: Record<string, string> = {}) =>
  texts(await ClientsPage({ searchParams: Promise.resolve(searchParams) } as PageProps<"/clients">));

beforeEach(() => {
  fake.role = "therapist";
  fake.rows = [];
});

describe("ClientsPage — терапевт", () => {
  it("AC-CARD-09: терапевт без утримань і сеансів бачить текст PM і жодної картки", async () => {
    const page = await render();
    expect(page).toContain("No clients yet. Clients appear here when a scheduler holds a slot with you.");
    expect(page).not.toContain("Name");
  });

  it("AC-CARD-04: терапевт бачить список своїх клієнтів, які повернула база, без форми й пошуку", async () => {
    fake.rows = [
      {
        id: "c7",
        full_name: "Client Seven",
        email: null,
        client_type: "child",
        date_of_birth: "2015-03-02",
        session_language: "Spanish",
        guardian_name: "Guardian Seven",
        guardian_email: "guardian7@example.test",
      },
    ];
    const page = await render();
    expect(page).toContain("Client Seven");
    expect(page).toContain("Guardian: Guardian Seven, guardian7@example.test");
    expect(page).not.toContain("New client card");
    expect(page).not.toContain("No clients yet. Clients appear here when a scheduler holds a slot with you.");
  });

  it("користувач без ролі — на головну з повідомленням про відсутність доступу", async () => {
    fake.role = null;
    await expect(ClientsPage({ searchParams: Promise.resolve({}) } as PageProps<"/clients">)).rejects.toThrow(
      "redirect:/",
    );
  });
});

describe("ClientsPage — планувальник і адміністратор", () => {
  it.each(["scheduler", "admin"] as const)(
    "AC-CARD-15: %s без жодної картки бачить текст PM, а кнопка нової картки доступна",
    async (role) => {
      fake.role = role;
      const page = await render();
      expect(page).toContain("No clients yet. Create a client card from an intake form.");
      expect(page).toContain("New client card");
      expect(page).not.toContain("Contact");
    },
  );

  it("AC-CARD-15: пошук, що нічого не знайшов, — не «ще немає карток», а «No clients found.»", async () => {
    fake.role = "scheduler";
    const page = await render({ q: "nobody" });
    expect(page).toContain("No clients found.");
    expect(page).not.toContain("No clients yet. Create a client card from an intake form.");
  });
});
