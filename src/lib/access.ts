import type { AppRole } from "@/lib/auth";

// Куди веде застосунок користувача (design.md impl-client-cards, D4). Межа безпеки — RLS і перевірка в кожній дії;
// це лише вибір сторінки: без входу — сторінка входу (AC-CARD-07), без ролі — лише повідомлення (AC-CARD-11).
export type Access = "login" | "no-role" | "staff" | "therapist";

export const NO_ROLE_MESSAGE = "Your account has no access yet. Contact an administrator.";

export function accessFor(user: { role: AppRole | null } | null): Access {
  if (!user) return "login";
  if (user.role === "admin" || user.role === "scheduler") return "staff";
  if (user.role === "therapist") return "therapist";
  return "no-role";
}
