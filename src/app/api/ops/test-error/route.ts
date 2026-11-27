// WS11, трек B: навмисна помилка сервера для перевірки трекера (onRequestError у src/instrumentation.ts → Telegram).
// Лише для адміністратора: решта (зокрема без входу) отримує 404, і нічого не кидається. Перевіряємо на staging,
// не на проді. Після доказу маршрут прибираємо окремим PR.
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("Not found", { status: 404 });
  throw new Error("ops test error: tracker check");
}
