// Час практики (design.md impl-hold, D5): усе показуємо й рахуємо в America/Los_Angeles з точністю
// до хвилини, формат «YYYY-MM-DD HH:mm» (24 год). Без бібліотек — Intl з явною зоною, тож межі
// дня й тижня правильні й у дні переходу на літній/зимовий час.

export const PRACTICE_TIME_ZONE = "America/Los_Angeles";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PRACTICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type WallTime = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function wallTime(at: Date): WallTime {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(at).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatPracticeDate(at: Date): string {
  const w = wallTime(at);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

export function formatPracticeTime(at: Date): string {
  const w = wallTime(at);
  return `${pad(w.hour)}:${pad(w.minute)}`;
}

export function formatPracticeDateTime(at: Date): string {
  return `${formatPracticeDate(at)} ${formatPracticeTime(at)}`;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isPracticeDate(value: string): boolean {
  const m = DATE_PATTERN.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

function parseDate(value: string): [number, number, number] {
  const m = DATE_PATTERN.exec(value);
  if (!m) throw new Error(`Invalid date: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

// Календарна арифметика над датою «YYYY-MM-DD» (без зони).
export function addDays(date: string, days: number): string {
  const [y, m, d] = parseDate(date);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

// Зсув зони практики відносно UTC у мілісекундах у момент `at`.
function zoneOffset(at: Date): number {
  const w = wallTime(at);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(at.getTime() / 1000) * 1000;
}

// Момент, коли в зоні практики настає `date` `hour`:`minute`.
export function practiceWallTimeToInstant(date: string, hour = 0, minute = 0): Date {
  const [y, m, d] = parseDate(date);
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  let instant = guess - zoneOffset(new Date(guess));
  // Другий прохід: зсув у знайдений момент може відрізнятися (день переходу часу).
  instant = guess - zoneOffset(new Date(instant));
  return new Date(instant);
}

// День практики як напіввідкритий проміжок [start, end).
export function practiceDayRange(date: string): { start: Date; end: Date } {
  return { start: practiceWallTimeToInstant(date), end: practiceWallTimeToInstant(addDays(date, 1)) };
}

// Тиждень практики — з понеділка по неділю (припущення PM).
export function practiceWeekStart(date: string): string {
  const [y, m, d] = parseDate(date);
  const isoDow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = понеділок
  return addDays(date, -isoDow);
}

export function practiceWeekRange(date: string): { monday: string; sunday: string; start: Date; end: Date } {
  const monday = practiceWeekStart(date);
  return {
    monday,
    sunday: addDays(monday, 6),
    start: practiceWallTimeToInstant(monday),
    end: practiceWallTimeToInstant(addDays(monday, 7)),
  };
}

export function practiceToday(now: Date): string {
  return formatPracticeDate(now);
}
