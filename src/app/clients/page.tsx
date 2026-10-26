import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffNav } from "@/app/staff-nav";
import { ActionMessage } from "@/components/ui/action-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accessFor } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { clientSearchFilter } from "@/lib/clients/search";
import { type ClientView, clientContact, clientsEmptyMessage, clientTypeLabel, orNotProvided } from "@/lib/clients/view";

const COLUMNS = "id, full_name, email, client_type, date_of_birth, session_language, guardian_name, guardian_email";

// Картки клієнтів. Планувальник і адміністратор — усі картки й пошук (AC-CARD-10); терапевт — лише свої клієнти
// з утриманням «Held» чи сеансом «Confirmed» (AC-CARD-04, AC-CARD-08) або порожній стан (AC-CARD-09).
// Хто що бачить, вирішує RLS (clients_select_staff, clients_select_own_therapist) — сторінка лише показує.
export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const user = await getCurrentUser();
  const access = accessFor(user);
  if (access === "login") redirect("/login");
  if (access === "no-role") redirect("/");
  const { supabase, email } = user!;

  if (access === "therapist") {
    const { data: clients, error } = await supabase.from("clients").select(COLUMNS).order("full_name");
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
        <StaffNav email={email} title="My clients" role="therapist" />
        <Card>
          <CardContent className="flex flex-col gap-4">
            {error ? (
              <ActionMessage ok={false} message="Could not load clients. Try again." />
            ) : clients && clients.length > 0 ? (
              <ClientsTable clients={clients} />
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="clients-empty">
                {clientsEmptyMessage("therapist")}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const filter = clientSearchFilter(query);

  let request = supabase.from("clients").select(COLUMNS).order("full_name").limit(50);
  if (filter) request = request.or(filter);
  const { data: clients, error } = await request;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <StaffNav email={email} title="Clients" />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">Client cards</h2>
          <Link href="/clients/new" className={buttonVariants()}>
            New client card
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="client-q">Find a client</Label>
              <Input
                id="client-q"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Part of name, email or guardian's email"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          {error ? (
            <ActionMessage ok={false} message="Could not load clients. Try again." />
          ) : clients && clients.length > 0 ? (
            <ClientsTable clients={clients} />
          ) : (
            <p className="text-sm text-muted-foreground">{clientsEmptyMessage("staff")}</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function ClientsTable({ clients }: { clients: (ClientView & { id: string })[] }) {
  return (
    <Table data-testid="client-list">
      <TableHeader>
        <TableRow>
          <TableHead className="text-muted-foreground">Name</TableHead>
          <TableHead className="text-muted-foreground">Type</TableHead>
          <TableHead className="text-muted-foreground">Date of birth</TableHead>
          <TableHead className="text-muted-foreground">Language</TableHead>
          <TableHead className="text-muted-foreground">Contact</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">
              <Link href={`/clients/${c.id}`} className="text-primary underline-offset-4 hover:underline">
                {c.full_name}
              </Link>
            </TableCell>
            <TableCell>{clientTypeLabel(c.client_type)}</TableCell>
            <TableCell className={c.date_of_birth ? "tabular-nums" : "text-muted-foreground"}>
              {orNotProvided(c.date_of_birth)}
            </TableCell>
            <TableCell className={c.session_language ? undefined : "text-muted-foreground"}>
              {orNotProvided(c.session_language)}
            </TableCell>
            <TableCell className="whitespace-normal text-muted-foreground">{clientContact(c)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
