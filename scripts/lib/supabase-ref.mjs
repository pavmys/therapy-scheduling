// Дія з postmortem docs/incidents/2026-11-27-staging-bad-supabase-url.md: smoke звіряє, у ЯКУ базу дивиться деплой.
// /api/health віддає supabaseRef (ref проєкту з NEXT_PUBLIC_SUPABASE_URL, не секрет). Очікуваний ref — змінні репо
// SUPABASE_PROD_REF (job prod) і SUPABASE_STAGING_REF (job deploy: preview і staging, ADR 0008).
// Без очікуваного ref (локальний чи ручний запуск) перевірка не діє.

/** Повідомлення про невідповідність ref або null, якщо все гаразд чи нема з чим порівнювати. */
export function supabaseRefMismatch(actual, expected) {
  const want = String(expected ?? "").trim();
  if (!want) return null;
  const got = typeof actual === "string" ? actual : "";
  if (got === want) return null;
  return `"/api/health": supabaseRef=${got || "?"}, а очікувався ${want} — NEXT_PUBLIC_SUPABASE_URL цього середовища у Vercel веде не в той проєкт Supabase; звірте змінну і зробіть Redeploy`;
}
