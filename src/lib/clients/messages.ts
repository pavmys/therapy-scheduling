// Повідомлення картки клієнта поза перевіркою полів. Тексти PM — дослівно (AC-HOLD-16, -34; AC-CARD-06,
// -13). Помилки полів (AC-HOLD-11, -15; AC-CARD-03, -12) — у validate.ts, звідти їх і імпортують.
export const DUPLICATE_EMAIL_MESSAGE = "A client with this email already exists.";
export const DUPLICATE_CHILD_MESSAGE = "A client with these details already exists.";
export const FORBIDDEN_MESSAGE = "Only schedulers and admins can create client cards.";
export const UNEXPECTED_MESSAGE = "Could not create the client card. Try again.";
