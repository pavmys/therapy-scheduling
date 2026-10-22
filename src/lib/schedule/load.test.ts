import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { practiceWallTimeToInstant } from "@/lib/time";
import { loadTherapistWeek } from "./load";

// Підмінений Supabase (ADR 0002): таблиці — масиви рядків, фільтри виконуються в пам'яті, тож тест
// перевіряє і те, що завантаження фільтрує за терапевтом поверх RLS.
type Row = Record<string, unknown>;

// Мінімальний розбір фільтра PostgREST .or("a.not.is.null,b.gt.<value>") — лише ті форми, що вживає load.ts.
function matchesOr(row: Row, filter: string): boolean {
  return filter.split(",").some((cond) => {
    const notNull = /^(\w+)\.not\.is\.null$/.exec(cond);
    if (notNull) return row[notNull[1]] !== null && row[notNull[1]] !== undefined;
    const gt = /^(\w+)\.gt\.(.+)$/.exec(cond);
    if (gt) return new Date(String(row[gt[1]])).getTime() > new Date(gt[2]).getTime();
    throw new Error(`Непідтримана умова фільтра: ${cond}`);
  });
}

function fakeSupabase(tables: Record<string, Row[]>) {
  const calls: { table: string; filters: string[]; returned: Row[] }[] = [];
  const from = (table: string) => {
    let rows = [...(tables[table] ?? [])];
    const filters: string[] = [];
    const call = { table, filters, returned: [] as Row[] };
    calls.push(call);
    const query = {
      select: () => query,
      eq: (col: string, v: unknown) => (filters.push(`${col}=${v}`), (rows = rows.filter((r) => r[col] === v)), query),
      gte: (col: string, v: string) => ((rows = rows.filter((r) => String(r[col]) >= v)), query),
      lt: (col: string, v: string) => ((rows = rows.filter((r) => String(r[col]) < v)), query),
      in: (col: string, vs: unknown[]) => ((rows = rows.filter((r) => vs.includes(r[col]))), query),
      or: (filter: string) => (filters.push(`or=${filter}`), (rows = rows.filter((r) => matchesOr(r, filter))), query),
      order: () => query,
      then: (resolve: (v: { data: Row[]; error: null }) => unknown) => ((call.returned = rows), resolve({ data: rows, error: null })),
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
      slots: [
        slot("t1", "therapist1", "2026-11-04", 10),
        slot("t2", "therapist2", "2026-11-04", 10),
        slot("t1b", "therapist1", "2026-11-05", 10),
      ],
      holds: [
        held("t1", "client1"),
        held("t2", "client2"),
        // Прострочене утримання (AC-HOLD-21): у вибірку не потрапляє, слот вільний.
        { ...held("t1b", "client3"), id: "h-expired", created_at: iso("2026-10-31", 9), expires_at: iso("2026-11-01", 9) },
      ],
      clients: [
        { id: "client1", full_name: "Client One" },
        { id: "client2", full_name: "Client Two" },
        { id: "client3", full_name: "Client Three" },
      ],
    });
    const result = await loadTherapistWeek(client, "therapist1", "2026-11-04", practiceWallTimeToInstant("2026-11-02", 12));

    const items = result.days.flatMap((d) => d.items);
    expect(items.map((i) => [i.slot.id, i.status])).toEqual([
      ["t1", "held"],
      ["t1b", "free"],
    ]);
    expect(result.clientName.get(items[0].hold!.client_id)).toBe("Client One");
    expect(items[0].hold!.expires_at).toBe(iso("2026-11-03", 9));
    expect([...result.clientName.values()]).not.toContain("Client Two");
    expect(calls.find((c) => c.table === "slots")?.filters).toContain("therapist_id=therapist1");
    // Прострочене утримання не завантажене з бази (лише сеанси й активні) і не показане.
    expect(calls.find((c) => c.table === "holds")?.returned.map((r) => r.id)).toEqual(["h-t1"]);
    expect(items.some((i) => i.hold?.id === "h-expired")).toBe(false);
    expect([...result.clientName.values()]).not.toContain("Client Three");
    expect(result.error).toBeNull();
  });
});
