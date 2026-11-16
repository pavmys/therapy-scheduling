"use client";

import { CircleCheck, Info } from "lucide-react";
import { startTransition, useActionState, useState, type MouseEvent } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_REQUEST_LENGTH } from "@/lib/ai/prompts/draft";
import type { CardErrorField } from "@/lib/clients/validate";
import { createClientCard, type CreateClientState } from "./actions";
import { requestIntakeDraft, type IntakeDraftState } from "./new/draft-actions";

// Остання дія форми: створення картки або чернетка з тексту звернення (design.md impl-client-intake-draft, «UI»).
type FormState = { kind: "create"; result: CreateClientState } | { kind: "draft"; result: IntakeDraftState } | null;

// Повідомлення чернетки — дослівно з AC; не помилка збереження, тому не червоне (DESIGN.md, принцип 1).
function DraftMessage({ result }: { result: IntakeDraftState }) {
  const ready = result.state === "ready";
  return (
    <Alert variant={ready ? "success" : "default"} role="status">
      {ready ? <CircleCheck aria-hidden="true" /> : <Info aria-hidden="true" />}
      <AlertDescription>{result.message}</AlertDescription>
    </Alert>
  );
}

// Помилка поля — під ним, пов'язана з полем через aria-describedby (DESIGN.md, розділ 7).
function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

// Поле тексту звернення й кнопка чернетки (design.md impl-client-intake-draft, «UI»). Текст живе в стані ClientForm,
// а не у формі з key: так він лишається після кожної відповіді дії.
function DraftRequest({
  text,
  onTextChange,
  onDraft,
  pending,
  result,
}: {
  text: string;
  onTextChange: (text: string) => void;
  onDraft: (event: MouseEvent<HTMLButtonElement>) => void;
  pending: boolean;
  result: IntakeDraftState | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="card-request">Client&apos;s request</Label>
      <Textarea
        id="card-request"
        name="request_text"
        maxLength={MAX_REQUEST_LENGTH}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        aria-describedby="card-request-hint"
      />
      <p id="card-request-hint" className="text-xs text-muted-foreground">
        Don&apos;t paste diagnoses or other health details: name, date of birth, language and contacts are enough.
      </p>
      {/* type="button": Enter у полі картки й далі відправляє «Create client card», а не чернетку. */}
      <Button type="button" variant="secondary" disabled={pending} onClick={onDraft} className="self-start">
        Draft from request
      </Button>
      {result ? <DraftMessage result={result} /> : null}
    </div>
  );
}

// Дві дії однієї форми: «Draft from request» (intent=draft) лише повертає значення полів, «Create client card» —
// створює картку. Чернетка задає тип клієнта (від нього залежать поля контакту); після створення форма очищається.
function useClientFormActions() {
  const [requestText, setRequestText] = useState("");
  const [clientType, setClientType] = useState("adult");
  const [state, formAction, pending] = useActionState<FormState, FormData>(async (_prev, formData) => {
    if (formData.get("intent") === "draft") {
      const result = await requestIntakeDraft(null, formData);
      setClientType(result.values.clientType || "adult");
      return { kind: "draft", result };
    }
    const result = await createClientCard(null, formData);
    if (result?.ok) {
      setRequestText("");
      setClientType("adult");
    }
    return { kind: "create", result };
  }, null);

  const askDraft = (event: MouseEvent<HTMLButtonElement>) => {
    const formData = new FormData(event.currentTarget.form ?? undefined);
    formData.set("intent", "draft");
    startTransition(() => formAction(formData));
  };

  const created = state?.kind === "create" ? state.result : null;
  const draft = state?.kind === "draft" ? state.result : null;
  return {
    state,
    formAction,
    pending,
    askDraft,
    requestText,
    setRequestText,
    clientType,
    setClientType,
    created,
    draft,
    values: draft ? draft.values : created?.values,
  };
}

// Форма картки клієнта з анкети (AC-CARD-01, AC-CARD-02, AC-CARD-03, AC-CARD-12, AC-CARD-13): тип першим — він визначає,
// які поля контакту потрібні. Після помилки дія повертає введені значення й помилки полів: усі одразу, кожна біля свого
// поля; key — нова форма на кожну відповідь, щоб defaultValue показали введене.
// Чернетка (AC-INTAKE-01…08) лише заповнює поля: картку створює людина кнопкою «Create client card» (AC-INTAKE-03).
export function ClientForm() {
  const { state, formAction, pending, askDraft, requestText, setRequestText, clientType, setClientType, created, draft, values } =
    useClientFormActions();
  const errors = created?.errors ?? {};
  const describe = (field: CardErrorField) => (errors[field] ? `card-error-${field}` : undefined);
  const invalid = (field: CardErrorField) => (errors[field] ? true : undefined);

  return (
    <form key={JSON.stringify(state)} action={formAction} className="flex flex-col gap-4" noValidate>
      <DraftRequest text={requestText} onTextChange={setRequestText} onDraft={askDraft} pending={pending} result={draft} />
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
      {created && !created.errors ? <ActionMessage ok={created.ok} message={created.message} /> : null}
      <Button type="submit" disabled={pending} className="self-start">
        Create client card
      </Button>
    </form>
  );
}
