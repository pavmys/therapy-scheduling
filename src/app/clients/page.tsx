import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <form action={signOut} className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500">{user.email}</span>
          <button type="submit" className="underline">
            Sign out
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">New client</h2>
        <ClientForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Find a client</h2>
        <form className="flex gap-2">
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Part of name or email"
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button type="submit" className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
            Search
          </button>
        </form>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            Could not load clients. Try again.
          </p>
        ) : clients && clients.length > 0 ? (
          <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800" data-testid="client-list">
            {clients.map((c) => (
              <li key={c.id} className="flex justify-between py-2">
                <span>{c.full_name}</span>
                <span className="text-zinc-500">{c.email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No clients found.</p>
        )}
      </section>
    </main>
  );
}
