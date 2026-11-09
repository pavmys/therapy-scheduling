// Статус перевірки страхування в картці клієнта (openspec/specs/insurance-status; design.md impl-insurance-status).
// Значення в базі — public.clients.insurance_status (check clients_insurance_status_check); підписи — дослівно з AC PM.
export type InsuranceStatus = "not_set" | "verified" | "not_accepted" | "private_pay";

const LABELS: Record<InsuranceStatus, string> = {
  not_set: "Not set",
  verified: "Verified",
  not_accepted: "Not accepted",
  private_pay: "Private pay",
};

/** Статуси, які можна позначити: «Not set» — лише початковий, повернути його не можна («Припущення» PM). */
export const SETTABLE_INSURANCE_STATUSES = ["verified", "not_accepted", "private_pay"] as const satisfies readonly InsuranceStatus[];

export const INSURANCE_SAVED_MESSAGE = "Insurance status saved.";

export function insuranceLabel(status: string): string {
  return LABELS[status as InsuranceStatus] ?? LABELS.not_set;
}

/** Рядок картки «Insurance: <статус>» (AC-INS-01…04). */
export function insuranceLine(status: string): string {
  return `Insurance: ${insuranceLabel(status)}`;
}

/** Значення з форми → статус, який можна позначити; «not_set» і будь-що інше — null. */
export function parseInsuranceStatus(value: unknown): InsuranceStatus | null {
  return (SETTABLE_INSURANCE_STATUSES as readonly unknown[]).includes(value) ? (value as InsuranceStatus) : null;
}
