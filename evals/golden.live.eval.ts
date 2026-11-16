import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { proposeDraft } from "@/lib/ai/draft";
import { intakeOutcome } from "@/lib/ai/intake";
import { PRODUCT_MODELS, makeProductModel } from "@/lib/ai/models";
import { DRAFT_PROMPT_VERSION } from "@/lib/ai/prompts/draft";
import { IntakeDraftSchema } from "@/lib/ai/schema";
import { passRate, scoreOutcome, type GoldenCase } from "@/lib/ai/scorer";
import casesJson from "../tests/fixtures/golden/cases.json";

// `npm run eval` — ЖИВИЙ прогін 10 golden cases PM (HryhoriiHaponiukQuitCode/therapy-scheduling-spec#36) на
// безкоштовних моделях OpenRouter. Ніколи не в `npm test` і не в CI. За зразком
// materials/ai-feature/evals/golden.live.eval.ts (koldovsky/2026-quitcode-10-ai-features-hw); судді немає — PM
// фіксує точні поля й повідомлення, оцінка детермінована (scoreOutcome після правил коду intakeOutcome).
// Потрібен ключ у .env.local (OPENROUTER_API_KEY). Без ключа всі кейси пропускаються — це не помилка.
// Перший 429 зупиняє прогін: цей і решта кейсів — NOT RUN з причиною у звіті, у частку успіху не входять.
// Таймаут, помилка постачальника, відповідь не за схемою — FAIL з причиною (входять у частку успіху).
//   RUNS=2    — кілька прогонів поспіль для частки успіху.
//   RECORD=1  — успішні відповіді дописати в tests/fixtures/golden/recorded.json (для офлайн-реплею в CI).
// Поріг PM: ≥ 8/10, обов'язково GC-09 (відмова) і GC-10 (ін'єкція).

const cases = casesJson as GoldenCase[];
const key = process.env.OPENROUTER_API_KEY?.trim();
const RECORD = process.env.RECORD === "1";
const RUNS = Math.max(1, Number(process.env.RUNS ?? 1) || 1);
const RECORDED_PATH = "tests/fixtures/golden/recorded.json";
const REPORT_DIR = "evals/reports";
const MUST_PASS = ["GC-09", "GC-10"];

// Бюджет: на прогін — 10 викликів моделі з одного денного лічильника акаунта (50/день).
const NEEDED = RUNS * cases.length;
const GAP_MS = 3_000; // ≤ 20 запитів/хв

type Recording = { modelId: string; recordedAt: string; promptVersion: string; text: string };
type Row = { run: number; id: string; ac: string; modelId: string; pass: boolean; notRun?: boolean; why?: string };
const rows: Row[] = [];
const fresh: Record<string, Recording> = {};
let stoppedAt: string | undefined;

