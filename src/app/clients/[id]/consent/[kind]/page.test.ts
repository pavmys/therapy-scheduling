import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRole } from "@/lib/auth";

// Сторінка документа згоди /clients/<id>/consent/<slug> (AC-DOC-04, -09, -10, -11; design.md impl-consent-documents,
// «UI і компоненти»). Що повернула база під RLS — те й показуємо; саме обмеження RLS — тести бази.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));

type ClientRow = { full_name: string; client_type: string; guardian_name: string | null };
type DocRow = { id: string; kind: string; prepared_on: string; signed_at: string | null };
type Query = { table: string; columns: string; filters: [string, string][] };

const fake = vi.hoisted(() => ({
  signedIn: true,
  role: "scheduler" as AppRole,
  client: null as ClientRow | null,
  doc: null as DocRow | null,
  queries: [] as Query[],
}));

// Підмінено лише клієнт Supabase: getCurrentUser справжній — JWT через getClaims, роль із profiles.
// Кожен ланцюжок .eq(…) записуємо, щоб перевірити фільтри запиту.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getClaims: async () =>
        fake.signedIn
          ? { data: { claims: { sub: "user-1", email: "user1@example.test" } }, error: null }
          : { data: null, error: null },
    },
    from: (table: string) => ({
      select: (columns: string) => {
        const query: Query = { table, columns, filters: [] };
        if (table !== "profiles") fake.queries.push(query);
        const chain = {
          eq: (column: string, value: string) => {
            query.filters.push([column, value]);
            return chain;
          },
          maybeSingle: async () => {
            if (table === "profiles") {
              return { data: { email: "user1@example.test", full_name: null, role: fake.role }, error: null };
            }
            if (table === "clients") return { data: fake.client, error: null };
            if (table === "consent_documents") return { data: fake.doc, error: null };
            return { data: null, error: null };
          },
        };
        return chain;
      },
    }),
  }),
}));

const { default: ConsentDocumentPage } = await import("./page");
const { SignConsentForm } = await import("@/app/clients/[id]/consent-forms");
const { StaffNav } = await import("@/app/staff-nav");
const { CONSENT_BODY } = await import("@/lib/consent/documents");

type El = { type: unknown; props: Record<string, unknown> };

// Дерево сторінки без DOM: компоненти не розгортаємо — шукаємо елементи за типом і збираємо текст.
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

// Рядки сторінки: текст кожного <p> і AlertDescription склеєно, щоб «Client: » і ім'я дали один рядок.
function lines(tree: unknown): string[] {
  return elements(tree)
    .filter((el) => el.type === "p" || (typeof el.type === "function" && el.type.name === "AlertDescription"))
    .map((el) => texts(el.props.children).join(""));
}

const CLIENT6 = "c0000000-0000-4000-8000-000000000006";
const CLIENT7 = "c0000000-0000-4000-8000-000000000007";
const CLIENT9 = "c0000000-0000-4000-8000-000000000009";
const DOC_ID = "d0000000-0000-4000-8000-000000000007";

const CLIENT7_ROW: ClientRow = { full_name: "Client Seven", client_type: "child", guardian_name: "Guardian Seven" };
const CLIENT6_ROW: ClientRow = { full_name: "Client Six", client_type: "adult", guardian_name: null };

async function renderPage(id: string, kind: string) {
  const tree = await ConsentDocumentPage({
    params: Promise.resolve({ id, kind }),
  } as PageProps<"/clients/[id]/consent/[kind]">);
  const all = elements(tree);
  return {
    lines: lines(tree),
    nav: all.find((el) => el.type === StaffNav),
    signForms: all.filter((el) => el.type === SignConsentForm),
    byTestId: (testId: string) => all.find((el) => el.props["data-testid"] === testId),
  };
}

beforeEach(() => {
  fake.signedIn = true;
  fake.role = "scheduler";
  fake.client = null;
  fake.doc = null;
  fake.queries = [];
});

