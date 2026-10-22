import { describe, expect, it } from "vitest";
import { formatPracticeDateTime, practiceWallTimeToInstant, practiceWeekRange } from "@/lib/time";
import { dayView, holdsList, holdStatus, slotStatus, therapistWeek, type HoldRow, type SlotRow } from "./status";

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

describe("підтвердження й список утримань", () => {
  it("AC-HOLD-12: підтверджений слот лишається «Confirmed» і після 24 годин, без «Held until»", () => {
    const s = slot("s", "2026-11-05", 10);
    const h = { ...hold("s", at("2026-11-02", 14, 30)), confirmed_at: at("2026-11-02", 16).toISOString() };
    for (const now of [at("2026-11-02", 16, 1), at("2026-11-04", 9)]) {
      expect(holdStatus(h, now)).toBe("confirmed");
      expect(slotStatus(s, [h], now)).toBe("confirmed");
      expect(dayView([s], [h], now).items[0]).toMatchObject({ status: "confirmed" });
    }
  });

  it("AC-HOLD-20: планувальник бачить прострочене утримання, слот вільний", () => {
    const s = slot("s", "2026-11-05", 10);
    const h = hold("s", at("2026-11-02", 14, 30));
    const now = at("2026-11-03", 15);
    expect(holdsList([h], [s], now)).toEqual([{ hold: h, slot: s, status: "expired" }]);
    expect(slotStatus(s, [h], now)).toBe("free");
  });

  it("AC-HOLD-28: прострочене утримання видно до початку слоту", () => {
    const s = slot("s", "2026-11-05", 10);
    const h = hold("s", at("2026-11-02", 14, 30));
    expect(holdsList([h], [s], at("2026-11-05", 9, 59)).map((i) => i.status)).toEqual(["expired"]);
  });

  it("AC-HOLD-29: з початку слоту прострочене утримання в списку не показано", () => {
    const s = slot("s", "2026-11-05", 10);
    const h = hold("s", at("2026-11-02", 14, 30));
    expect(holdsList([h], [s], at("2026-11-05", 10))).toEqual([]);
    expect(holdsList([h], [s], at("2026-11-05", 12))).toEqual([]);
  });

  it("список — «Held» і «Expired» за часом слоту від найближчого, без сеансів (Q3)", () => {
    const now = at("2026-11-03", 15);
    const s1 = slot("t1-05-10", "2026-11-05", 10);
    const s2 = slot("t2-04-11", "2026-11-04", 11);
    const s3 = slot("t1-04-12", "2026-11-04", 12);
    const expired = hold("t1-05-10", at("2026-11-02", 14, 30));
    const held = hold("t2-04-11", at("2026-11-03", 9));
    const session = { ...hold("t1-04-12", at("2026-11-02", 9)), confirmed_at: at("2026-11-02", 10).toISOString() };
    expect(holdsList([expired, session, held], [s1, s2, s3], now).map((i) => [i.slot.id, i.status])).toEqual([
      ["t2-04-11", "held"],
      ["t1-05-10", "expired"],
    ]);
  });
});

describe("розклад терапевта", () => {
  // Дані AC-HOLD-30 / AC-HOLD-31: сьогодні середа 2026-11-04.
  const now = at("2026-11-04", 9);
  const slots = [
    slot("s0210", "2026-11-02", 10),
    slot("s0610", "2026-11-06", 10),
    slot("s0611", "2026-11-06", 11),
    slot("s0612", "2026-11-06", 12),
    slot("s1210", "2026-11-12", 10),
  ];
  const holds = [
    hold("s0210", at("2026-10-30", 9), true),
    hold("s0610", at("2026-11-04", 8)),
    hold("s1210", at("2026-11-01", 9), true),
  ];
  const statuses = (days: ReturnType<typeof therapistWeek>) =>
    days.flatMap((d) => d.items.map((i) => `${d.date} ${formatPracticeDateTime(new Date(i.slot.starts_at)).slice(11)} ${i.status}`));

  it("AC-HOLD-30: поточний тиждень пн–нд з усіма слотами й статусами", () => {
    const week = practiceWeekRange("2026-11-04");
    expect([week.monday, week.sunday]).toEqual(["2026-11-02", "2026-11-08"]);
    const days = therapistWeek(slots, holds, week.monday, now);
    expect(days.map((d) => d.date)).toEqual([
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ]);
    expect(statuses(days)).toEqual([
      "2026-11-02 10:00 confirmed",
      "2026-11-06 10:00 held",
      "2026-11-06 11:00 free",
      "2026-11-06 12:00 free",
    ]);
  });

  it("AC-HOLD-31: наступний тиждень — 2026-11-09 – 2026-11-15 і сеанс 2026-11-12", () => {
    const next = practiceWeekRange("2026-11-09");
    expect([next.monday, next.sunday]).toEqual(["2026-11-09", "2026-11-15"]);
    expect(statuses(therapistWeek(slots, holds, next.monday, now))).toEqual(["2026-11-12 10:00 confirmed"]);
  });

  it("AC-HOLD-21: прострочене утримання в розкладі не показано, слот вільний", () => {
    const s = slot("s0510", "2026-11-05", 10);
    const expired = hold("s0510", at("2026-11-02", 14, 30));
    const [item] = therapistWeek([s], [expired], "2026-11-02", at("2026-11-03", 15)).flatMap((d) => d.items);
    expect(item.status).toBe("free");
    expect(item.hold).toBeUndefined();
  });
});
