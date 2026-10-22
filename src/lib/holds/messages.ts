// Коди помилок функцій hold_slot / confirm_hold (міграції slots_and_holds, confirm_hold) → тексти PM дослівно.
export const HOLD_ERROR_MESSAGES = {
  HOLD_FORBIDDEN: "Only schedulers and admins can hold slots.",
  SLOT_UNAVAILABLE: "This slot is no longer available.",
  SLOT_STARTED: "This slot has already started and cannot be held.",
  CLIENT_OVERLAP: "This client already has a hold or session at this time.",
  // Слот чи клієнта не знайдено (видалено після завантаження сторінки або некоректний id) —
  // власні тексти розробника: AC цих випадків не описують.
  SLOT_NOT_FOUND: "This slot is no longer available.",
  CLIENT_NOT_FOUND: "This client no longer exists. Select another client.",
  HOLD_NOT_FOUND: "This hold no longer exists.",
  CONFIRM_FORBIDDEN: "Only schedulers and admins can confirm holds.",
  HOLD_EXPIRED: "This hold has expired. Hold the slot again.",
  SLOT_STARTED_CONFIRM: "This slot has already started and cannot be confirmed.",
  HOLD_ALREADY_CONFIRMED: "This hold is already confirmed.",
} as const;

export type HoldErrorCode = keyof typeof HOLD_ERROR_MESSAGES;

export const NO_FREE_SLOTS_MESSAGE = "No free slots on this day.";
export const SELECT_CLIENT_MESSAGE = "Select a client.";
export const UNEXPECTED_HOLD_MESSAGE = "Something went wrong. Try again.";

// PostgREST віддає текст `raise exception '<CODE>'` у error.message.
export function holdErrorMessage(error: { message?: string } | null | undefined): string {
  const code = error?.message?.trim();
  if (code && code in HOLD_ERROR_MESSAGES) return HOLD_ERROR_MESSAGES[code as HoldErrorCode];
  return UNEXPECTED_HOLD_MESSAGE;
}
