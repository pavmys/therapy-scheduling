import { describe, expect, it, vi } from "vitest";

// Сторінка карток клієнтів для терапевта недоступна: у зрізі 1 окремого списку клієнтів у нього немає.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getCurrentUser: async () => ({ supabase: {}, id: "therapist1", email: "therapist1@example.test", fullName: null, role: "therapist" }),
}));

const { default: ClientsPage } = await import("./page");

describe("ClientsPage", () => {
  it("AC-HOLD-40: терапевт не має окремого списку клієнтів — сторінку перенаправлено", async () => {
    await expect(ClientsPage({ searchParams: Promise.resolve({}) } as PageProps<"/clients">)).rejects.toThrow("redirect:/");
  });
});
