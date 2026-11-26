// D0: чи відповіла база на запит /api/health. Чиста функція — щоб перевірити всі гілки тестом без мережі.
// Запит — публічним ключем до таблиці без доступу для anon: «немає прав» (42501) теж означає, що Postgres живий.

/** SQLSTATE класу 42 (напр. 42501 «permission denied»): Postgres розібрав запит і відмовив — база жива.
 *  Інші класи (53300 «too many connections», 57P01, 08006) — збій бази, а не відповідь на запит. */
const SQLSTATE_DB_ANSWERED = /^42[0-9A-Z]{3}$/;
/** PostgREST не дістав до бази: PGRST000–003 — немає з'єднання, PGRST300–302 — відмова за налаштуванням JWT
 *  (немає секрету, хибний JWT, anon вимкнено) ще до запиту в базу. */
const PGRST_DB_DOWN = /^PGRST(00[0-3]|30[0-2])$/;
/** Supabase відповідає 540, коли безкоштовний проєкт призупинено (Dashboard → Resume project). */
const SUPABASE_PAUSED = 540;

export type DbProbe = { status: number; error: { code?: string; message?: string } | null };
export type DbHealth = { db: "ok" | "down"; reason: string };

export function classifyDbProbe({ status, error }: DbProbe): DbHealth {
  if (status === SUPABASE_PAUSED) return { db: "down", reason: "paused" };
  const code = error?.code ?? "";
  if (!error || SQLSTATE_DB_ANSWERED.test(code) || (code.startsWith("PGRST") && !PGRST_DB_DOWN.test(code))) {
    return { db: "ok", reason: "" };
  }
  if (/api key/i.test(error.message ?? "")) return { db: "down", reason: "invalid-api-key" };
  // 0 — мережа (Supabase недоступний або хибний URL), 5xx, PGRST000–003 і 300–302, SQLSTATE поза класом 42.
  return { db: "down", reason: `status-${status}${code ? `-${code}` : ""}` };
}

/** Ref проєкту Supabase з NEXT_PUBLIC_SUPABASE_URL (https://<ref>.supabase.co) — не секрет; показує, яку базу бачить
 *  розгортання (ADR 0007: staging і прод — різні проєкти). Інша адреса (локальна, власний домен) — "unknown". */
export function supabaseRefFromUrl(url: string | undefined): string {
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i.exec(url ?? "");
  return match ? match[1] : "unknown";
}

/** Середовище застосунку: APP_ENV (Vercel задає staging лише для гілки staging), інакше VERCEL_ENV, інакше local. */
export function resolveAppEnv(env: { APP_ENV?: string; VERCEL_ENV?: string }): string {
  return env.APP_ENV || env.VERCEL_ENV || "local";
}
