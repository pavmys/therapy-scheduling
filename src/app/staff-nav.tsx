import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button, buttonVariants } from "@/components/ui/button";

const navLink = buttonVariants({ variant: "ghost", size: "sm" });

// Шапка сторінок планувальника й адміністратора.
export function StaffNav({ email, title }: { email: string | null; title: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        <Link href="/slots" className={navLink}>
          Slots
        </Link>
        <Link href="/holds" className={navLink}>
          Holds
        </Link>
        <Link href="/clients" className={navLink}>
          Clients
        </Link>
        <form action={signOut} className="ml-2 flex items-center gap-2">
          <span className="text-muted-foreground">{email}</span>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </nav>
    </header>
  );
}
