"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { INSURANCE_SAVED_MESSAGE, parseInsuranceStatus } from "@/lib/clients/insurance";
import { INSURANCE_FORBIDDEN_MESSAGE, INSURANCE_UNEXPECTED_MESSAGE } from "@/lib/clients/messages";
import { isUuid } from "@/lib/form";

export type InsuranceState = { ok: boolean; message: string } | null;

// Позначити статус перевірки страхування (AC-INS-02, AC-INS-03; design.md impl-insurance-status, D3).
// Порядок: getClaims і роль з profiles → валідація → update клієнтом користувача, де діють RLS
// (clients_update_insurance_staff) і колонковий grant. Межа безпеки — база (AC-INS-05); перевірка ролі тут —
// щоб терапевт отримав зрозумілу відмову без запиту update.
export async function setInsuranceStatus(_prev: InsuranceState, formData: FormData): Promise<InsuranceState> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) {
    return { ok: false, message: INSURANCE_FORBIDDEN_MESSAGE };
  }

  const clientId = formData.get("client_id");
  const status = parseInsuranceStatus(formData.get("insurance_status"));
  if (!isUuid(clientId) || !status) {
    return { ok: false, message: INSURANCE_UNEXPECTED_MESSAGE };
  }

  const { data, error } = await user.supabase
    .from("clients")
    .update({ insurance_status: status })
    .eq("id", clientId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, message: INSURANCE_UNEXPECTED_MESSAGE };
  }

  revalidatePath("/clients/[id]", "page");
  return { ok: true, message: INSURANCE_SAVED_MESSAGE };
}
