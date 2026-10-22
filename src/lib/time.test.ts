import { describe, expect, it } from "vitest";
import {
  addDays,
  formatPracticeDateTime,
  isPracticeDate,
  practiceDayRange,
  practiceToday,
  practiceWallTimeToInstant,
  practiceWeekRange,
} from "./time";

describe("час практики (America/Los_Angeles)", () => {
  it("формат YYYY-MM-DD HH:mm, 24 години", () => {
    expect(formatPracticeDateTime(new Date("2026-11-03T22:30:00Z"))).toBe("2026-11-03 14:30");
    expect(formatPracticeDateTime(new Date("2026-11-04T07:05:00Z"))).toBe("2026-11-03 23:05");
  });

  it("місцевий час у момент і назад", () => {
    expect(practiceWallTimeToInstant("2026-11-03", 10).toISOString()).toBe("2026-11-03T18:00:00.000Z");
    expect(practiceWallTimeToInstant("2026-10-26", 9).toISOString()).toBe("2026-10-26T16:00:00.000Z");
  });

  it("день переходу на зимовий час (2026-11-01) триває 25 годин", () => {
    const { start, end } = practiceDayRange("2026-11-01");
    expect(start.toISOString()).toBe("2026-11-01T07:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });

  it("24 години через перехід часу — «Held until» на годину інший (припущення PM)", () => {
    const created = practiceWallTimeToInstant("2026-10-31", 14, 30);
    const expires = new Date(created.getTime() + 1440 * 60_000);
    expect(formatPracticeDateTime(expires)).toBe("2026-11-01 13:30");
  });

  it("тиждень з понеділка по неділю", () => {
    expect(practiceWeekRange("2026-11-04")).toMatchObject({ monday: "2026-11-02", sunday: "2026-11-08" });
    expect(practiceWeekRange("2026-11-08").monday).toBe("2026-11-02");
    expect(practiceWeekRange("2026-11-09").monday).toBe("2026-11-09");
  });

  it("сьогодні — за зоною практики, а не UTC", () => {
    expect(practiceToday(new Date("2026-11-04T05:00:00Z"))).toBe("2026-11-03");
  });

  it("дати", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(isPracticeDate("2026-11-03")).toBe(true);
    expect(isPracticeDate("2026-02-30")).toBe(false);
    expect(isPracticeDate("03.11.2026")).toBe(false);
  });
});
