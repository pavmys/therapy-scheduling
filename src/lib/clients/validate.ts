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
// Тексту PM для порожнього імені дитини, дати народження, мови чи дати в майбутньому немає
// (Sofiia-pm/therapy-scheduling-spec#21) — до відповіді власний текст розробника.
export const INCOMPLETE_CARD_MESSAGE = "Fill in all fields. The date of birth can't be later than today.";

export const CLIENT_TYPES = ["adult", "child"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];
export const SESSION_LANGUAGES = ["English", "Spanish"] as const;
export type SessionLanguage = (typeof SESSION_LANGUAGES)[number];

/** Поля форми картки як рядки — їх і повертаємо у форму після помилки (введене лишається, AC-CARD-03). */
export type CardFields = {
  clientType: string;
  fullName: string;
  dateOfBirth: string;
  sessionLanguage: string;
  email: string;
  guardianName: string;
  guardianEmail: string;
};

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

export type CardValidation = { ok: true; value: CardRow } | { ok: false; message: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Дата РРРР-ММ-ДД, що існує в календарі (2026-02-30 — ні).
function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const at = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(at.getTime()) && at.toISOString().slice(0, 10) === value;
}

/**
 * Картка з анкети: тип, ім'я, дата народження (не пізніше за `today` — дату практики дає виклик), мова сеансів;
 * дорослий — email за правилами зрізу 1; дитина — ім'я та email опікуна (AC-CARD-01, AC-CARD-02, AC-CARD-03).
 */
export function validateCard(fields: CardFields, today: string): CardValidation {
  const clientType = CLIENT_TYPES.find((t) => t === fields.clientType);
  const language = SESSION_LANGUAGES.find((l) => l === fields.sessionLanguage);
  const dateOfBirth = fields.dateOfBirth.trim();
  const datesOk = isCalendarDate(dateOfBirth) && dateOfBirth <= today;

  if (clientType === "adult") {
    const client = validateClient(fields.fullName, fields.email);
    if (!client.ok) return client;
    if (!datesOk || !language) return { ok: false, message: INCOMPLETE_CARD_MESSAGE };
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

  if (clientType === "child") {
    const guardian = validateClient(fields.guardianName, fields.guardianEmail);
    if (!guardian.ok) return { ok: false, message: INVALID_GUARDIAN_MESSAGE };
    const name = fields.fullName.trim();
    if (!name || !datesOk || !language) return { ok: false, message: INCOMPLETE_CARD_MESSAGE };
    return {
      ok: true,
      value: {
        client_type: "child",
        full_name: name,
        date_of_birth: dateOfBirth,
        session_language: language,
        email: null,
        guardian_name: guardian.value.fullName,
        guardian_email: guardian.value.email,
      },
    };
  }

  return { ok: false, message: INCOMPLETE_CARD_MESSAGE };
}
