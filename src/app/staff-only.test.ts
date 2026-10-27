import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRole } from "@/lib/auth";

// Сторінки планувальника за прямим посиланням (AC-HOLD-44): терапевт бачить лише відмову PM, а до бази сторінка
// не звертається — тож жодних утримань, імен чи email клієнтів. Зміни утримань дії відхиляють окремо (AC-HOLD-08,
// AC-HOLD-14 у actions.test.ts), а RLS — tests/db.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

const fake = vi.hoisted(() => ({ role: "therapist" as AppRole | null, queried: [] as string[] }));

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getCurrentUser: async () => ({
    supabase: {
      from: (table: string) => {
        fake.queried.push(table);
        throw new Error(`query:${table}`);
      },
    },
    id: "therapist1",
    email: "therapist1@example.test",
    fullName: null,
    role: fake.role,
  }),
}));

const { default: HoldsPage } = await import("./holds/page");
const { default: SlotsPage } = await import("./slots/page");

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

const THERAPIST2 = "2b7d5e8c-1a09-4c8e-9f3a-9b2f6c1e4d1a";

beforeEach(() => {
  fake.role = "therapist";
  fake.queried = [];
});

describe("сторінки планувальника для терапевта", () => {
  it("AC-HOLD-44: список утримань і слоти therapist2 — лише «Only schedulers and admins can view this page.», без запитів до бази", async () => {
    const holds = texts(await HoldsPage());
    const slots = texts(
      await SlotsPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ therapist: THERAPIST2, date: "2026-11-03" }),
      }),
    );
    for (const page of [holds, slots]) {
      expect(page).toContain("Only schedulers and admins can view this page.");
      expect(page.join(" ")).not.toMatch(/@example\.test.*@|Held until|Client/);
    }
    expect(fake.queried).toEqual([]);
  });

  it("користувач без ролі — на головну, як і раніше", async () => {
    fake.role = null;
    await expect(HoldsPage()).rejects.toThrow("redirect:/");
    await expect(SlotsPage({ searchParams: Promise.resolve({}) } as PageProps<"/slots">)).rejects.toThrow("redirect:/");
  });
});
