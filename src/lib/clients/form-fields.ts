import type { CardFields } from "./validate";

// Поля форми картки клієнта з FormData — однаково для створення картки (createClientCard) і чернетки
// (requestIntakeDraft): імена полів — ті, що в ClientForm.
export function cardFieldsFromForm(formData: FormData): CardFields {
  const field = (name: string) => String(formData.get(name) ?? "");
  return {
    clientType: field("client_type"),
    fullName: field("full_name"),
    dateOfBirth: field("date_of_birth"),
    sessionLanguage: field("session_language"),
    email: field("email"),
    guardianName: field("guardian_name"),
    guardianEmail: field("guardian_email"),
  };
}
