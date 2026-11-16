import type { CardFields } from "@/lib/clients/validate";
import type { DraftResult } from "./draft";
import type { IntakeDraft } from "./schema";

// Чернетка картки клієнта: правила полів і стани для людини (design.md impl-client-intake-draft, D2, D3, D6).
// Модель пропонує, код вирішує: усе, що можна перевірити кодом, перевіряємо тут, а не в промпті.
// Без process.env і без "server-only" — чиста логіка, її однаково імпортують Server Action, тести й живий eval.

// Тексти — дослівно з AC PM (HryhoriiHaponiukQuitCode/therapy-scheduling-spec#36).
export const DRAFT_READY_MESSAGE = "Draft ready. Check the fields and create the card."; // AC-INTAKE-01, -02
export const DRAFT_REFUSED_MESSAGE =
  "This text can't be used to draft a client card. Paste the client's request or fill in the form manually."; // AC-INTAKE-06, -07
export const ASSISTANT_UNAVAILABLE_MESSAGE = "The assistant is unavailable right now. Fill in the form manually."; // AC-INTAKE-08

// AC-INTAKE-04, -05: «Missing: …» — порожні обов'язкові поля в порядку форми через кому.
export function incompleteMessage(missing: readonly string[]): string {
  return `Draft is incomplete. Missing: ${missing.join(", ")}. Fill them in manually.`;
}

export type IntakeState = "ready" | "incomplete" | "refused" | "unavailable" | "forbidden";

export type IntakeOutcome = {
  state: IntakeState;
  message: string;
  /** Нові значення ВСІЄЇ форми — лише для ready / incomplete; інакше форма не змінюється. */
  fields?: CardFields;
  missing?: string[];
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Справжня календарна дата YYYY-MM-DD (2026-02-30 — ні). */
export function isCalendarDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Повних років на дату `today` (обидві — YYYY-MM-DD). Рядки ISO порівнюються як дати. */
export function ageOn(dateOfBirth: string, today: string): number {
  const years = Number(today.slice(0, 4)) - Number(dateOfBirth.slice(0, 4));
  return today.slice(5) >= dateOfBirth.slice(5) ? years : years - 1;
}

const clean = (value: string | null | undefined) => (value ?? "").trim();

// «Email — як у тексті, малими літерами без пробілів на початку й у кінці … Email без „@“ — поле порожнє.»
export function normalizeDraftEmail(value: string | null | undefined): string {
  const email = clean(value).toLowerCase();
  return email.includes("@") ? email : "";
}

/**
 * Правила PM («Припущення» #36) поверх відповіді моделі:
 * - дата народження — лише справжня дата, не пізніша за «сьогодні» (AC-INTAKE-05);
 * - Child, якщо модель так сказала (дорослий пише про дитину) або клієнту < 18 років; інакше Adult;
 * - для дорослого — лише email клієнта; для дитини — лише поля опікуна;
 * - мова — лише English / Spanish.
 */
export function normalizeDraft(draft: IntakeDraft, today: string): { fields: CardFields; missing: string[] } {
  const rawDob = clean(draft.dateOfBirth);
  const dateOfBirth = isCalendarDate(rawDob) && rawDob <= today ? rawDob : "";
  const minor = dateOfBirth !== "" && ageOn(dateOfBirth, today) < 18;
  const isChild = draft.clientType === "child" || minor;
  const sessionLanguage = draft.sessionLanguage === "English" || draft.sessionLanguage === "Spanish" ? draft.sessionLanguage : "";

  const fields: CardFields = {
    clientType: isChild ? "child" : "adult",
    fullName: clean(draft.fullName),
    dateOfBirth,
    sessionLanguage,
    email: isChild ? "" : normalizeDraftEmail(draft.email),
    guardianName: isChild ? clean(draft.guardianName) : "",
    guardianEmail: isChild ? normalizeDraftEmail(draft.guardianEmail) : "",
  };
  return { fields, missing: missingFields(fields) };
}

// Порядок форми: Name, Date of birth, Session language, далі Email (дорослий) або Guardian name, Guardian email (дитина).
// Client type порожнім не буває: за правилом PM «інакше — Adult».
function missingFields(fields: CardFields): string[] {
  const contact: [string, string][] =
    fields.clientType === "child"
      ? [
          ["Guardian name", fields.guardianName],
          ["Guardian email", fields.guardianEmail],
        ]
      : [["Email", fields.email]];
  const required: [string, string][] = [
    ["Name", fields.fullName],
    ["Date of birth", fields.dateOfBirth],
    ["Session language", fields.sessionLanguage],
    ...contact,
  ];
  return required.filter(([, value]) => value === "").map(([label]) => label);
}

/** Результат моделі → що бачить людина (D6: будь-який збій — один стан AC-INTAKE-08). */
export function intakeOutcome(result: DraftResult, today: string): IntakeOutcome {
  if (!result.ok) return { state: "unavailable", message: ASSISTANT_UNAVAILABLE_MESSAGE };
  if (result.draft.status === "refused") return { state: "refused", message: DRAFT_REFUSED_MESSAGE };
  const { fields, missing } = normalizeDraft(result.draft, today);
  return missing.length === 0
    ? { state: "ready", message: DRAFT_READY_MESSAGE, fields, missing }
    : { state: "incomplete", message: incompleteMessage(missing), fields, missing };
}
