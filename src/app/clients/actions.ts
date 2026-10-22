"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import {
  DUPLICATE_EMAIL_MESSAGE,
  FORBIDDEN_MESSAGE,
  INVALID_CLIENT_MESSAGE,
  UNEXPECTED_MESSAGE,
} from "@/lib/clients/messages";
import { validateClient } from "@/lib/clients/validate";

export type CreateClientState = { ok: boolean; message: string } | null;

// Створення картки клієнта (AC-HOLD-10, -11, -15, -16, -34, -35). Права перевіряємо тут і в RLS
// (clients_insert_staff): рендер сторінки — не межа безпеки.
export async function createClientCard(
  _prev: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) {
    return { ok: false, message: FORBIDDEN_MESSAGE };
  }

  const result = validateClient(
    String(formData.get("full_name") ?? ""),
    String(formData.get("email") ?? ""),
  );
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  const { fullName, email } = result.value;
  const { error } = await user.supabase.from("clients").insert({ full_name: fullName, email });

  if (error) {
    // 23505 — unique (email); 23514 — check-обмеження таблиці (ті самі правила, що validateClient).
    if (error.code === "23505") return { ok: false, message: DUPLICATE_EMAIL_MESSAGE };
    if (error.code === "23514") return { ok: false, message: INVALID_CLIENT_MESSAGE };
    return { ok: false, message: UNEXPECTED_MESSAGE };
  }

  revalidatePath("/clients");
  return { ok: true, message: `Client created: ${fullName} (${email}).` };
}
