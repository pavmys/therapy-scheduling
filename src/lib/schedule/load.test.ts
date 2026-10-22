import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { practiceWallTimeToInstant } from "@/lib/time";
import { loadTherapistWeek } from "./load";

// Підмінений Supabase (ADR 0002): таблиці — масиви рядків, фільтри виконуються в пам'яті, тож тест
// перевіряє і те, що завантаження фільтрує за терапевтом поверх RLS.
type Row = Record<string, unknown>;

function fakeSupabase(tables: Record<string, Row[]>) {
  const calls: { table: string; filters: string[] }[] = [];
  const from = (table: string) => {
    let rows = [...(tables[table] ?? [])];
    const filters: string[] = [];
    calls.push({ table, filters });
    const query = {
      select: () => query,
      eq: (col: string, v: unknown) => (filters.push(`${col}=${v}`), (rows = rows.filter((r) => r[col] === v)), query),
      gte: (col: string, v: string) => ((rows = rows.filter((r) => String(r[col]) >= v)), query),
      lt: (col: string, v: string) => ((rows = rows.filter((r) => String(r[col]) < v)), query),
      in: (col: string, vs: unknown[]) => ((rows = rows.filter((r) => vs.includes(r[col]))), query),
      or: (filter: string) => (filters.push(`or=${filter}`), query),
      order: () => query,
      then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: rows, error: null }),
    };
    return query;
  };
  return { client: { from } as unknown as SupabaseClient<Database>, calls };
}

const iso = (date: string, hour: number) => practiceWallTimeToInstant(date, hour).toISOString();
const slot = (id: string, therapist: string, date: string, hour: number) => ({
  id,
  therapist_id: therapist,
  starts_at: iso(date, hour),
  ends_at: iso(date, hour + 1),
});
const held = (slotId: string, clientId: string) => ({
  id: `h-${slotId}`,
  slot_id: slotId,
  client_id: clientId,
  created_at: iso("2026-11-02", 9),
  expires_at: iso("2026-11-03", 9),
  confirmed_at: null,
});

describe("loadTherapistWeek", () => {
  it("AC-HOLD-09: терапевт бачить своє утримання з ім'ям клієнта й «Held until», без розкладу інших", async () => {
    const { client, calls } = fakeSupabase({
      slots: [slot("t1", "therapist1", "2026-11-04", 10), slot("t2", "therapist2", "2026-11-04", 10)],
      holds: [held("t1", "client1"), held("t2", "client2")],
      clients: [
        { id: "client1", full_name: "Client One" },
        { id: "client2", full_name: "Client Two" },
      ],
    });
    const result = await loadTherapistWeek(client, "therapist1", "2026-11-04", practiceWallTimeToInstant("2026-11-02", 12));

    const items = result.days.flatMap((d) => d.items);
    expect(items.map((i) => [i.slot.id, i.status])).toEqual([["t1", "held"]]);
    expect(result.clientName.get(items[0].hold!.client_id)).toBe("Client One");
    expect(items[0].hold!.expires_at).toBe(iso("2026-11-03", 9));
    expect([...result.clientName.values()]).not.toContain("Client Two");
    expect(calls.find((c) => c.table === "slots")?.filters).toContain("therapist_id=therapist1");
    // Прострочені утримання не завантажуються (лише сеанси й активні).
    expect(calls.find((c) => c.table === "holds")?.filters.some((f) => f.startsWith("or=confirmed_at.not.is.null,expires_at.gt."))).toBe(true);
    expect(result.error).toBeNull();
  });
});
