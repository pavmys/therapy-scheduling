"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { insuranceLabel, SETTABLE_INSURANCE_STATUSES } from "@/lib/clients/insurance";
import { type InsuranceState, setInsuranceStatus } from "./actions";

// Форма статусу перевірки страхування — лише для планувальника й адміністратора (AC-INS-02, AC-INS-03);
// терапевту сторінка її не рендерить (AC-INS-04). «Not set» вибрати не можна («Припущення» PM).
export function InsuranceForm({ clientId, status }: { clientId: string; status: string }) {
  const [state, formAction, pending] = useActionState<InsuranceState, FormData>(setInsuranceStatus, null);
  const current = (SETTABLE_INSURANCE_STATUSES as readonly string[]).includes(status) ? status : "";

  return (
    <form action={formAction} className="flex flex-col gap-3" data-testid="insurance-form">
      <input type="hidden" name="client_id" value={clientId} />
      <Label htmlFor="insurance_status">Insurance status</Label>
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect id="insurance_status" name="insurance_status" defaultValue={current} required>
          <NativeSelectOption value="" disabled>
            Select a status…
          </NativeSelectOption>
          {SETTABLE_INSURANCE_STATUSES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {insuranceLabel(value)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" disabled={pending}>
          Save insurance status
        </Button>
      </div>
      {state ? <ActionMessage ok={state.ok} message={state.message} /> : null}
    </form>
  );
}