describe.skipIf(!key)("golden cases, живий прогін (безкоштовні моделі OpenRouter)", () => {
  beforeAll(async () => {
    // Скільки безкоштовних запитів лишилось сьогодні (UTC-доба; у листопаді скидається о 02:00 за Києвом).
    const res = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key}` } });
    const body = (await res.json()) as { data?: { free_model_daily_requests?: { remaining?: number } } };
    const remaining = body.data?.free_model_daily_requests?.remaining;
    if (typeof remaining === "number" && remaining < NEEDED) {
      throw new Error(`Сьогодні лишилось ${remaining} безкоштовних запитів, потрібно ${NEEDED}. Запустіть завтра або зменште RUNS.`);
    }
  });

  for (let run = 1; run <= RUNS; run++) {
    for (const c of cases) {
      it(`прогін ${run}: golden ${c.id}`, async (ctx) => {
        if (stoppedAt) {
          rows.push({ run, id: c.id, ac: c.ac, modelId: "—", pass: false, notRun: true, why: `NOT RUN: зупинено після 429 (${stoppedAt})` });
          return ctx.skip();
        }
        await sleep(GAP_MS);
        // Ті самі maxRetries і таймаут, що в застосунку (design.md D1): eval міряє те, що бачить людина.
        const result = await proposeDraft({ text: c.input, today: c.today }, makeProductModel(key));
        if (!result.ok && result.reason === "rate_limited") {
          stoppedAt = `${c.id}, прогін ${run}`;
          rows.push({ run, id: c.id, ac: c.ac, modelId: "—", pass: false, notRun: true, why: `NOT RUN: 429 — ${result.message}` });
          return ctx.skip();
        }
        const outcome = intakeOutcome(result, c.today);
        const score = scoreOutcome(c.expected, outcome);
        const why = result.ok
          ? score.mismatches.map((m) => `${m.field}: очікувано ${JSON.stringify(m.expected)}, отримано ${JSON.stringify(m.actual)}`).join("; ")
          : `${result.reason}: ${result.message}`;
        rows.push({ run, id: c.id, ac: c.ac, modelId: result.ok ? result.modelId : "—", pass: score.pass, why });
        // Записуємо ЛИШЕ успішні відповіді: офлайн-реплей у CI має лишатися зеленим.
        if (RECORD && result.ok && score.pass) {
          fresh[c.id] = {
            modelId: result.modelId,
            recordedAt: new Date().toISOString(),
            promptVersion: DRAFT_PROMPT_VERSION,
            text: JSON.stringify(IntakeDraftSchema.parse(result.draft)),
          };
        }
        expect(score.mismatches, why).toEqual([]);
      });
    }
  }

  afterAll(() => {
    console.table(rows);
    writeReport();
    if (RECORD && Object.keys(fresh).length > 0) {
      // Злиття, а не заміна: прогін, обірваний 429, зберігає старі записи решти кейсів.
      const old = JSON.parse(readFileSync(RECORDED_PATH, "utf8")) as Record<string, Recording>;
      writeFileSync(RECORDED_PATH, JSON.stringify({ ...old, ...fresh }, null, 2) + "\n");
    }
  });
});

// Звіт для домашки: частка успіху загалом і за моделлю, поріг PM і кожен кейс. Файл комітять (він без секретів).
function writeReport() {
  if (rows.length === 0) return;
  const ran = rows.filter((r) => !r.notRun);
  const notRun = rows.filter((r) => r.notRun);
  const total = passRate(ran);
  const byModel = new Map<string, Row[]>();
  for (const r of ran) byModel.set(r.modelId, [...(byModel.get(r.modelId) ?? []), r]);
  const mustPass = MUST_PASS.map((id) => `${id} ${ran.some((r) => r.id === id && r.pass) ? "✅" : "❌"}`).join(", ");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const lines = [
    `# Живий прогін golden cases — ${new Date().toISOString()}`,
    "",
    `- Функція: чернетка картки клієнта з тексту звернення (AC-INTAKE-01…09, HryhoriiHaponiukQuitCode/therapy-scheduling-spec#36)`,
    `- Промпт: \`${DRAFT_PROMPT_VERSION}\`; ланцюжок моделей: ${PRODUCT_MODELS.map((m) => `\`${m}\``).join(" → ")}; суддя: немає (точні поля)`,
    `- Прогонів: ${RUNS}; кейсів у прогоні: ${cases.length}`,
    `- **Частка успіху: ${total.passed}/${total.total} (${Math.round(total.rate * 100)}%)** — з кейсів, що отримали відповідь`,
    `- Поріг PM: ≥ 8/10 і обов'язково ${mustPass}`,
    `- Не запущено (NOT RUN): ${notRun.length}${stoppedAt ? ` — ліміт 429, зупинено на: ${stoppedAt}` : ""}`,
    "",
    "| Модель, що відповіла | Пройшло | Усього |",
    "|---|---|---|",
    ...[...byModel].map(([m, rs]) => `| \`${m}\` | ${passRate(rs).passed} | ${rs.length} |`),
    "",
    "| Прогін | Кейс | AC | Модель | Результат | Розбіжність / помилка |",
    "|---|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.run} | ${r.id} | ${r.ac} | \`${r.modelId}\` | ${r.notRun ? "NOT RUN" : r.pass ? "✅" : "❌"} | ${(r.why ?? "").replaceAll("|", "/")} |`,
    ),
    "",
    "## Розбір FAIL",
    "",
    "<!-- Кожен FAIL — одним рядком: модель / промпт / кейс / вимога; що виправлено або чому лишили. -->",
    "",
  ];
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(`${REPORT_DIR}/${stamp}.md`, lines.join("\n"));
  console.log(`Звіт: ${REPORT_DIR}/${stamp}.md`);
}
