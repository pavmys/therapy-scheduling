import { formatPracticeDateTime } from "@/lib/time";

// Документи згоди клієнта (openspec/specs/consent-documents; design.md impl-consent-documents, D1).
// Значення в базі — public.consent_documents.kind (check consent_documents_kind_check); назви, порядок, slug сторінки
// документа (і сталий текст — задача 3) — тут, а не в базі: тип і ім'я клієнта не змінюються, тож документ завжди
// відтворюється однаково.
// Назви, стани й рядки — дослівно з AC PM («Припущення» HryhoriiHaponiukQuitCode/therapy-scheduling-spec#34).
export type ConsentKind = "consent_to_treatment" | "cancellation_policy" | "release_of_information";

type ConsentDocumentInfo = { kind: ConsentKind; title: string; slug: string };

/** Набір у порядку показу: дорослий — перші два, дитина — усі три (AC-DOC-02, AC-DOC-03). */
export const CONSENT_DOCUMENTS: readonly ConsentDocumentInfo[] = [
  { kind: "consent_to_treatment", title: "Consent to treatment", slug: "consent-to-treatment" },
  { kind: "cancellation_policy", title: "Cancellation policy acknowledgement", slug: "cancellation-policy" },
  { kind: "release_of_information", title: "Release of information", slug: "release-of-information" },
];

export const NO_CONSENT_DOCUMENTS_MESSAGE = "No consent documents yet."; // AC-DOC-01
export const ALL_CONSENT_DOCUMENTS_SIGNED_MESSAGE = "All consent documents signed."; // AC-DOC-06
export const NOT_SIGNED_LABEL = "Not signed";

// Тексти відмови для дій. Позначка підписом — дослівно з AC-DOC-09; формування й збій — тексту PM немає
// (короткі речення «що сталося → що робити» за DESIGN.md, розділ 6).
export const SIGN_FORBIDDEN_MESSAGE = "Only schedulers and admins can mark documents as signed.";
export const PREPARE_FORBIDDEN_MESSAGE = "Only schedulers and admins can prepare consent documents.";
export const CONSENT_UNEXPECTED_MESSAGE = "Could not update the consent documents. Try again.";
// Збій читання документів — не «документів немає»: замість списку й кнопки формування (DESIGN.md, розділ 6).
export const CONSENT_LOAD_ERROR_MESSAGE = "Could not load consent documents. Try again.";

const BY_KIND = new Map(CONSENT_DOCUMENTS.map((d, i) => [d.kind, { ...d, order: i }]));

export function consentTitle(kind: string): string {
  return BY_KIND.get(kind as ConsentKind)?.title ?? kind;
}

/** Документи в порядку набору (база порядку не гарантує). */
export function sortConsentDocuments<T extends { kind: string }>(docs: readonly T[]): T[] {
  const order = (kind: string) => BY_KIND.get(kind as ConsentKind)?.order ?? CONSENT_DOCUMENTS.length;
  return [...docs].sort((a, b) => order(a.kind) - order(b.kind));
}

/** Стан документа: «Not signed» або «Signed РРРР-ММ-ДД ГГ:ХХ» у часовому поясі практики (AC-DOC-05). */
export function consentStateLabel(signedAt: string | null): string {
  return signedAt ? `Signed ${formatPracticeDateTime(new Date(signedAt))}` : NOT_SIGNED_LABEL;
}

/**
 * Рядок картки: документів немає — «No consent documents yet.»; є непідписані — «Missing signatures: …» через кому
 * в порядку набору; підписано всі — «All consent documents signed.» (AC-DOC-01, -02, -05, -06).
 */
export function consentSummary(docs: readonly { kind: string; signed_at: string | null }[]): string {
  if (docs.length === 0) return NO_CONSENT_DOCUMENTS_MESSAGE;
  const missing = sortConsentDocuments(docs).filter((d) => d.signed_at === null);
  return missing.length === 0
    ? ALL_CONSENT_DOCUMENTS_SIGNED_MESSAGE
    : `Missing signatures: ${missing.map((d) => consentTitle(d.kind)).join(", ")}`;
}
