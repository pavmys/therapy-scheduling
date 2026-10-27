"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import {
  DUPLICATE_CHILD_MESSAGE,
  DUPLICATE_EMAIL_MESSAGE,
  FORBIDDEN_MESSAGE,
  UNEXPECTED_MESSAGE,
} from "@/lib/clients/messages";
import { type CardErrors, type CardFields, firstCardError, validateCard } from "@/lib/clients/validate";
import { practiceToday } from "@/lib/time";

export type CreateClientState = {
  ok: boolean;
  message: string;
  values?: CardFields;
  /** Помилки біля полів форми (AC-CARD-12); `message` — перша з них або помилка всієї картки. */
  errors?: CardErrors;
} | null;

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

// Порушення унікальності: email дорослого (unique (email)) чи дублікат картки дитини (clients_child_identity_key).
const isChildDuplicate = (error: { message?: string; details?: string }) =>
  `${error.message ?? ""} ${error.details ?? ""}`.includes("clients_child_identity_key");

// Картка клієнта з анкети (AC-CARD-01, -02, -03, -06, -12, -13; правила імені й email зрізу 1 — AC-HOLD-10, -11,
// -15, -16, -34, -35, -39, -41). Порядок (design.md impl-client-cards, D4): getClaims і роль з profiles → валідація →
// insert клієнтом користувача, де діють RLS (clients_insert_staff), column grants і унікальні індекси.
// Рендер сторінки — не межа безпеки.
export async function createClientCard(
  _prev: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) {
    return { ok: false, message: FORBIDDEN_MESSAGE };
  }

  const values: CardFields = {
    clientType: field(formData, "client_type"),
    fullName: field(formData, "full_name"),
    dateOfBirth: field(formData, "date_of_birth"),
    sessionLanguage: field(formData, "session_language"),
    email: field(formData, "email"),
    guardianName: field(formData, "guardian_name"),
    guardianEmail: field(formData, "guardian_email"),
  };

  // Усі помилки одразу, кожна біля свого поля; введене лишається у формі (AC-CARD-03, AC-CARD-12).
  const result = validateCard(values, practiceToday(new Date()));
  if (!result.ok) return { ok: false, message: firstCardError(result.errors), values, errors: result.errors };

  const card = result.value;
  const { error } = await user.supabase.from("clients").insert(card);

  if (error) {
    // 23505 — дублікат картки дитини (AC-CARD-13) або email дорослого (AC-HOLD-16, AC-HOLD-34);
    // 23514 — check-обмеження таблиці (ті самі правила, що validateCard).
    if (error.code === "23505") {
      return { ok: false, message: isChildDuplicate(error) ? DUPLICATE_CHILD_MESSAGE : DUPLICATE_EMAIL_MESSAGE, values };
    }
    return { ok: false, message: UNEXPECTED_MESSAGE, values };
  }

  revalidatePath("/clients");
  revalidatePath("/slots");
  const contact = card.email ?? `guardian ${card.guardian_email}`;
  return { ok: true, message: `Client card created: ${card.full_name} (${contact}).` };
}
