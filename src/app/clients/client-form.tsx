"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientCard, type CreateClientState } from "./actions";

export function ClientForm() {
  const [state, formAction, pending] = useActionState<CreateClientState, FormData>(
    createClientCard,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="client-full-name">Name</Label>
        <Input id="client-full-name" name="full_name" type="text" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="client-email">Email</Label>
        {/* type="text": формат перевіряє сервер, щоб повідомлення було однаковим (AC-HOLD-15). */}
        <Input id="client-email" name="email" type="text" autoComplete="off" />
      </div>
      {state ? <ActionMessage ok={state.ok} message={state.message} /> : null}
      <Button type="submit" disabled={pending} className="self-start">
        Create client
      </Button>
    </form>
  );
}
