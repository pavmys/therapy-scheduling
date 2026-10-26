"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { holdSlot, type HoldSlotState } from "./actions";

type ClientOption = { id: string; full_name: string; email: string };

export function HoldForm({ slotId, clients }: { slotId: string; clients: ClientOption[] }) {
  const [state, formAction, pending] = useActionState<HoldSlotState, FormData>(holdSlot, null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="slot_id" value={slotId} />
      <NativeSelect name="client_id" defaultValue="" aria-label="Client" size="sm">
        <NativeSelectOption value="">Select a client…</NativeSelectOption>
        {clients.map((c) => (
          <NativeSelectOption key={c.id} value={c.id}>
            {c.full_name} ({c.email})
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button type="submit" size="sm" disabled={pending}>
        Hold
      </Button>
      {state ? <ActionMessage ok={state.ok} message={state.message} /> : null}
    </form>
  );
}
