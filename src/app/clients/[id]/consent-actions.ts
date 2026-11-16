"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import {
  CONSENT_UNEXPECTED_MESSAGE,
  PREPARE_FORBIDDEN_MESSAGE,
  SIGN_FORBIDDEN_MESSAGE,
} from "@/lib/consent/documents";
import { isUuid } from "@/lib/form";

export type ConsentActionState = { ok: boolean; message: string } | null;

// Коди помилок функцій prepare_consent_documents / sign_consent_document (міграція consent_documents).
const FORBIDDEN_BY_CODE: Record<string, string> = {
  CONSENT_FORBIDDEN: PREPARE_FORBIDDEN_MESSAGE,
  SIGN_FORBIDDEN: SIGN_FORBIDDEN_MESSAGE,
};

function failure(error: { message?: string } | null): ConsentActionState {
  return { ok: false, message: FORBIDDEN_BY_CODE[error?.message?.trim() ?? ""] ?? CONSENT_UNEXPECTED_MESSAGE };
}

// Сформувати документи згоди (AC-DOC-02, AC-DOC-03; design.md impl-consent-documents, D2, D5).
// Порядок: getClaims і роль з profiles → валідація → rpc клієнтом користувача. Набір за типом клієнта, «один набір
// на картку» й блокування — у функції бази; повторна спроба повертає наявний набір без окремого повідомлення (Q8).
export async function prepareConsentDocuments(
  _prev: ConsentActionState,
  formData: FormData,
): Promise<ConsentActionState> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) return { ok: false, message: PREPARE_FORBIDDEN_MESSAGE };

  const clientId = formData.get("client_id");
  if (!isUuid(clientId)) return { ok: false, message: CONSENT_UNEXPECTED_MESSAGE };

  const { error } = await user.supabase.rpc("prepare_consent_documents", { p_client_id: clientId });
  if (error) return failure(error);

  revalidatePath("/clients/[id]", "page");
  return { ok: true, message: "" };
}

// Позначити документ підписаним (AC-DOC-05, AC-DOC-06, AC-DOC-09; design.md D3, D5). Терапевт — відмова текстом PM
// без запиту; межа безпеки — функція бази. Повторна позначка не змінює час першого підпису (Q7).
export async function signConsentDocument(
  _prev: ConsentActionState,
  formData: FormData,
): Promise<ConsentActionState> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) return { ok: false, message: SIGN_FORBIDDEN_MESSAGE };

  const documentId = formData.get("document_id");
  if (!isUuid(documentId)) return { ok: false, message: CONSENT_UNEXPECTED_MESSAGE };

  const { error } = await user.supabase.rpc("sign_consent_document", { p_document_id: documentId });
  if (error) return failure(error);

  revalidatePath("/clients/[id]", "page");
  return { ok: true, message: "" };
}
