import { Lock } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SignConsentForm } from "@/app/clients/[id]/consent-forms";
import { StaffNav } from "@/app/staff-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { accessFor } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { missingClientMessage } from "@/lib/clients/view";
import {
  CONSENT_BODY,
  consentKindFromSlug,
  consentStateLabel,
  consentTitle,
  SIGN_FORBIDDEN_MESSAGE,
} from "@/lib/consent/documents";
import { isUuid } from "@/lib/form";

// Сторінка документа згоди (AC-DOC-04, AC-DOC-09, AC-DOC-10, AC-DOC-11; design.md impl-consent-documents, «UI»).
// Гість — сторінка входу до будь-якого запиту. Що повернула база під RLS — те й показуємо: чужий клієнт для терапевта
// — 0 рядків картки, і він бачить лише «You don't have access to this client.» без тексту документа й даних клієнта.
// Позначка підписом — лише staff; межа безпеки — функція бази sign_consent_document.
export default async function ConsentDocumentPage({ params }: PageProps<"/clients/[id]/consent/[kind]">) {
  const user = await getCurrentUser();
  const access = accessFor(user);
  if (access === "login") redirect("/login");
  if (access === "no-role") redirect("/");
  const { supabase, email } = user!;
  const role = access === "therapist" ? "therapist" : "staff";

  const { id, kind: slug } = await params;
  const kind = consentKindFromSlug(slug);
  const { data: client } = isUuid(id)
    ? await supabase.from("clients").select("full_name, client_type, guardian_name").eq("id", id).maybeSingle()
    : { data: null };

  if (!client) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
        <StaffNav email={email} title="Consent document" role={role} />
        <Alert data-testid="client-no-access">
          <Lock aria-hidden="true" />
          <AlertDescription className="text-foreground">{missingClientMessage(role)}</AlertDescription>
        </Alert>
      </main>
    );
  }

  // Невідомий тип, документів ще не формували або «Release of information» у дорослого — сторінки немає
  // (тексту PM для цього випадку немає).
  const { data: doc } = kind
    ? await supabase
        .from("consent_documents")
        .select("id, kind, prepared_on, signed_at")
        .eq("client_id", id)
        .eq("kind", kind)
        .maybeSingle()
    : { data: null };
  if (!doc) notFound();

  const title = consentTitle(doc.kind);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <StaffNav email={email} title={title} role={role} />
      <Card data-testid="consent-document">
        <CardHeader className="flex flex-col gap-1">
          <p className="text-sm">Client: {client.full_name}</p>
          {client.client_type === "child" ? <p className="text-sm">Guardian: {client.guardian_name}</p> : null}
          <p className="text-sm tabular-nums">Prepared: {doc.prepared_on}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {CONSENT_BODY[doc.kind as keyof typeof CONSENT_BODY].map((paragraph) => (
            <p key={paragraph} className="text-sm">
              {paragraph}
            </p>
          ))}
          <p
            className={doc.signed_at ? "text-sm tabular-nums" : "text-sm text-muted-foreground"}
            data-testid="consent-state"
          >
            {consentStateLabel(doc.signed_at)}
          </p>
          {/* Позначити підписаним пропонуємо лише staff; терапевту — текст PM замість кнопки (AC-DOC-09). */}
          {doc.signed_at ? null : role === "staff" ? (
            <SignConsentForm documentId={doc.id} title={title} primary />
          ) : (
            <Alert data-testid="consent-sign-forbidden">
              <Lock aria-hidden="true" />
              <AlertDescription className="text-foreground">{SIGN_FORBIDDEN_MESSAGE}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      <Link href={`/clients/${id}`} className="self-start text-sm text-primary underline-offset-4 hover:underline">
        Back to the client card
      </Link>
    </main>
  );
}
