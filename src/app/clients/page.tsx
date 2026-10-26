import { redirect } from "next/navigation";
import { StaffNav } from "@/app/staff-nav";
import { ActionMessage } from "@/components/ui/action-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { clientSearchFilter } from "@/lib/clients/search";
import { ClientForm } from "./client-form";

// Картки клієнтів: створення й пошук наявного клієнта (планувальник і адміністратор).
export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaffRole(user.role)) redirect("/");

  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const filter = clientSearchFilter(query);

  let request = user.supabase
    .from("clients")
    .select("id, full_name, email")
    .order("full_name")
    .limit(50);
  if (filter) request = request.or(filter);
  const { data: clients, error } = await request;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <StaffNav email={user.email} title="Clients" />

      <Card>
        <CardHeader>
          <h2 className="font-heading text-lg font-semibold">New client</h2>
        </CardHeader>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-heading text-lg font-semibold">Find a client</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="client-q">Name or email</Label>
              <Input id="client-q" name="q" type="search" defaultValue={query} placeholder="Part of name or email" />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          {error ? (
            <ActionMessage ok={false} message="Could not load clients. Try again." />
          ) : clients && clients.length > 0 ? (
            <Table data-testid="client-list">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No clients found.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
