import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRole } from "@/lib/auth";

// Блок «Consent documents» у картці клієнта (AC-DOC-01, -02, -05, -06, -09; design.md impl-consent-documents, «UI»).
// Що повернула база під RLS — те й показуємо; кнопки — лише staff. Саме обмеження RLS — тести бази.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

type DocRow = { id: string; kind: string; signed_at: string | null };

const fake = vi.hoisted(() => ({
  role: "scheduler" as AppRole,
  docs: [] as DocRow[],
  docsError: null as { message: string } | null,
  consentQueries: [] as { columns: string; column: string; value: string }[],
}));

const CLIENT6_ROW = {
  full_name: "Client Six",
  email: "client6@example.test",
  client_type: "adult",
  date_of_birth: "1990-05-14",
  session_language: "English",
  guardian_name: null,
  guardian_email: null,
  insurance_status: "verified",
};

// Підмінено лише клієнт Supabase: getCurrentUser справжній — JWT через getClaims, роль із profiles.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getClaims: async () => ({ data: { claims: { sub: "user-1", email: "user1@example.test" } }, error: null }),
    },
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: string) => {
          if (table === "profiles") {
            const profile = { email: "user1@example.test", full_name: null, role: fake.role };
            return { maybeSingle: async () => ({ data: profile, error: null }) };
          }
          if (table === "consent_documents") {
            fake.consentQueries.push({ columns, column, value });
            return Promise.resolve(
              fake.docsError ? { data: null, error: fake.docsError } : { data: fake.docs, error: null },
            );
          }
          return { maybeSingle: async () => ({ data: CLIENT6_ROW, error: null }) };
        },
      }),
    }),
  }),
}));

const { default: ClientCardPage } = await import("./page");
const { PrepareConsentForm, SignConsentForm } = await import("./consent-forms");
const { default: Link } = await import("next/link");

type El = { type: unknown; props: Record<string, unknown> };

// Дерево сторінки без DOM. Локальні серверні компоненти ConsentDocuments і ConsentDocumentList розгортаємо викликом; клієнтські форми
// не рендеримо — шукаємо їх елементи за типом.
function expand(node: unknown): unknown {
  if (node === null || node === undefined || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(expand);
  if ("props" in node && "type" in node) {
    const el = node as El;
    if (typeof el.type === "function" && ["ConsentDocuments", "ConsentDocumentList"].includes(el.type.name)) {
      return expand((el.type as (p: unknown) => unknown)(el.props));
    }
    return { ...el, props: { ...el.props, children: expand(el.props.children) } };
  }
  return node;
}

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
  if (typeof node === "object" && "props" in node) texts((node as El).props.children, out);
  return out;
}

function elements(node: unknown, out: El[] = []): El[] {
  if (node === null || node === undefined || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) elements(child, out);
    return out;
  }
  if ("props" in node && "type" in node) {
    const el = node as El;
    out.push(el);
    elements(el.props.children, out);
  }
  return out;
}

const CLIENT6 = "c0000000-0000-4000-8000-000000000006";
const DOC_TREATMENT = "d0000000-0000-4000-8000-000000000001";
const DOC_CANCEL = "d0000000-0000-4000-8000-000000000002";

async function renderCard() {
  const tree = expand(await ClientCardPage({ params: Promise.resolve({ id: CLIENT6 }) } as PageProps<"/clients/[id]">));
  const all = elements(tree);
  const byTestId = (id: string) => all.find((el) => el.props["data-testid"] === id);
  const block = byTestId("consent-documents");
  const list = byTestId("consent-list");
  return {
    block,
    list,
    summary: texts(byTestId("consent-summary")).join(""),
    listTexts: list ? texts(list) : [],
    links: list ? elements(list).filter((el) => el.type === Link) : [],
    prepareForms: all.filter((el) => el.type === PrepareConsentForm),
    signForms: all.filter((el) => el.type === SignConsentForm),
  };
}

beforeEach(() => {
  fake.role = "scheduler";
  fake.docs = [];
  fake.docsError = null;
  fake.consentQueries = [];
});

