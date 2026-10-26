import { redirect } from "next/navigation";
import { StaffNav } from "@/app/staff-nav";
import { ClientForm } from "@/app/clients/client-form";
import { ActionMessage } from "@/components/ui/action-message";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { accessFor } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { FORBIDDEN_MESSAGE } from "@/lib/clients/messages";

// Нова картка клієнта з анкети — планувальник і адміністратор (AC-CARD-01, AC-CARD-02, AC-CARD-03).
// Терапевт за прямим посиланням форми не бачить — лише відмову (AC-CARD-06; до відповіді PM на
// Sofiia-pm/therapy-scheduling-spec#24). Запис однаково перевіряє Server Action і RLS — сторінка не межа безпеки.
export default async function NewClientCardPage() {
  const user = await getCurrentUser();
  const access = accessFor(user);
  if (access === "login") redirect("/login");
  if (access === "no-role") redirect("/");

  if (access === "therapist") {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-16">
        <ActionMessage ok={false} message={FORBIDDEN_MESSAGE} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <StaffNav email={user!.email} title="New client card" />
      <Card>
        <CardHeader>
          <h2 className="font-heading text-lg font-semibold">From the intake form</h2>
        </CardHeader>
        <CardContent className="max-w-xl">
          <ClientForm />
        </CardContent>
      </Card>
    </main>
  );
}
