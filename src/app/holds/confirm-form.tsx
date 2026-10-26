"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { Button } from "@/components/ui/button";
import { confirmHold, type ConfirmHoldState } from "./actions";

export function ConfirmForm({ holdId }: { holdId: string }) {
  const [state, formAction, pending] = useActionState<ConfirmHoldState, FormData>(confirmHold, null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="hold_id" value={holdId} />
      <Button type="submit" size="sm" disabled={pending}>
        Confirm
      </Button>
      {state ? <ActionMessage ok={state.ok} message={state.message} /> : null}
    </form>
  );
}
