"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import {
  DUPLICATE_EMAIL_MESSAGE,
  FORBIDDEN_MESSAGE,
  INCOMPLETE_CARD_MESSAGE,
  UNEXPECTED_MESSAGE,
} from "@/lib/clients/messages";
import { type CardFields, validateCard } from "@/lib/clients/validate";
import { practiceToday } from "@/lib/time";

export type CreateClientState = { ok: boolean; message: string; values?: CardFields } | null;

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

// Картка клієнта з анкети (AC-CARD-01, -02, -03, -06; правила імені й email зрізу 1 — AC-HOLD-10, -11, -15, -16,
// -34, -35, -39, -41). Порядок (design.md impl-client-cards, D4): getClaims і роль з profiles → валідація → insert
// клієнтом користувача, де діють RLS (clients_insert_staff) і column grants. Рендер сторінки — не межа безпеки.
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

  // Введене лишається у формі після будь-якої помилки (AC-CARD-03).
  const result = validateCard(values, practiceToday(new Date()));
  if (!result.ok) return { ok: false, message: result.message, values };

  const card = result.value;
  const { error } = await user.supabase.from("clients").insert(card);

  if (error) {
    // 23505 — unique (email) дорослого; 23514 — check-обмеження таблиці (ті самі правила, що validateCard).
    if (error.code === "23505") return { ok: false, message: DUPLICATE_EMAIL_MESSAGE, values };
    if (error.code === "23514") return { ok: false, message: INCOMPLETE_CARD_MESSAGE, values };
    return { ok: false, message: UNEXPECTED_MESSAGE, values };
  }

  revalidatePath("/clients");
  revalidatePath("/slots");
  const contact = card.email ?? `guardian ${card.guardian_email}`;
  return { ok: true, message: `Client card created: ${card.full_name} (${contact}).` };
}
