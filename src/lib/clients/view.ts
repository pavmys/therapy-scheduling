// Як показувати картку клієнта (design.md impl-client-cards, «UI і компоненти»). Чисті функції — щоб тексти
// й підписи мали тест без браузера.

export const NOT_PROVIDED = "Not provided";

export type ClientView = {
  full_name: string;
  email: string | null;
  client_type: string;
  date_of_birth: string | null;
  session_language: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
};

const TYPE_LABEL: Record<string, string> = { adult: "Adult", child: "Child" };

/** Тип клієнта так, як його пише PM («Adult», «Child»). */
export function clientTypeLabel(type: string): string {
  return TYPE_LABEL[type] ?? type;
}

/** Контакт: email дорослого або опікун дитини; у картках зрізу 1 без даних — «Not provided». */
export function clientContact(client: Pick<ClientView, "email" | "guardian_name" | "guardian_email">): string {
  if (client.email) return client.email;
  if (client.guardian_email) return `Guardian: ${client.guardian_name ?? NOT_PROVIDED}, ${client.guardian_email}`;
  return NOT_PROVIDED;
}

/** Підпис клієнта у виборі під час утримання слоту: біля дитини — email опікуна (AC-CARD-02). */
export function clientOptionLabel(client: Pick<ClientView, "full_name" | "email" | "guardian_email">): string {
  if (client.email) return `${client.full_name} (${client.email})`;
  if (client.guardian_email) return `${client.full_name} (guardian: ${client.guardian_email})`;
  return client.full_name;
}

/** Значення поля або «Not provided» для старих карток зрізу 1. */
export function orNotProvided(value: string | null | undefined): string {
  return value && value.trim() ? value : NOT_PROVIDED;
}
