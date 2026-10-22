"use client";

import { useActionState } from "react";
import { holdSlot, type HoldSlotState } from "./actions";

type ClientOption = { id: string; full_name: string; email: string };

export function HoldForm({ slotId, clients }: { slotId: string; clients: ClientOption[] }) {
  const [state, formAction, pending] = useActionState<HoldSlotState, FormData>(holdSlot, null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="slot_id" value={slotId} />
      <select
        name="client_id"
        defaultValue=""
        aria-label="Client"
        className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="">Select a client…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name} ({c.email})
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-3 py-1 text-sm font-medium text-background disabled:opacity-50"
      >
        Hold
      </button>
      {state ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-green-700" : "text-sm text-red-600"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
