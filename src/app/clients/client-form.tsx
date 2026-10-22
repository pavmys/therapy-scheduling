"use client";

import { useActionState } from "react";
import { createClientCard, type CreateClientState } from "./actions";

const inputClass = "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export function ClientForm() {
  const [state, formAction, pending] = useActionState<CreateClientState, FormData>(
    createClientCard,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="full_name" type="text" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Email
        {/* type="text": формат перевіряє сервер, щоб повідомлення було однаковим (AC-HOLD-15). */}
        <input name="email" type="text" autoComplete="off" className={inputClass} />
      </label>
      {state ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "text-sm text-green-700" : "text-sm text-red-600"}
        >
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
      >
        Create client
      </button>
    </form>
  );
}
