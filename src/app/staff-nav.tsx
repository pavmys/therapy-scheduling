import Link from "next/link";
import { signOut } from "@/app/login/actions";

// Шапка сторінок планувальника й адміністратора.
export function StaffNav({ email, title }: { email: string | null; title: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/slots" className="underline">
          Slots
        </Link>
        <Link href="/clients" className="underline">
          Clients
        </Link>
        <form action={signOut} className="flex items-center gap-3">
          <span className="text-zinc-500">{email}</span>
          <button type="submit" className="underline">
            Sign out
          </button>
        </form>
      </nav>
    </header>
  );
}