describe("ClientCardPage — Consent documents", () => {
  it("AC-DOC-01: scheduler1 відкриває картку client6 без документів — «No consent documents yet.», жодного документа, кнопка формування", async () => {
    const card = await renderCard();
    expect(fake.consentQueries).toEqual([{ columns: "id, kind, signed_at", column: "client_id", value: CLIENT6 }]);
    expect(card.block).toBeDefined();
    expect(card.summary).toBe("No consent documents yet.");
    expect(card.list).toBeUndefined();
    expect(card.signForms).toHaveLength(0);
    expect(card.prepareForms).toHaveLength(1);
    expect(card.prepareForms[0].props.clientId).toBe(CLIENT6);
  });

  // Рев'ю PR pavmys/therapy-scheduling#59: збій читання — не «документів немає», інакше staff запропонували б
  // сформувати документи, які вже є.
  it("AC-DOC-01: збій читання документів — не «No consent documents yet.» і без кнопки формування, а повідомлення про помилку", async () => {
    fake.docsError = { message: "network error" };
    const card = await renderCard();
    expect(card.summary).toBe("");
    expect(card.list).toBeUndefined();
    expect(card.prepareForms).toHaveLength(0);
    expect(card.signForms).toHaveLength(0);
    const message = elements(card.block).find((el) => typeof el.type === "function" && el.type.name === "ActionMessage");
    expect(message?.props).toMatchObject({ ok: false, message: "Could not load consent documents. Try again." });
  });

  it("AC-DOC-02: два непідписані документи — обидва в порядку набору зі станом «Not signed», «Mark as signed» для кожного", async () => {
    // База повертає документи у зворотному порядку.
    fake.docs = [
      { id: DOC_CANCEL, kind: "cancellation_policy", signed_at: null },
      { id: DOC_TREATMENT, kind: "consent_to_treatment", signed_at: null },
    ];
    const card = await renderCard();
    expect(card.listTexts).toEqual([
      "Document",
      "State",
      "Actions",
      "Consent to treatment",
      "Not signed",
      "Cancellation policy acknowledgement",
      "Not signed",
    ]);
    expect(card.summary).toBe("Missing signatures: Consent to treatment, Cancellation policy acknowledgement");
    expect(card.signForms.map((f) => f.props.documentId)).toEqual([DOC_TREATMENT, DOC_CANCEL]);
    expect(card.signForms.map((f) => f.props.title)).toEqual([
      "Consent to treatment",
      "Cancellation policy acknowledgement",
    ]);
    expect(card.prepareForms).toHaveLength(0);
  });

  it("AC-DOC-02: назва кожного документа в таблиці картки — посилання на сторінку документа /clients/<id>/consent/<slug>", async () => {
    fake.docs = [
      { id: DOC_CANCEL, kind: "cancellation_policy", signed_at: null },
      { id: DOC_TREATMENT, kind: "consent_to_treatment", signed_at: "2026-11-04T18:15:00Z" },
    ];
    const card = await renderCard();
    expect(card.links.map((l) => [texts(l.props.children).join(""), l.props.href])).toEqual([
      ["Consent to treatment", `/clients/${CLIENT6}/consent/consent-to-treatment`],
      ["Cancellation policy acknowledgement", `/clients/${CLIENT6}/consent/cancellation-policy`],
    ]);
  });

  it("AC-DOC-05: «Consent to treatment» підписано 2026-11-04 10:15 — «Signed 2026-11-04 10:15», «Mark as signed» лише для другого", async () => {
    fake.docs = [
      { id: DOC_TREATMENT, kind: "consent_to_treatment", signed_at: "2026-11-04T18:15:00Z" },
      { id: DOC_CANCEL, kind: "cancellation_policy", signed_at: null },
    ];
    const card = await renderCard();
    expect(card.listTexts).toContain("Signed 2026-11-04 10:15");
    expect(card.listTexts.filter((t) => t === "Not signed")).toHaveLength(1);
    expect(card.summary).toBe("Missing signatures: Cancellation policy acknowledgement");
    expect(card.signForms.map((f) => f.props.documentId)).toEqual([DOC_CANCEL]);
  });

  it("AC-DOC-06: підписано всі документи — обидва «Signed …», «All consent documents signed.», кнопок підпису немає", async () => {
    fake.docs = [
      { id: DOC_TREATMENT, kind: "consent_to_treatment", signed_at: "2026-11-04T18:15:00Z" },
      { id: DOC_CANCEL, kind: "cancellation_policy", signed_at: "2026-11-04T19:00:00Z" },
    ];
    const card = await renderCard();
    expect(card.listTexts.filter((t) => t.startsWith("Signed "))).toHaveLength(2);
    expect(card.listTexts).not.toContain("Not signed");
    expect(card.summary).toBe("All consent documents signed.");
    expect(card.summary).not.toContain("Missing signatures");
    expect(card.signForms).toHaveLength(0);
    expect(card.prepareForms).toHaveLength(0);
  });

  it("AC-DOC-09: therapist1 у картці свого client6 бачить документи, стани й підсумок, але не кнопки формування чи підпису", async () => {
    fake.role = "therapist";
    fake.docs = [
      { id: DOC_TREATMENT, kind: "consent_to_treatment", signed_at: null },
      { id: DOC_CANCEL, kind: "cancellation_policy", signed_at: "2026-11-04T18:15:00Z" },
    ];
    const card = await renderCard();
    expect(card.listTexts).toEqual([
      "Document",
      "State",
      "Consent to treatment",
      "Not signed",
      "Cancellation policy acknowledgement",
      "Signed 2026-11-04 10:15",
    ]);
    expect(card.summary).toBe("Missing signatures: Consent to treatment");
    expect(card.signForms).toHaveLength(0);
    expect(card.prepareForms).toHaveLength(0);

    // Терапевт без документів — порожній стан без кнопки формування.
    fake.docs = [];
    const empty = await renderCard();
    expect(empty.summary).toBe("No consent documents yet.");
    expect(empty.prepareForms).toHaveLength(0);
  });
});