describe("ConsentDocumentPage", () => {
  it("AC-DOC-04: scheduler1 відкриває «Release of information» client7 — заголовок, Client, Guardian, Prepared, текст, «Not signed», «Mark as signed»", async () => {
    fake.client = CLIENT7_ROW;
    fake.doc = { id: DOC_ID, kind: "release_of_information", prepared_on: "2026-11-04", signed_at: null };
    const page = await renderPage(CLIENT7, "release-of-information");

    expect(page.nav?.props.title).toBe("Release of information");
    expect(page.lines).toEqual([
      "Client: Client Seven",
      "Guardian: Guardian Seven",
      "Prepared: 2026-11-04",
      ...CONSENT_BODY.release_of_information,
      "Not signed",
    ]);
    expect(page.signForms).toHaveLength(1);
    expect(page.signForms[0].props).toMatchObject({ documentId: DOC_ID, title: "Release of information", primary: true });
    expect(page.byTestId("consent-sign-forbidden")).toBeUndefined();

    // Документ шукаємо за клієнтом і типом зі slug.
    expect(fake.queries).toEqual([
      { table: "clients", columns: "full_name, client_type, guardian_name", filters: [["id", CLIENT7]] },
      {
        table: "consent_documents",
        columns: "id, kind, prepared_on, signed_at",
        filters: [
          ["client_id", CLIENT7],
          ["kind", "release_of_information"],
        ],
      },
    ]);
  });

  it("AC-DOC-04: документ дорослого client6 — без рядка «Guardian:»", async () => {
    fake.client = CLIENT6_ROW;
    fake.doc = { id: DOC_ID, kind: "consent_to_treatment", prepared_on: "2026-11-04", signed_at: null };
    const page = await renderPage(CLIENT6, "consent-to-treatment");

    expect(page.nav?.props.title).toBe("Consent to treatment");
    expect(page.lines).toContain("Client: Client Six");
    expect(page.lines).toContain("Prepared: 2026-11-04");
    expect(page.lines.some((line) => line.startsWith("Guardian:"))).toBe(false);
  });

  it("AC-DOC-05: підписаний документ — «Signed 2026-11-04 10:15» і без «Mark as signed»", async () => {
    fake.client = CLIENT6_ROW;
    fake.doc = {
      id: DOC_ID,
      kind: "consent_to_treatment",
      prepared_on: "2026-11-04",
      signed_at: "2026-11-04T18:15:00Z",
    };
    const page = await renderPage(CLIENT6, "consent-to-treatment");

    expect(texts(page.byTestId("consent-state")?.props.children).join("")).toBe("Signed 2026-11-04 10:15");
    expect(page.lines).not.toContain("Not signed");
    expect(page.signForms).toHaveLength(0);
    expect(page.byTestId("consent-sign-forbidden")).toBeUndefined();
  });

  it("AC-DOC-09: therapist1 відкриває «Consent to treatment» свого client6 — текст і «Not signed», замість кнопки — повідомлення PM", async () => {
    fake.role = "therapist";
    fake.client = CLIENT6_ROW;
    fake.doc = { id: DOC_ID, kind: "consent_to_treatment", prepared_on: "2026-11-04", signed_at: null };
    const page = await renderPage(CLIENT6, "consent-to-treatment");

    expect(page.lines).toContain("Client: Client Six");
    for (const paragraph of CONSENT_BODY.consent_to_treatment) expect(page.lines).toContain(paragraph);
    expect(texts(page.byTestId("consent-state")?.props.children).join("")).toBe("Not signed");
    expect(page.signForms).toHaveLength(0);
    expect(texts(page.byTestId("consent-sign-forbidden")).join("")).toBe(
      "Only schedulers and admins can mark documents as signed.",
    );
  });

  it("AC-DOC-10: therapist1 відкриває документ чужого client9 — лише «You don't have access to this client.», без тексту й даних", async () => {
    fake.role = "therapist";
    // RLS: рядок картки чужого клієнта не повертається; документ у базі є, але його не запитуємо.
    fake.client = null;
    fake.doc = { id: DOC_ID, kind: "consent_to_treatment", prepared_on: "2026-11-04", signed_at: null };
    const page = await renderPage(CLIENT9, "consent-to-treatment");

    expect(page.lines).toEqual(["You don't have access to this client."]);
    expect(fake.queries.map((q) => q.table)).toEqual(["clients"]);
    expect(page.lines.some((line) => line.startsWith("Client:"))).toBe(false);
    for (const paragraph of CONSENT_BODY.consent_to_treatment) expect(page.lines).not.toContain(paragraph);
    expect(page.byTestId("consent-document")).toBeUndefined();
    expect(page.signForms).toHaveLength(0);
  });

  it("AC-DOC-11: без входу — сторінка входу, жодного запиту до clients чи consent_documents", async () => {
    fake.signedIn = false;
    fake.client = CLIENT6_ROW;
    fake.doc = { id: DOC_ID, kind: "consent_to_treatment", prepared_on: "2026-11-04", signed_at: null };

    await expect(renderPage(CLIENT6, "consent-to-treatment")).rejects.toThrow("redirect:/login");
    expect(fake.queries).toEqual([]);
  });

  it("AC-DOC-04: staff і невідомий slug або документа ще немає — notFound()", async () => {
    fake.client = CLIENT6_ROW;
    fake.doc = { id: DOC_ID, kind: "consent_to_treatment", prepared_on: "2026-11-04", signed_at: null };
    await expect(renderPage(CLIENT6, "unknown-document")).rejects.toThrow("notFound");
    // Невідомий slug — до consent_documents не звертаємось.
    expect(fake.queries.map((q) => q.table)).toEqual(["clients"]);

    fake.queries = [];
    fake.doc = null;
    await expect(renderPage(CLIENT6, "release-of-information")).rejects.toThrow("notFound");
    expect(fake.queries.map((q) => q.table)).toEqual(["clients", "consent_documents"]);
  });
});
