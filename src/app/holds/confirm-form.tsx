"use client";

import { useActionState } from "react";
import { confirmHold, type ConfirmHoldState } from "./actions";

export function ConfirmForm({ holdId }: { holdId: string }) {
  const [state, formAction, pending] = useActionState<ConfirmHoldState, FormData>(confirmHold, null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="hold_id" value={holdId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-3 py-1 text-sm font-medium text-background disabled:opacity-50"
      >
        Confirm
      </button>
      {state ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-green-700" : "text-sm text-red-600"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
