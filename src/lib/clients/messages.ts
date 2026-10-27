// Повідомлення картки клієнта. Тексти PM — дослівно (AC-HOLD-11, -15, -16, -34; AC-CARD-03, -06, -12, -13).
export {
  ENTER_CLIENT_NAME_MESSAGE,
  INVALID_CLIENT_MESSAGE,
  INVALID_DATE_OF_BIRTH_MESSAGE,
  INVALID_GUARDIAN_MESSAGE,
  SELECT_CLIENT_TYPE_MESSAGE,
  SELECT_LANGUAGE_MESSAGE,
} from "./validate";
export const DUPLICATE_EMAIL_MESSAGE = "A client with this email already exists.";
export const DUPLICATE_CHILD_MESSAGE = "A client with these details already exists.";
export const FORBIDDEN_MESSAGE = "Only schedulers and admins can create client cards.";
export const UNEXPECTED_MESSAGE = "Could not create the client card. Try again.";
