import { Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { StaffNav } from "@/app/staff-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accessFor } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { insuranceLine } from "@/lib/clients/insurance";
import { consentStateLabel, consentSummary, consentTitle, sortConsentDocuments } from "@/lib/consent/documents";
import { clientTypeLabel, missingClientMessage, orNotProvided } from "@/lib/clients/view";
import { isUuid } from "@/lib/form";
import { PrepareConsentForm, SignConsentForm } from "./consent-forms";
import { InsuranceForm } from "./insurance-form";

type ConsentRow = { id: string; kind: string; signed_at: string | null };

// Документи згоди в картці (AC-DOC-01…03, -05, -06; design.md impl-consent-documents, «UI»). Що повернула база під RLS
// (consent_documents_select: staff — усі, терапевт — свої клієнти) — те й показуємо; кнопки — лише staff.
// Назви документів — простим текстом: сторінка документа й посилання на неї — задача 3.
function ConsentDocuments({ clientId, docs, staff }: { clientId: string; docs: ConsentRow[]; staff: boolean }) {
  const sorted = sortConsentDocuments(docs);
  return (
    <Card data-testid="consent-documents">
      <CardHeader>
        <h2 className="font-heading text-lg font-semibold">Consent documents</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sorted.length > 0 ? (
          <Table data-testid="consent-list">
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground">Document</TableHead>
                <TableHead className="text-muted-foreground">State</TableHead>
                {staff ? <TableHead className="sr-only">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{consentTitle(doc.kind)}</TableCell>
                  <TableCell className={doc.signed_at ? "tabular-nums" : "text-muted-foreground"}>
                    {consentStateLabel(doc.signed_at)}
                  </TableCell>
                  {staff ? (
                    <TableCell className="text-right">
                      {doc.signed_at ? null : <SignConsentForm documentId={doc.id} title={consentTitle(doc.kind)} />}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
        {/* «No consent documents yet.» / «Missing signatures: …» / «All consent documents signed.» — дослівно з AC. */}
        <p
          className={sorted.length > 0 ? "text-sm" : "text-sm text-muted-foreground"}
          data-testid="consent-summary"
        >
          {consentSummary(sorted)}
        </p>
        {/* Сформувати знову не запропоновано («Припущення» PM): кнопка — лише поки документів немає. */}
        {staff && sorted.length === 0 ? <PrepareConsentForm clientId={clientId} /> : null}
      </CardContent>
    </Card>
  );
}

// Картка клієнта за прямим посиланням. Що повернула база під RLS — те й показуємо: чужа картка, картка клієнта з
// простроченим утриманням чи неіснуюча — 0 рядків, і роль бачить лише повідомлення без імен і назв полів
// (AC-CARD-05, AC-CARD-08, AC-CARD-16: staff — «картки немає», терапевт — відмова).
export default async function ClientCardPage({ params }: PageProps<"/clients/[id]">) {
  const user = await getCurrentUser();
  const access = accessFor(user);
  if (access === "login") redirect("/login");
  if (access === "no-role") redirect("/");
  const { supabase, email } = user!;
  const role = access === "therapist" ? "therapist" : "staff";

  const { id } = await params;
  const { data: client } = isUuid(id)
    ? await supabase
        .from("clients")
        .select(
          "full_name, email, client_type, date_of_birth, session_language, guardian_name, guardian_email, insurance_status",
        )
        .eq("id", id)
        .maybeSingle()
    : { data: null };

  if (!client) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
        <StaffNav email={email} title="Client card" role={role} />
        <Alert data-testid="client-no-access">
          <Lock aria-hidden="true" />
          <AlertDescription className="text-foreground">{missingClientMessage(role)}</AlertDescription>
        </Alert>
      </main>
    );
  }

  const { data: consentDocs } = await supabase
    .from("consent_documents")
    .select("id, kind, signed_at")
    .eq("client_id", id);

  const rows: [string, string | null][] = [
    ["Client type", clientTypeLabel(client.client_type)],
    ["Date of birth", client.date_of_birth],
    ["Session language", client.session_language],
    ...(client.client_type === "child"
      ? ([
          ["Guardian's name", client.guardian_name],
          ["Guardian's email", client.guardian_email],
        ] as [string, string | null][])
      : ([["Email", client.email]] as [string, string | null][])),
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <StaffNav email={email} title="Client card" role={role} />
      <Card>
        <CardHeader>
          <h2 className="font-heading text-lg font-semibold">{client.full_name}</h2>
          {/* Статус страхування — текстом, не кольором (AC-INS-01…04; «Припущення» PM). */}
          <p className="text-sm" data-testid="insurance-status">
            {insuranceLine(client.insurance_status)}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm" data-testid="client-card">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className={value ? "tabular-nums" : "text-muted-foreground"}>{orNotProvided(value)}</dd>
              </div>
            ))}
          </dl>
          {/* Змінити статус пропонуємо лише staff; терапевту форму не рендеримо взагалі (AC-INS-04). */}
          {role === "staff" ? <InsuranceForm clientId={id} status={client.insurance_status} /> : null}
        </CardContent>
      </Card>
      <ConsentDocuments clientId={id} docs={consentDocs ?? []} staff={role === "staff"} />
    </main>
  );
}
