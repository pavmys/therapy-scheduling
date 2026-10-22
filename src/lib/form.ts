const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server action можна викликати й поза формою: id приймаємо лише як рядок у форматі UUID.
export function uuidField(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}
