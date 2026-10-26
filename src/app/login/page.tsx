import { ActionMessage } from "@/components/ui/action-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

const ERRORS: Record<string, string> = {
  missing: "Вкажіть email і пароль.",
  invalid: "Невірний email або пароль.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Вхід</h1>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {message ? <ActionMessage ok={false} message={message} /> : null}
            <Button type="submit" size="lg">
              Увійти
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
