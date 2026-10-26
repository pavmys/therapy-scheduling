"use client";

import { useActionState, useState } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { createClientCard, type CreateClientState } from "./actions";

// Форма картки клієнта з анкети (AC-CARD-01, AC-CARD-02, AC-CARD-03): тип першим — він визначає, які поля контакту
// потрібні. Після помилки дія повертає введені значення, і форма показує їх знову (key — нова форма на кожну відповідь).
export function ClientForm() {
  const [state, formAction, pending] = useActionState<CreateClientState, FormData>(createClientCard, null);
  const values = state?.values;
  const [clientType, setClientType] = useState(values?.clientType || "adult");

  return (
    <form key={JSON.stringify(state)} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="card-type">Client type</Label>
        <NativeSelect
          id="card-type"
          name="client_type"
          defaultValue={values?.clientType || clientType}
          onChange={(e) => setClientType(e.target.value)}
        >
          <NativeSelectOption value="adult">Adult</NativeSelectOption>
          <NativeSelectOption value="child">Child</NativeSelectOption>
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="card-name">Name</Label>
        <Input id="card-name" name="full_name" type="text" defaultValue={values?.fullName} />
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="card-dob">Date of birth</Label>
          <Input
            id="card-dob"
            name="date_of_birth"
            type="date"
            className="w-auto tabular-nums"
            defaultValue={values?.dateOfBirth}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="card-language">Session language</Label>
          <NativeSelect id="card-language" name="session_language" defaultValue={values?.sessionLanguage ?? ""}>
            <NativeSelectOption value="">Select a language…</NativeSelectOption>
            <NativeSelectOption value="English">English</NativeSelectOption>
            <NativeSelectOption value="Spanish">Spanish</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>
      {clientType === "child" ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="card-guardian-name">Guardian&apos;s name</Label>
            <Input id="card-guardian-name" name="guardian_name" type="text" defaultValue={values?.guardianName} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="card-guardian-email">Guardian&apos;s email</Label>
            {/* type="text": формат перевіряє сервер, щоб повідомлення було однаковим (AC-CARD-03). */}
            <Input
              id="card-guardian-email"
              name="guardian_email"
              type="text"
              autoComplete="off"
              defaultValue={values?.guardianEmail}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="card-email">Email</Label>
          {/* type="text": формат перевіряє сервер, щоб повідомлення було однаковим (AC-HOLD-15). */}
          <Input id="card-email" name="email" type="text" autoComplete="off" defaultValue={values?.email} />
        </div>
      )}
      {state ? <ActionMessage ok={state.ok} message={state.message} /> : null}
      <Button type="submit" disabled={pending} className="self-start">
        Create client card
      </Button>
    </form>
  );
}
