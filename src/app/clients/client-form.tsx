"use client";

import { useActionState, useState } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { CardErrorField } from "@/lib/clients/validate";
import { createClientCard, type CreateClientState } from "./actions";

// Помилка поля — під ним, пов'язана з полем через aria-describedby (DESIGN.md, розділ 7).
function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

// Форма картки клієнта з анкети (AC-CARD-01, AC-CARD-02, AC-CARD-03, AC-CARD-12, AC-CARD-13): тип першим — він визначає,
// які поля контакту потрібні. Після помилки дія повертає введені значення й помилки полів: усі одразу, кожна біля свого
// поля; key — нова форма на кожну відповідь, щоб defaultValue показали введене.
export function ClientForm() {
  const [state, formAction, pending] = useActionState<CreateClientState, FormData>(createClientCard, null);
  const values = state?.values;
  const errors = state?.errors ?? {};
  const [clientType, setClientType] = useState(values?.clientType || "adult");
  const describe = (field: CardErrorField) => (errors[field] ? `card-error-${field}` : undefined);
  const invalid = (field: CardErrorField) => (errors[field] ? true : undefined);

  return (
    <form key={JSON.stringify(state)} action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="card-type">Client type</Label>
        <NativeSelect
          id="card-type"
          name="client_type"
          defaultValue={values ? values.clientType : clientType}
          onChange={(e) => setClientType(e.target.value)}
          aria-invalid={invalid("clientType")}
          aria-describedby={describe("clientType")}
        >
          <NativeSelectOption value="adult">Adult</NativeSelectOption>
          <NativeSelectOption value="child">Child</NativeSelectOption>
        </NativeSelect>
        <FieldError id="card-error-clientType" message={errors.clientType} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="card-name">Name</Label>
        <Input
          id="card-name"
          name="full_name"
          type="text"
          defaultValue={values?.fullName}
          aria-invalid={invalid("fullName") ?? invalid("client")}
          aria-describedby={describe("fullName") ?? describe("client")}
        />
        <FieldError id="card-error-fullName" message={errors.fullName} />
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
            aria-invalid={invalid("dateOfBirth")}
            aria-describedby={describe("dateOfBirth")}
          />
          <FieldError id="card-error-dateOfBirth" message={errors.dateOfBirth} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="card-language">Session language</Label>
          <NativeSelect
            id="card-language"
            name="session_language"
            defaultValue={values?.sessionLanguage ?? ""}
            aria-invalid={invalid("sessionLanguage")}
            aria-describedby={describe("sessionLanguage")}
          >
            <NativeSelectOption value="">Select a language…</NativeSelectOption>
            <NativeSelectOption value="English">English</NativeSelectOption>
            <NativeSelectOption value="Spanish">Spanish</NativeSelectOption>
          </NativeSelect>
          <FieldError id="card-error-sessionLanguage" message={errors.sessionLanguage} />
        </div>
      </div>
      {clientType === "child" ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="card-guardian-name">Guardian&apos;s name</Label>
            <Input
              id="card-guardian-name"
              name="guardian_name"
              type="text"
              defaultValue={values?.guardianName}
              aria-invalid={invalid("guardian")}
              aria-describedby={describe("guardian")}
            />
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
              aria-invalid={invalid("guardian")}
              aria-describedby={describe("guardian")}
            />
            <FieldError id="card-error-guardian" message={errors.guardian} />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="card-email">Email</Label>
          {/* type="text": формат перевіряє сервер, щоб повідомлення було однаковим (AC-HOLD-15). */}
          <Input
            id="card-email"
            name="email"
            type="text"
            autoComplete="off"
            defaultValue={values?.email}
            aria-invalid={invalid("client")}
            aria-describedby={describe("client")}
          />
          <FieldError id="card-error-client" message={errors.client} />
        </div>
      )}
      {state && !state.errors ? <ActionMessage ok={state.ok} message={state.message} /> : null}
      <Button type="submit" disabled={pending} className="self-start">
        Create client card
      </Button>
    </form>
  );
}
