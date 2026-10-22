"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { uuidField } from "@/lib/form";
import {
  HOLD_ERROR_MESSAGES,
  SELECT_CLIENT_MESSAGE,
  holdErrorMessage,
} from "@/lib/holds/messages";
import { formatPracticeDateTime } from "@/lib/time";

export type HoldSlotState = { ok: boolean; message: string } | null;

// Утримання слоту за клієнтом. Усі правила (зайнятий, почався, перетин клієнта, роль) перевіряє
// функція Postgres hold_slot атомарно; тут — рання відмова за роллю й мапінг коду помилки в текст PM.
export async function holdSlot(_prev: HoldSlotState, formData: FormData): Promise<HoldSlotState> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) {
    return { ok: false, message: HOLD_ERROR_MESSAGES.HOLD_FORBIDDEN };
  }

  const slotId = uuidField(formData, "slot_id");
  const clientId = uuidField(formData, "client_id");
  if (!slotId) return { ok: false, message: HOLD_ERROR_MESSAGES.SLOT_NOT_FOUND };
  if (!clientId) return { ok: false, message: SELECT_CLIENT_MESSAGE };

  const { data, error } = await user.supabase.rpc("hold_slot", {
    p_slot_id: slotId,
    p_client_id: clientId,
  });
  if (error || !data) {
    return { ok: false, message: holdErrorMessage(error) };
  }

  revalidatePath("/slots");
  return { ok: true, message: `Held until ${formatPracticeDateTime(new Date(data.expires_at))}` };
}
