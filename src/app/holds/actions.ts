"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { uuidField } from "@/lib/form";
import { HOLD_ERROR_MESSAGES, holdErrorMessage } from "@/lib/holds/messages";

export type ConfirmHoldState = { ok: boolean; message: string } | null;

// Підтвердження утримання, коли клієнт погодився. Правила (прострочене, уже підтверджене,
// слот почався, роль) перевіряє функція Postgres confirm_hold атомарно; тут — рання відмова
// за роллю й мапінг коду помилки в текст PM.
export async function confirmHold(_prev: ConfirmHoldState, formData: FormData): Promise<ConfirmHoldState> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) {
    return { ok: false, message: HOLD_ERROR_MESSAGES.CONFIRM_FORBIDDEN };
  }

  const holdId = uuidField(formData, "hold_id");
  if (!holdId) return { ok: false, message: HOLD_ERROR_MESSAGES.HOLD_NOT_FOUND };

  const { data, error } = await user.supabase.rpc("confirm_hold", { p_hold_id: holdId });
  if (error || !data) {
    return { ok: false, message: holdErrorMessage(error) };
  }

  revalidatePath("/holds");
  revalidatePath("/slots");
  return { ok: true, message: "Confirmed" };
}
