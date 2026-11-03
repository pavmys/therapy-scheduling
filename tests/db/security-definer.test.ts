import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

// Ворота для правила AGENTS.md («База даних»): кожна функція `security definer` у наших схемах має
// `set search_path = ''`. Функція працює з правами власника, а імена й оператори шукає за `search_path`
// того, хто її викликає; `create or replace` без SET прибирає його з попереднього визначення.
// Перевіряємо стан після ВСІХ міграцій, тож тест ловить і нову функцію, і перевизначення наявної.
let t: TestDb;

type DefinerFunction = { name: string; config: string[] | null };

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);

describe("функції security definer", () => {
  it("кожна функція security definer у public і private має set search_path = ''", async () => {
    const functions = await t.asService<DefinerFunction>(
      `select n.nspname || '.' || p.proname as name, p.proconfig as config
         from pg_catalog.pg_proc as p
         join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
        where p.prosecdef and n.nspname in ('public', 'private')
        order by name`,
    );
    // Перевірка тесту: хелпери ролей і функції утримань справді security definer.
    expect(functions.map((f) => f.name)).toEqual(
      expect.arrayContaining(["private.current_app_role", "private.is_staff"]),
    );

    const withoutSafePath = functions.filter((f) => !(f.config ?? []).includes('search_path=""')).map((f) => f.name);
    expect(withoutSafePath).toEqual([]);
  });
});
