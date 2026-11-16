"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { Button } from "@/components/ui/button";
import { type ConsentActionState, prepareConsentDocuments, signConsentDocument } from "./consent-actions";

// Кнопки блоку «Consent documents» — лише для планувальника й адміністратора; терапевту сторінка їх не рендерить.
// Успіх видно в самій картці (документи, стан, рядок підсумку), тож повідомлення — лише про відмову чи збій.

export function PrepareConsentForm({ clientId }: { clientId: string }) {
  const [state, formAction, pending] = useActionState<ConsentActionState, FormData>(prepareConsentDocuments, null);
  return (
    <form action={formAction} className="flex flex-col gap-3" data-testid="consent-prepare-form">
      <input type="hidden" name="client_id" value={clientId} />
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        Prepare consent documents
      </Button>
      {state && !state.ok ? <ActionMessage ok={false} message={state.message} /> : null}
    </form>
  );
}

// primary — на сторінці документа «Mark as signed» — основна дія області (DESIGN.md: одна `default` на область);
// у таблиці картки — `outline` `sm` у кожному рядку.
export function SignConsentForm({
  documentId,
  title,
  primary = false,
}: {
  documentId: string;
  title: string;
  primary?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ConsentActionState, FormData>(signConsentDocument, null);
  return (
    <form action={formAction} className={primary ? "flex flex-col items-start gap-2" : "flex flex-col items-end gap-2"}>
      <input type="hidden" name="document_id" value={documentId} />
      <Button
        type="submit"
        variant={primary ? "default" : "outline"}
        size={primary ? "default" : "sm"}
        disabled={pending}
        aria-label={`Mark ${title} as signed`}
      >
        Mark as signed
      </Button>
      {state && !state.ok ? <ActionMessage ok={false} message={state.message} /> : null}
    </form>
  );
}
