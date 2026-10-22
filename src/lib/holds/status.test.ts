import { describe, expect, it } from "vitest";
import { formatPracticeDateTime, practiceWallTimeToInstant } from "@/lib/time";
import { dayView, holdStatus, slotStatus, type HoldRow, type SlotRow } from "./status";

// Дані тестів — у часі практики (America/Los_Angeles), як у критеріях PM.
const at = (date: string, hour: number, minute = 0) => practiceWallTimeToInstant(date, hour, minute);

function slot(id: string, date: string, hour: number): SlotRow {
  const start = at(date, hour);
  return { id, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 3_600_000).toISOString() };
}

function hold(slotId: string, created: Date, confirmed = false): HoldRow {
  return {
    id: `hold-${slotId}-${created.getTime()}`,
    slot_id: slotId,
    client_id: "client1",
    created_at: created.toISOString(),
    expires_at: new Date(created.getTime() + 1440 * 60_000).toISOString(),
    confirmed_at: confirmed ? created.toISOString() : null,
  };
}

describe("статуси слотів дня", () => {
  it("AC-HOLD-01: вільний, утриманий і підтверджений слоти; утримати можна лише вільний", () => {
    const now = at("2026-11-02", 9);
    const slots = [slot("s10", "2026-11-03", 10), slot("s11", "2026-11-03", 11), slot("s12", "2026-11-03", 12)];
    const holds = [hold("s11", at("2026-11-02", 8)), hold("s12", at("2026-11-01", 8), true)];
    const { items } = dayView(slots, holds, now);
    expect(items.map((i) => i.status)).toEqual(["free", "held", "confirmed"]);
    expect(items.filter((i) => i.status === "free").map((i) => i.slot.id)).toEqual(["s10"]);
  });

  it("AC-HOLD-02: утриманий слот має статус «Held» і «Held until» через 24 години", () => {
    const s = slot("s10", "2026-11-03", 10);
    const h = hold("s10", at("2026-11-02", 14, 30));
    expect(slotStatus(s, [h], at("2026-11-02", 14, 31))).toBe("held");
    expect(`Held until ${formatPracticeDateTime(new Date(h.expires_at))}`).toBe("Held until 2026-11-03 14:30");
  });

  it("AC-HOLD-05: за хвилину до прострочення утримання ще «Held»", () => {
    const h = hold("s", at("2026-11-02", 14, 30));
    expect(holdStatus(h, at("2026-11-03", 14, 29))).toBe("held");
  });

  it("AC-HOLD-06: через 24 години утримання «Expired», а слот вільний", () => {
    const s = slot("s", "2026-11-05", 10);
    const h = hold("s", at("2026-11-02", 14, 30));
    for (const now of [at("2026-11-03", 14, 30), at("2026-11-03", 18)]) {
      expect(holdStatus(h, now)).toBe("expired");
      expect(slotStatus(s, [h], now)).toBe("free");
    }
  });

  it("AC-HOLD-18: усі слоти утримані або підтверджені — повідомлення й обидва слоти", () => {
    const now = at("2026-11-03", 9);
    const slots = [slot("s10", "2026-11-04", 10), slot("s11", "2026-11-04", 11)];
    const holds = [hold("s10", at("2026-11-03", 8)), hold("s11", at("2026-11-02", 8), true)];
    const view = dayView(slots, holds, now);
    expect(view.message).toBe("No free slots on this day.");
    expect(view.items.map((i) => i.status)).toEqual(["held", "confirmed"]);
  });

  it("AC-HOLD-24: день без жодного слоту — лише повідомлення", () => {
    const view = dayView([], [], at("2026-11-05", 9));
    expect(view.message).toBe("No free slots on this day.");
    expect(view.items).toEqual([]);
  });

  it("AC-HOLD-32: слоти, що вже почалися, без активного утримання — «Past»", () => {
    const now = at("2026-11-03", 12, 30);
    const slots = [slot("s10", "2026-11-03", 10), slot("s11", "2026-11-03", 11)];
    const expired = hold("s11", at("2026-11-02", 9));
    const view = dayView(slots, [expired], now);
    expect(view.items.map((i) => i.status)).toEqual(["past", "past"]);
    expect(slotStatus(slot("s10b", "2026-11-03", 10), [], at("2026-11-03", 10))).toBe("past");
  });

  it("AC-HOLD-33: «Past», «Held» і «Confirmed» без вільних — повідомлення й усі чотири слоти", () => {
    const now = at("2026-11-03", 12, 30);
    const slots = [
      slot("s14", "2026-11-03", 14),
      slot("s10", "2026-11-03", 10),
      slot("s13", "2026-11-03", 13),
      slot("s11", "2026-11-03", 11),
    ];
    const holds = [hold("s13", at("2026-11-03", 8)), hold("s14", at("2026-11-02", 8), true)];
    const view = dayView(slots, holds, now);
    expect(view.message).toBe("No free slots on this day.");
    expect(view.items.map((i) => [i.slot.id, i.status])).toEqual([
      ["s10", "past"],
      ["s11", "past"],
      ["s13", "held"],
      ["s14", "confirmed"],
    ]);
  });
});
