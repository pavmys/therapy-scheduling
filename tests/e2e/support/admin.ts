// Синтетичні дані UAT і прибирання за ними — секретним ключем Supabase (обходить RLS).
// Лише в тестах і лише на машині розробника (.env.local) або в CI на одноразовому локальному стеку (e2e.yml).
// У GitHub Secrets SUPABASE_SECRET_KEY не додаємо. Без ключа (прогін лише AC, що нічого не пишуть,
// --grep-invert '@writes') цей файл нічого не робить: cleanup.teardown.ts не реєструє тест.
// check:boundary сканує src/, тож цей файл його не порушує; у src/ секретний ключ читає лише src/lib/supabase/admin.ts.
// Ніколи не друкуємо значення ключів і паролів — лише адреси синтетичних користувачів.
//
// Джерело: демо-репо курсу, tests/e2e/support/admin.ts (тег ws8-03-uat). Демо-специфічні помічники (createEmployee
// з підрозділом і посадою, isBlockedDay, leaveRequestsOf) прибрано — подивіться їх у демо як зразок для своїх.
import { randomBytes, randomInt } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ВАШЕ: рядки синтетичного користувача, які треба видалити ДО deleteUser, — таблиці з FK на користувача без
 * on delete cascade (інакше Auth відповідає «Database error deleting user»). У демо: leave_requests.employee_id.
 * Якщо таких таблиць немає (або всі FK — cascade), лишіть порожнім.
 */
const OWNED_ROWS: { table: string; column: string }[] = [];

/** Лише такі адреси прибирання має право видалити: uat-<run>[-<суфікс>]@example.test. */
export const UAT_EMAIL = /^uat-[0-9a-z-]+@example\.test$/;

export function uatEmail(suffix?: string): string {
  const run = process.env.UAT_RUN ?? "manual";
  const email = `uat-${run}${suffix ? `-${suffix}` : ""}@example.test`;
  if (!UAT_EMAIL.test(email)) throw new Error(`Синтетична адреса має вигляд uat-…@example.test, а не ${email}`);
  return email;
}

export const randomPassword = () => `Uat-${randomBytes(12).toString("base64url")}`;

export function hasAdminKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/** Клієнт із секретним ключем — для ваших помічників синтетичних даних (створити користувача, прочитати рядок). */
export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("Для синтетичних даних UAT потрібні NEXT_PUBLIC_SUPABASE_URL і SUPABASE_SECRET_KEY (.env.local)");
  }
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function listUatUsers(supabase: SupabaseClient): Promise<{ id: string; email: string }[]> {
  const found: { id: string; email: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email && UAT_EMAIL.test(u.email)) found.push({ id: u.id, email: u.email });
    if (data.users.length < 1000) return found;
  }
}

const CLEANUP_LOG = "test-results/uat-cleanup.jsonl";

/** Усі uat-адреси, які видалив цей прогін (за журналом). */
export function deletedThisRun(): string[] {
  if (!existsSync(CLEANUP_LOG)) return [];
  const entries = readFileSync(CLEANUP_LOG, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { deleted: string[] });
  return [...new Set(entries.flatMap((e) => e.deleted))];
}

/** leftoverRequests — скільки рядків видалених користувачів лишилось у таблицях OWNED_ROWS (назва поля — з демо). */
export type CleanupResult = { deleted: string[]; remaining: string[]; leftoverRequests: number };

// ── Синтетичні картки клієнтів (зріз 3, AC-INS) ────────────────────────────────────────────────────────────────
// Картка клієнта — не користувач Auth: email картки uat-…@example.test (UAT_EMAIL), тож deleteUatUsers прибирає й
// картки. Терапевтові картка «своя» через утримання в його слоті (private.is_own_client), а слотів застосунок не
// створює — тест вставляє слот сам, лише в UAT_SLOTS (2099 рік: справжніх слотів там немає). Порядок прибирання —
// з FK: holds.client_id — on delete restrict (спершу утримання), slots → holds — cascade.
const UAT_SLOTS = { from: "2099-01-01T00:00:00Z", to: "2100-01-01T00:00:00Z" } as const;
const HOUR_MS = 3_600_000;

