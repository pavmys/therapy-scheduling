import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRole } from "@/lib/auth";

// Головна сторінка: куди веде роль і що бачить користувач без ролі (AC-CARD-07, AC-CARD-11).
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

const signOut = vi.fn();
vi.mock("./login/actions", () => ({ signOut }));

let currentUser: { role: AppRole | null } | null = null;
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getCurrentUser: async () =>
    currentUser && { supabase: {}, id: "u1", email: "u1@example.test", fullName: null, ...currentUser },
}));

const { default: Home } = await import("./page");

// Усі текстові вузли й значення props дерева React-елементів (без рендера в DOM).
function collect(node: unknown, out: unknown[] = []): unknown[] {
  if (node === null || node === undefined || typeof node === "boolean") return out;
  if (Array.isArray(node)) {
    for (const child of node) collect(child, out);
    return out;
  }
  if (typeof node === "object" && "props" in node) {
    const { children, ...props } = (node as { props: Record<string, unknown> }).props;
    out.push(...Object.values(props));
    collect(children, out);
    return out;
  }
  out.push(node);
  return out;
}

describe("Home", () => {
  beforeEach(() => {
    currentUser = null;
  });

  it("AC-CARD-07: відвідувач без входу — перенаправлення на сторінку входу", async () => {
    await expect(Home()).rejects.toThrow("redirect:/login");
  });

  it("AC-CARD-11: користувач без ролі бачить лише повідомлення PM і вихід, а не сторінки ролей", async () => {
    currentUser = { role: null };
    const values = collect(await Home());
    expect(values).toContain("Your account has no access yet. Contact an administrator.");
    expect(values).toContain(signOut);
    expect(values).not.toContain("redirect:/slots");
  });

  it("AC-CARD-11: користувачі з роллю йдуть на свої сторінки, екрана без ролі не бачать", async () => {
    currentUser = { role: "scheduler" };
    await expect(Home()).rejects.toThrow("redirect:/slots");
    currentUser = { role: "admin" };
    await expect(Home()).rejects.toThrow("redirect:/slots");
    currentUser = { role: "therapist" };
    await expect(Home()).rejects.toThrow("redirect:/schedule");
  });
});
