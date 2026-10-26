import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button, buttonVariants } from "@/components/ui/button";

const navLink = buttonVariants({ variant: "ghost", size: "sm" });

const LINKS = {
  staff: [
    { href: "/slots", label: "Slots" },
    { href: "/holds", label: "Holds" },
    { href: "/clients", label: "Clients" },
  ],
  // Терапевт: свій розклад і свої клієнти (AC-HOLD-09, AC-CARD-04).
  therapist: [
    { href: "/schedule", label: "My schedule" },
    { href: "/clients", label: "My clients" },
  ],
} as const;

// Шапка сторінок працівників: посилання за роллю. Лише навігація — права перевіряють сторінки, дії й RLS.
export function StaffNav({
  email,
  title,
  role = "staff",
}: {
  email: string | null;
  title: string;
  role?: "staff" | "therapist";
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        {LINKS[role].map((link) => (
          <Link key={link.href} href={link.href} className={navLink}>
            {link.label}
          </Link>
        ))}
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
