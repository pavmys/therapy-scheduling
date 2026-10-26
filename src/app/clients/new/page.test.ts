import { describe, expect, it, vi } from "vitest";

// Нова картка клієнта за прямим посиланням під роллю терапевта (AC-CARD-06): лише відмова PM і навігація
// терапевта, форми немає. Запис однаково відхиляють Server Action і RLS — src/app/clients/actions.test.ts,
// tests/db/client-cards.test.ts.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getCurrentUser: async () => ({
    supabase: {},
    id: "therapist1",
    email: "therapist1@example.test",
    fullName: null,
    role: "therapist",
  }),
}));

const { default: NewClientCardPage } = await import("./page");

type Element = { type: unknown; props: Record<string, unknown> };

// Елементи дерева React (без рендера в DOM): тип і props кожного вузла.
function elements(node: unknown, out: Element[] = []): Element[] {
  if (Array.isArray(node)) {
    for (const child of node) elements(child, out);
  } else if (node && typeof node === "object" && "props" in node) {
    out.push(node as Element);
    elements((node as Element).props.children, out);
  }
  return out;
}

const nameOf = (type: unknown) => (typeof type === "function" ? type.name : String(type));

describe("NewClientCardPage — терапевт", () => {
  it("AC-CARD-06: терапевт за прямим посиланням бачить лише відмову PM і свою навігацію, без форми", async () => {
    const nodes = elements(await NewClientCardPage());
    const names = nodes.map((n) => nameOf(n.type));

    const message = nodes.find((n) => nameOf(n.type) === "ActionMessage");
    expect(message?.props).toMatchObject({ ok: false, message: "Only schedulers and admins can create client cards." });
    expect(nodes.find((n) => nameOf(n.type) === "StaffNav")?.props).toMatchObject({ role: "therapist" });
    expect(names).not.toContain("ClientForm");
  });
});