export type InsuranceStatus = "not_set" | "verified" | "not_accepted" | "private_pay";

/** Картка дорослого клієнта з синтетичним email; без insuranceStatus — default бази («Not set»). Повертає id. */
export async function createUatCard(email: string, fullName: string, insuranceStatus?: InsuranceStatus): Promise<string> {
  if (!UAT_EMAIL.test(email)) throw new Error(`Синтетична картка має email uat-…@example.test, а не ${email}`);
  const { data, error } = await adminClient()
    .from("clients")
    .insert({
      full_name: fullName,
      email,
      client_type: "adult",
      date_of_birth: "1990-01-01",
      session_language: "English",
      ...(insuranceStatus ? { insurance_status: insuranceStatus } : {}),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Робить картку «своїм клієнтом» терапевта: слот терапевта в UAT_SLOTS і утримання «Held» (24 год) за карткою. */
export async function makeOwnClient(clientId: string, therapistEmail: string): Promise<void> {
  const supabase = adminClient();
  const { data: therapist, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", therapistEmail)
    .single();
  if (profileError) throw profileError;
  // Випадкова година 2099 року: слот починається на початку години (slots_hour_start_check), без збігу зі слотом
  // іншого прогону (slots_therapist_start_key).
  const startsAt = Date.parse(UAT_SLOTS.from) + randomInt(0, 24 * 365) * HOUR_MS;
  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .insert({
      therapist_id: therapist.id,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(startsAt + HOUR_MS).toISOString(),
    })
    .select("id")
    .single();
  if (slotError) throw slotError;
  const createdAt = Math.floor(Date.now() / 60_000) * 60_000;
  const { error: holdError } = await supabase.from("holds").insert({
    slot_id: slot.id,
    client_id: clientId,
    created_at: new Date(createdAt).toISOString(),
    expires_at: new Date(createdAt + 24 * HOUR_MS).toISOString(),
  });
  if (holdError) throw holdError;
}

/** Статус страхування картки в базі (секретним ключем, повз RLS) — невидима частина «Тоді». */
export async function insuranceStatusOf(clientId: string): Promise<string> {
  const { data, error } = await adminClient().from("clients").select("insurance_status").eq("id", clientId).single();
  if (error) throw error;
  return data.insurance_status as string;
}

/**
 * Задати статус страхування картки повз застосунок — лише для «Дано» (секретний ключ обходить RLS). Лише синтетична
 * картка uat-…@example.test (як у deleteUatCards) і рівно один змінений рядок: інакше «Дано» не те, що ми думаємо.
 */
export async function setInsuranceStatusDirectly(clientId: string, status: InsuranceStatus): Promise<void> {
  const supabase = adminClient();
  // Спершу адреса, потім update: `like 'uat-%'` пропускає й адреси поза UAT_EMAIL, а перевірка після update
  // зміну вже не скасувала б (рев'ю PR #47).
  const { data: card, error: readError } = await supabase
    .from("clients")
    .select("email")
    .eq("id", clientId)
    .maybeSingle();
  if (readError) throw readError;
  if (!card?.email || !UAT_EMAIL.test(card.email)) {
    throw new Error(`setInsuranceStatusDirectly: синтетичної картки ${clientId} не знайдено`);
  }
  const { data, error } = await supabase
    .from("clients")
    .update({ insurance_status: status })
    .eq("id", clientId)
    .eq("email", card.email)
    .select("id");
  if (error) throw error;
  if (data?.length !== 1) {
    throw new Error(`setInsuranceStatusDirectly: синтетичну картку ${clientId} не оновлено (рядків: ${data?.length ?? 0})`);
  }
}

/**
 * Прибирає синтетичні картки (усі uat-…@example.test або лише onlyEmail), їхні утримання й слоти UAT_SLOTS, а потім
 * рахує, скільки таких рядків лишилось. Без onlyEmail — і всі слоти UAT_SLOTS (залишки обірваних прогонів).
 */
async function deleteUatCards(
  supabase: SupabaseClient,
  onlyEmail?: string,
): Promise<{ deleted: string[]; remaining: string[]; leftover: number }> {
  const listCards = async () => {
    const { data, error } = await supabase.from("clients").select("id, email").like("email", "uat-%@example.test");
    if (error) throw error;
    return (data as { id: string; email: string }[]).filter(
      (c) => UAT_EMAIL.test(c.email) && (!onlyEmail || c.email === onlyEmail),
    );
  };
  const cards = await listCards();
  const ids = cards.map((c) => c.id);
  let slotIds: string[] = [];
  if (ids.length) {
    const { data: holds, error } = await supabase.from("holds").select("slot_id").in("client_id", ids);
    if (error) throw error;
    slotIds = [...new Set((holds as { slot_id: string }[]).map((h) => h.slot_id))];
    const { error: holdsError } = await supabase.from("holds").delete().in("client_id", ids);
    if (holdsError) throw holdsError;
    const { error: cardsError } = await supabase.from("clients").delete().in("id", ids);
    if (cardsError) throw cardsError;
  }
  // Слоти — лише в UAT_SLOTS: слот поза 2099 роком тест не створював і не видаляє, навіть якщо утримання було в ньому.
  // З onlyEmail — лише слоти утримань цієї картки; без нього — усі слоти UAT_SLOTS (і залишки обірваних прогонів).
  let slotQuery = supabase.from("slots").select("id").gte("starts_at", UAT_SLOTS.from).lt("starts_at", UAT_SLOTS.to);
  if (onlyEmail) slotQuery = slotQuery.in("id", slotIds);
  const { data: slots, error: slotsError } = await slotQuery;
  if (slotsError) throw slotsError;
  const targetSlots = (slots as { id: string }[]).map((s) => s.id);
  if (targetSlots.length) {
    const { error } = await supabase.from("slots").delete().in("id", targetSlots);
    if (error) throw error;
  }
  const remaining = (await listCards()).map((c) => c.email);
  let leftover = 0;
  for (const [table, column, values] of [
    ["holds", "client_id", ids],
    ["slots", "id", targetSlots],
  ] as const) {
    if (!values.length) continue;
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true }).in(column, values);
    if (error) throw error;
    leftover += count ?? 0;
  }
  return { deleted: cards.map((c) => c.email), remaining, leftover };
}

/**
 * Видаляє ВСІХ uat-*@example.test (і тих, що лишились після обірваних прогонів), а потім перевіряє:
 * жодного такого користувача й жодного їхнього рядка в OWNED_ROWS. Так само — синтетичні картки клієнтів
 * uat-…@example.test з їхніми утриманнями й слотами UAT (deleteUatCards): їхні адреси — у deleted і remaining,
 * а утримання й слоти, що лишились, — у leftoverRequests.
 */
export async function deleteUatUsers(onlyEmail?: string): Promise<CleanupResult> {
  const supabase = adminClient();
  const cards = await deleteUatCards(supabase, onlyEmail);
  const targets = (await listUatUsers(supabase)).filter((u) => !onlyEmail || u.email === onlyEmail);
  const deleted: string[] = [...cards.deleted];
  for (const u of targets) {
    for (const { table, column } of OWNED_ROWS) {
      const { error: rowsError } = await supabase.from(table).delete().eq(column, u.id);
      if (rowsError) throw rowsError;
    }
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) throw error;
    deleted.push(u.email);
  }
  const remaining = [
    ...cards.remaining,
    ...(await listUatUsers(supabase)).filter((u) => !onlyEmail || u.email === onlyEmail).map((u) => u.email),
  ];
  let leftoverRequests = cards.leftover;
  for (const { table, column } of targets.length ? OWNED_ROWS : []) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .in(
        column,
        targets.map((u) => u.id),
      );
    if (error) throw error;
    leftoverRequests += count ?? 0;
  }
  // Журнал прибирань прогону: afterAll специфікацій і teardown (Playwright чистить test-results/ на старті прогону).
  mkdirSync("test-results", { recursive: true });
  appendFileSync(
    CLEANUP_LOG,
    `${JSON.stringify({ at: new Date().toISOString(), scope: onlyEmail ?? "uat-*", deleted, remaining, leftoverRequests })}\n`,
  );
  return { deleted, remaining, leftoverRequests };
}
