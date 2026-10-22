// Пошук наявного клієнта за частиною імені або email без урахування регістру
// (власне припущення розробника, docs/spec-reading.md). Повертає фільтр PostgREST для .or(…).
// Символи, що мають значення в синтаксисі фільтра (кома, дужки, лапки) чи шаблону ilike (%, _, *, \),
// прибираємо, щоб пошуковий рядок не змінив сам запит.
export function clientSearchFilter(query: string): string | null {
  const term = query.replace(/[,()"'%_*\\]/g, " ").trim().replace(/\s+/g, " ");
  if (!term) return null;
  return `full_name.ilike.%${term}%,email.ilike.%${term}%`;
}
