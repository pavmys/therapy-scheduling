import { beforeEach, describe, expect, it, vi } from "vitest";

// Підмінений Supabase (ADR 0002): роль користувача й результат rpc задає тест; getCurrentUser справжній.
const fake = vi.hoisted(() => ({
  role: "scheduler" as string | null,
  rpcError: null as { message: string } | null,
  calls: [] as { fn: string; args: unknown }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getClaims: async () => ({ data: { claims: { sub: "user-1", email: "scheduler1@example.test" } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: fake.role ? { role: fake.role } : null }),
        }),
      }),
    }),
    rpc: async (fn: string, args: unknown) => {
      fake.calls.push({ fn, args });
      return { data: null, error: fake.rpcError };
    },
  }),
}));

const { prepareConsentDocuments, signConsentDocument } = await import("./consent-actions");

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const CLIENT6 = "c0000000-0000-4000-8000-000000000006";
const DOC1 = "d0000000-0000-4000-8000-000000000001";
const SIGN_FORBIDDEN = "Only schedulers and admins can mark documents as signed.";
const UNEXPECTED = "Could not update the consent documents. Try again.";

beforeEach(() => {
  fake.role = "scheduler";
  fake.rpcError = null;
  fake.calls = [];
});

describe("prepareConsentDocuments", () => {
  it("AC-DOC-02: scheduler1 формує документи для client6 — rpc prepare_consent_documents саме для client6, ok", async () => {
    const state = await prepareConsentDocuments(null, form({ client_id: CLIENT6 }));
    expect(state).toEqual({ ok: true, message: "" });
    expect(fake.calls).toEqual([{ fn: "prepare_consent_documents", args: { p_client_id: CLIENT6 } }]);
  });

  it("AC-DOC-02: терапевт не формує документи — відмова без запиту до бази", async () => {
    fake.role = "therapist";
    const state = await prepareConsentDocuments(null, form({ client_id: CLIENT6 }));
    expect(state).toEqual({ ok: false, message: "Only schedulers and admins can prepare consent documents." });
    expect(fake.calls).toEqual([]);
  });

  it("AC-DOC-02: некоректний id клієнта — збій без запиту до бази", async () => {
    const state = await prepareConsentDocuments(null, form({ client_id: "not-a-uuid" }));
    expect(state).toEqual({ ok: false, message: UNEXPECTED });
    expect(fake.calls).toEqual([]);
  });

  it("AC-DOC-02: база відмовила CONSENT_FORBIDDEN — текст відмови формування", async () => {
    fake.rpcError = { message: "CONSENT_FORBIDDEN" };
    const state = await prepareConsentDocuments(null, form({ client_id: CLIENT6 }));
    expect(state).toEqual({ ok: false, message: "Only schedulers and admins can prepare consent documents." });
    expect(fake.calls).toHaveLength(1);
  });
});

describe("signConsentDocument", () => {
  it("AC-DOC-05: scheduler1 позначає «Consent to treatment» підписаним — rpc sign_consent_document саме для документа", async () => {
    const state = await signConsentDocument(null, form({ document_id: DOC1 }));
    expect(state).toEqual({ ok: true, message: "" });
    expect(fake.calls).toEqual([{ fn: "sign_consent_document", args: { p_document_id: DOC1 } }]);
  });

  it("AC-DOC-06: scheduler2 позначає другий документ підписаним — rpc sign_consent_document, ok", async () => {
    const state = await signConsentDocument(null, form({ document_id: DOC1 }));
    expect(state?.ok).toBe(true);
    expect(fake.calls.map((c) => c.fn)).toEqual(["sign_consent_document"]);
  });

  it("AC-DOC-09: терапевт напряму викликає дію — «Only schedulers and admins can mark documents as signed.», запиту немає", async () => {
    fake.role = "therapist";
    const state = await signConsentDocument(null, form({ document_id: DOC1 }));
    expect(state).toEqual({ ok: false, message: SIGN_FORBIDDEN });
    expect(fake.calls).toEqual([]);
  });

  it("AC-DOC-09: база відмовила SIGN_FORBIDDEN — той самий текст PM", async () => {
    fake.rpcError = { message: "SIGN_FORBIDDEN" };
    const state = await signConsentDocument(null, form({ document_id: DOC1 }));
    expect(state).toEqual({ ok: false, message: SIGN_FORBIDDEN });
  });

  it("AC-DOC-05: інша помилка бази або некоректний id — «Could not update the consent documents. Try again.»", async () => {
    fake.rpcError = { message: "boom" };
    expect(await signConsentDocument(null, form({ document_id: DOC1 }))).toEqual({ ok: false, message: UNEXPECTED });

    fake.rpcError = null;
    fake.calls = [];
    expect(await signConsentDocument(null, form({ document_id: "x" }))).toEqual({ ok: false, message: UNEXPECTED });
    expect(fake.calls).toEqual([]);
  });
});
