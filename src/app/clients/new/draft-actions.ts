"use server";

import { proposeDraft } from "@/lib/ai/draft";
import { DRAFT_REFUSED_MESSAGE, intakeOutcome, type IntakeState } from "@/lib/ai/intake";
import { productModel } from "@/lib/ai/openrouter";
import { MAX_REQUEST_LENGTH, sanitizeRequest } from "@/lib/ai/prompts/draft";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { FORBIDDEN_MESSAGE } from "@/lib/clients/messages";
import type { CardFields } from "@/lib/clients/validate";
import { practiceToday } from "@/lib/time";

export type IntakeDraftState = {
  state: IntakeState;
  message: string;
  /** Значення ВСІЄЇ форми після дії: чернетка (ready / incomplete) або те, що було у формі (інші стани). */
  values: CardFields;
};

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

function currentValues(formData: FormData): CardFields {
  return {
    clientType: field(formData, "client_type"),
    fullName: field(formData, "full_name"),
    dateOfBirth: field(formData, "date_of_birth"),
    sessionLanguage: field(formData, "session_language"),
    email: field(formData, "email"),
    guardianName: field(formData, "guardian_name"),
    guardianEmail: field(formData, "guardian_email"),
  };
}

// Чернетка картки клієнта з тексту звернення (design.md impl-client-intake-draft: Auth, D1–D7).
// Порядок: getClaims і роль з profiles → межі тексту → модель → правила коду (normalizeDraft) → значення форми.
// Нічого не пише в базу (D7, AC-INTAKE-03, -07): картку створює лише людина дією createClientCard.
// Текст звернення не зберігаємо й не логуємо (Non-goals PM).
export async function requestIntakeDraft(
  _prev: IntakeDraftState | null,
  formData: FormData,
): Promise<IntakeDraftState> {
  const values = currentValues(formData);

  // Роль — до виклику моделі: інакше будь-хто витратить денний ліміт (AC-INTAKE-09).
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) return { state: "forbidden", message: FORBIDDEN_MESSAGE, values };

  // Межа PM — 2000 символів; порожній текст чи довший за межу — без виклику моделі, форма не змінюється.
  const raw = field(formData, "request_text");
  const text = sanitizeRequest(raw);
  if (text === "" || raw.length > MAX_REQUEST_LENGTH) {
    return { state: "refused", message: DRAFT_REFUSED_MESSAGE, values };
  }

  const today = practiceToday(new Date());
  const model = productModel();
  const outcome = model
    ? intakeOutcome(await proposeDraft({ text, today }, model), today)
    : intakeOutcome({ ok: false, reason: "no_key", message: "model key is not set" }, today);

  // Чернетка замінює всю форму (ready / incomplete); інакше поля лишаються як були (AC-INTAKE-06, -07, -08).
  return { state: outcome.state, message: outcome.message, values: outcome.fields ?? values };
}
