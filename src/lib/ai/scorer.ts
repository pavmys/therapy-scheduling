import type { CardFields } from "@/lib/clients/validate";
import type { IntakeOutcome, IntakeState } from "./intake";

// Один golden case PM (HryhoriiHaponiukQuitCode/therapy-scheduling-spec#36, таблиця «Golden cases») →
// tests/fixtures/golden/cases.json. `expected` — лише значення з колонки «Очікуваний результат» PM:
// стан (чернетка чи ні), поля, які PM називає (зі значенням або «порожні»), і дослівне повідомлення.
export type GoldenCase = {
  id: string; // "GC-01"
  ac: string; // AC PM, на який посилається колонка «Правило»
  input: string;
  today: string; // «Сьогодні» PM — 2026-11-13 в America/Los_Angeles
  expected: {
    state: Extract<IntakeState, "ready" | "incomplete" | "refused">;
    message: string;
    fields?: Partial<CardFields>; // "" = поле порожнє
  };
};

export type Mismatch = { field: string; expected: unknown; actual: unknown };

// Детермінована оцінка: точний збіг стану, повідомлення й полів, зафіксованих PM. Для «без чернетки» форма не
// змінюється — тож полів у результаті бути не повинно.
export function scoreOutcome(expected: GoldenCase["expected"], actual: IntakeOutcome): { pass: boolean; mismatches: Mismatch[] } {
  const mismatches: Mismatch[] = [];
  if (expected.state !== actual.state) mismatches.push({ field: "state", expected: expected.state, actual: actual.state });
  if (expected.message !== actual.message) mismatches.push({ field: "message", expected: expected.message, actual: actual.message });
  if (expected.state === "refused" && actual.fields) mismatches.push({ field: "fields", expected: "unchanged", actual: actual.fields });
  for (const [field, value] of Object.entries(expected.fields ?? {})) {
    const got = actual.fields?.[field as keyof CardFields];
    if (got !== value) mismatches.push({ field, expected: value, actual: got });
  }
  return { pass: mismatches.length === 0, mismatches };
}

// Частка успіху (pass rate) — визначення з WS8: прогін на задачах із відомими відповідями (ключ) → бал.
export function passRate(results: { pass: boolean }[]): { passed: number; total: number; rate: number } {
  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, rate: results.length ? passed / results.length : 0 };
}
