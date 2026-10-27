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

export const NO_OWN_CLIENTS_MESSAGE = "No clients yet. Clients appear here when a scheduler holds a slot with you.";
export const NO_CLIENT_CARDS_MESSAGE = "No clients yet. Create a client card from an intake form.";
export const NO_CLIENTS_FOUND_MESSAGE = "No clients found.";
export const NO_ACCESS_TO_CLIENT_MESSAGE = "You don't have access to this client.";
export const CLIENT_CARD_NOT_FOUND_MESSAGE = "This client card doesn't exist.";

/**
 * Порожній список клієнтів: терапевту — текст PM (AC-CARD-09); staff без жодної картки — текст PM (AC-CARD-15);
 * staff, чий пошук нічого не знайшов, — як у зрізі 1.
 */
export function clientsEmptyMessage(role: "staff" | "therapist", query = ""): string {
  if (role === "therapist") return NO_OWN_CLIENTS_MESSAGE;
  return query.trim() ? NO_CLIENTS_FOUND_MESSAGE : NO_CLIENT_CARDS_MESSAGE;
}

/**
 * Картки за посиланням немає (AC-CARD-16): staff бачить усі картки (clients_select_staff), тож 0 рядків для нього —
 * картки справді немає; терапевту 0 рядків — і чужа, і неіснуюча картка, тому лише відмова, без підказки, що існує.
 */
export function missingClientMessage(role: "staff" | "therapist"): string {
  return role === "therapist" ? NO_ACCESS_TO_CLIENT_MESSAGE : CLIENT_CARD_NOT_FOUND_MESSAGE;
}
