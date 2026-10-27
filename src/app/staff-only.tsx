import { Lock } from "lucide-react";
import { StaffNav } from "@/app/staff-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { STAFF_ONLY_PAGE_MESSAGE } from "@/lib/access";

// Сторінка планувальника, яку терапевт відкрив за прямим посиланням (AC-HOLD-44): лише відмова PM і його навігація —
// без запитів до бази, тож жодних утримань, імен чи email клієнтів. Звичайна функція, а не компонент, щоб сторінка
// повертала готове дерево (тести читають його без рендера).
export function staffOnlyPage(email: string | null, title: string) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <StaffNav email={email} title={title} role="therapist" />
      <Alert data-testid="staff-only">
        <Lock aria-hidden="true" />
        <AlertDescription className="text-foreground">{STAFF_ONLY_PAGE_MESSAGE}</AlertDescription>
      </Alert>
    </main>
  );
}

// mutation: секретний ключ читається в коді сторінки (доказ check:boundary)
export const hasSecretKey = Boolean(process.env.SUPABASE_SECRET_KEY);
