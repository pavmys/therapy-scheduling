// Повідомлення картки клієнта. Тексти PM — дослівно (AC-HOLD-11, -15, -16, -34; AC-CARD-03, AC-CARD-06).
export { INCOMPLETE_CARD_MESSAGE, INVALID_CLIENT_MESSAGE, INVALID_GUARDIAN_MESSAGE } from "./validate";
export const DUPLICATE_EMAIL_MESSAGE = "A client with this email already exists.";
export const FORBIDDEN_MESSAGE = "Only schedulers and admins can create client cards.";
export const UNEXPECTED_MESSAGE = "Could not create the client card. Try again.";
