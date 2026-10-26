import { Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { accessFor, NO_ROLE_MESSAGE } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "./login/actions";

// Головна: веде за роллю (роль — з profiles через getCurrentUser, getClaims(), не getSession()).
// Без ролі — лише повідомлення PM і вихід, жодних даних (AC-CARD-11). Інші сторінки перенаправляють
// сюди будь-кого без своєї ролі, тож користувач без ролі за будь-яким посиланням бачить саме це.
export default async function Home() {
  const user = await getCurrentUser();
  const access = accessFor(user);

  if (access === "login") redirect("/login");
  if (access === "staff") redirect("/slots");
  if (access === "therapist") redirect("/schedule");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
      <Alert data-testid="no-role">
        <Lock aria-hidden="true" />
        <AlertDescription className="text-foreground">{NO_ROLE_MESSAGE}</AlertDescription>
      </Alert>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
