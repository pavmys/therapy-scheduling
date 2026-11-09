// Повідомлення картки клієнта поза перевіркою полів. Тексти PM — дослівно (AC-HOLD-16, -34; AC-CARD-06,
// -13). Помилки полів (AC-HOLD-11, -15; AC-CARD-03, -12) — у validate.ts, звідти їх і імпортують.
export const DUPLICATE_EMAIL_MESSAGE = "A client with this email already exists.";
export const DUPLICATE_CHILD_MESSAGE = "A client with these details already exists.";
export const FORBIDDEN_MESSAGE = "Only schedulers and admins can create client cards.";
export const UNEXPECTED_MESSAGE = "Could not create the client card. Try again.";

// Статус перевірки страхування (design.md impl-insurance-status, D3). Тексту відмови й помилки PM не дав
// (spec-review add-insurance-status, знахідка 1) — короткі речення «що сталося → що робити» за DESIGN.md, розділ 6.
export const INSURANCE_FORBIDDEN_MESSAGE = "Only schedulers and admins can change the insurance status.";
export const INSURANCE_UNEXPECTED_MESSAGE = "Could not save the insurance status. Try again.";
