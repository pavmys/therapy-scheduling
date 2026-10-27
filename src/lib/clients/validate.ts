// Перевірка й нормалізація картки клієнта (design.md impl-hold, D6).
// Ті самі правила тримають check-обмеження таблиці public.clients — останній рубіж для прямого insert.

export const INVALID_CLIENT_MESSAGE = "Enter the client's name and a valid email.";

// Коректний email (припущення PM): рівно один «@», непорожня частина до нього, крапка в частині
// після «@», без пробілів усередині — як clients_email_check у міграції (AC-HOLD-15, AC-HOLD-39).
// До першої крапки домену — без крапок: розбиття однозначне, тож перевірка лінійна (без ReDoS).
const EMAIL_PATTERN = /^[^@\s]+@[^@\s.]*\.[^@\s]*$/;

// Email унікальний без урахування регістру й пробілів по краях; зберігається й показується саме так (AC-HOLD-35).
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type ClientInput = { fullName: string; email: string };

export type ClientValidation =
  | { ok: true; value: ClientInput }
  | { ok: false; message: string };

// Ім'я зберігається без пробілів по краях; ім'я лише з пробілів — порожнє (AC-HOLD-11, AC-HOLD-41).
export function validateClient(fullName: string, email: string): ClientValidation {
  const name = fullName.trim();
  const normalized = normalizeEmail(email);
  if (!name || !EMAIL_PATTERN.test(normalized)) {
    return { ok: false, message: INVALID_CLIENT_MESSAGE };
  }
  return { ok: true, value: { fullName: name, email: normalized } };
}

// ── Картка клієнта з анкети (зріз 2; design.md impl-client-cards, D2, D4) ────────────────────────────────

export const INVALID_GUARDIAN_MESSAGE = "Enter the guardian's name and a valid email.";
// Тексти помилок форми — дослівно з «Припущень» PM (Sofiia-pm/therapy-scheduling-spec#19, відповідь на #21; AC-CARD-12).
export const SELECT_CLIENT_TYPE_MESSAGE = "Select a client type.";
export const ENTER_CLIENT_NAME_MESSAGE = "Enter the client's name.";
export const INVALID_DATE_OF_BIRTH_MESSAGE = "Enter a date of birth that is not in the future.";
export const SELECT_LANGUAGE_MESSAGE = "Select a session language.";

export const CLIENT_TYPES = ["adult", "child"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];
export const SESSION_LANGUAGES = ["English", "Spanish"] as const;
export type SessionLanguage = (typeof SESSION_LANGUAGES)[number];

/** Поля форми картки як рядки — їх і повертаємо у форму після помилки (введене лишається, AC-CARD-03, AC-CARD-12). */
export type CardFields = {
  clientType: string;
  fullName: string;
  dateOfBirth: string;
  sessionLanguage: string;
  email: string;
  guardianName: string;
  guardianEmail: string;
};

/** Біля якого поля форми показати помилку: «client» — ім'я та email дорослого, «guardian» — ім'я та email опікуна. */
export type CardErrorField = "clientType" | "client" | "fullName" | "dateOfBirth" | "sessionLanguage" | "guardian";
export type CardErrors = Partial<Record<CardErrorField, string>>;

/** Рядок для insert у public.clients (назви колонок). */
export type CardRow = {
  client_type: ClientType;
  full_name: string;
  date_of_birth: string;
  session_language: SessionLanguage;
  email: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
};

export type CardValidation = { ok: true; value: CardRow } | { ok: false; errors: CardErrors };

/** Порядок полів форми — так показуємо помилки й обираємо першу для загального повідомлення. */
export const CARD_ERROR_ORDER: CardErrorField[] = [
  "clientType",
  "client",
  "fullName",
  "dateOfBirth",
  "sessionLanguage",
  "guardian",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Дата РРРР-ММ-ДД, що існує в календарі (2026-02-30 — ні).
function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const at = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(at.getTime()) && at.toISOString().slice(0, 10) === value;
}

/**
 * Картка з анкети (AC-CARD-01, AC-CARD-02, AC-CARD-03, AC-CARD-12): одразу всі помилки, кожна біля свого поля.
 * Дата народження — не пізніше за `today` (дату практики дає виклик); сьогоднішня дата коректна.
 * Дорослий — ім'я та email за правилами зрізу 1; дитина — ім'я, а також ім'я та email опікуна.
 */
export function validateCard(fields: CardFields, today: string): CardValidation {
  const errors: CardErrors = {};
  const clientType = CLIENT_TYPES.find((t) => t === fields.clientType);
  const language = SESSION_LANGUAGES.find((l) => l === fields.sessionLanguage);
  const dateOfBirth = fields.dateOfBirth.trim();

  if (!clientType) errors.clientType = SELECT_CLIENT_TYPE_MESSAGE;
  if (!isCalendarDate(dateOfBirth) || dateOfBirth > today) errors.dateOfBirth = INVALID_DATE_OF_BIRTH_MESSAGE;
  if (!language) errors.sessionLanguage = SELECT_LANGUAGE_MESSAGE;

  const client = clientType === "adult" ? validateClient(fields.fullName, fields.email) : null;
  if (client && !client.ok) errors.client = client.message;

  const guardian = clientType === "child" ? validateClient(fields.guardianName, fields.guardianEmail) : null;
  const childName = fields.fullName.trim();
  if (clientType === "child" && !childName) errors.fullName = ENTER_CLIENT_NAME_MESSAGE;
  if (guardian && !guardian.ok) errors.guardian = INVALID_GUARDIAN_MESSAGE;

  if (Object.keys(errors).length > 0 || !clientType || !language) return { ok: false, errors };

  if (client?.ok) {
    return {
      ok: true,
      value: {
        client_type: "adult",
        full_name: client.value.fullName,
        date_of_birth: dateOfBirth,
        session_language: language,
        email: client.value.email,
        guardian_name: null,
        guardian_email: null,
      },
    };
  }
  if (guardian?.ok) {
    return {
      ok: true,
      value: {
        client_type: "child",
        full_name: childName,
        date_of_birth: dateOfBirth,
        session_language: language,
        email: null,
        guardian_name: guardian.value.fullName,
        guardian_email: guardian.value.email,
      },
    };
  }
  return { ok: false, errors: { clientType: SELECT_CLIENT_TYPE_MESSAGE } };
}

/** Перша помилка в порядку полів форми — для загального повідомлення поруч із помилками біля полів. */
export function firstCardError(errors: CardErrors): string {
  const field = CARD_ERROR_ORDER.find((f) => errors[f]);
  return field ? errors[field]! : SELECT_CLIENT_TYPE_MESSAGE;
}
