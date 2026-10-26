import { Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { StaffNav } from "@/app/staff-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { accessFor } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { clientTypeLabel, NO_ACCESS_TO_CLIENT_MESSAGE, orNotProvided } from "@/lib/clients/view";
import { isUuid } from "@/lib/form";

// Картка клієнта за прямим посиланням. Що повернула база під RLS — те й показуємо: чужа картка, картка клієнта з
// простроченим утриманням чи неіснуюча — 0 рядків, і роль бачить лише відмову без імен і назв полів
// (AC-CARD-05, AC-CARD-08; неіснуюча для staff — до відповіді PM на Sofiia-pm/therapy-scheduling-spec#28).
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
        .select("full_name, email, client_type, date_of_birth, session_language, guardian_name, guardian_email")
        .eq("id", id)
        .maybeSingle()
    : { data: null };

  if (!client) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
        <StaffNav email={email} title="Client card" role={role} />
        <Alert data-testid="client-no-access">
          <Lock aria-hidden="true" />
          <AlertDescription className="text-foreground">{NO_ACCESS_TO_CLIENT_MESSAGE}</AlertDescription>
        </Alert>
      </main>
    );
  }

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
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm" data-testid="client-card">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className={value ? "tabular-nums" : "text-muted-foreground"}>{orNotProvided(value)}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </main>
  );
}
