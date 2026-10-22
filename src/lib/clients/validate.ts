// Перевірка й нормалізація картки клієнта (design.md impl-hold, D6).
// Ті самі правила тримають check-обмеження таблиці public.clients — останній рубіж для прямого insert.

export const INVALID_CLIENT_MESSAGE = "Enter the client's name and a valid email.";

// Рівно один @, непорожні частини без пробілів — як clients_email_check у міграції.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+$/;

// Email унікальний без урахування регістру й пробілів по краях; зберігається й показується саме так (AC-HOLD-35).
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type ClientInput = { fullName: string; email: string };

export type ClientValidation =
  | { ok: true; value: ClientInput }
  | { ok: false; message: string };

export function validateClient(fullName: string, email: string): ClientValidation {
  const name = fullName.trim();
  const normalized = normalizeEmail(email);
  if (!name || !EMAIL_PATTERN.test(normalized)) {
    return { ok: false, message: INVALID_CLIENT_MESSAGE };
  }
  return { ok: true, value: { fullName: name, email: normalized } };
}
