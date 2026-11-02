// npm run uat — UAT за AC на РОЗГОРНУТОМУ застосунку: запис → кадри «Тоді» → вердикт агента → звіт для PM.
//   npm run uat -- --url https://<ваш-прод>.vercel.app      (або змінна UAT_BASE_URL; без неї — локальна збірка)
//   npm run uat -- --url … --grep-invert '@writes'          (лише AC, що нічого не пишуть; решта аргументів → Playwright)
//   npm run uat:nc -- --url …                               (негативні контролі; звіт у test-results/uat-report-nc/)
// Кроки: playwright test → pack.mjs → review.mjs (claude -p) → combine.mjs → report.mjs.
// Звіт пишеться завжди, навіть якщо тести червоні: FAIL — теж результат для PM. Код виходу 1, якщо є FAIL, якщо впали
// setup чи прибирання, або якщо негативний контроль не довів, що UAT уміє падати (PASS, не запускався, впав не там).
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pack } from "./pack.mjs";
import { review } from "./review.mjs";
import { combine } from "./combine.mjs";
import { report } from "./report.mjs";
import { RESULTS, ROOT, WORK, readJson, rel } from "./lib.mjs";

const argv = process.argv.slice(2);
const take = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const [, value] = argv.splice(i, 2);
  return value;
};
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i >= 0) argv.splice(i, 1);
  return i >= 0;
};

const url = (take("--url") ?? process.env.UAT_BASE_URL)?.replace(/\/+$/, "");
const negativeControls = flag("--negative-controls");
const skipReview = flag("--skip-review");
const git = (...a) => {
  try {
    return execFileSync("git", a, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

async function deployedSha(base) {
  if (!base) return null;
  try {
    // Таймаут: /api/health, що не відповідає, не має зупинити звіт (catch нижче дасть null).
    const res = await fetch(`${base}/api/health`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    if (!res.headers.get("content-type")?.includes("json")) return null;
    return (await res.json()).sha ?? null;
  } catch {
    return null;
  }
}

const startedAt = new Date().toISOString();
const env = { ...process.env, UAT_NEGATIVE_CONTROLS: negativeControls ? "1" : "" };
if (url) env.UAT_BASE_URL = url;
else delete env.UAT_BASE_URL;

// Журнал і підсумок прибирання — лише цього прогону: інакше «видалено» у звіті підсумовує адреси з попередніх прогонів,
// а якщо прибирання впаде до запису uat-cleanup.json, звіт показав би успішне прибирання минулого прогону.
rmSync(path.join(ROOT, "test-results", "uat-cleanup.jsonl"), { force: true });
rmSync(path.join(ROOT, "test-results", "uat-cleanup.json"), { force: true });
console.log(`UAT: ${url ?? "локальна збірка (npm run build && npm run start)"}${negativeControls ? " — негативні контролі" : ""}`);
const cli = path.join(ROOT, "node_modules", "@playwright", "test", "cli.js");
// results.json попереднього прогону не має потрапити у звіт, якщо Playwright цього разу його не запише.
rmSync(RESULTS, { force: true });
const pw = spawnSync(
  process.execPath,
  [cli, "test", `--project=${negativeControls ? "negative-controls" : "chromium"}`, ...argv],
  { stdio: "inherit", env },
);
const playwrightMs = Date.now() - Date.parse(startedAt);

if (pw.error || !existsSync(RESULTS)) {
  console.error(
    `Playwright не створив ${rel(RESULTS)}${pw.error ? ` (${pw.error.message})` : ""}: звіту не буде — див. вивід Playwright вище.`,
  );
  process.exitCode = 1;
} else {
  await finish();
}

// Тести проєктів setup (вхід ролей) і cleanup (прибирання), що не пройшли: AC-рядків для них у звіті немає.
function infraFailures() {
  const failed = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests) {
        const status = t.results.at(-1)?.status ?? "skipped";
        if (["setup", "cleanup"].includes(t.projectName) && status !== "passed") failed.push(`${t.projectName}: ${spec.title} — ${status}`);
      }
    }
    (suite.suites ?? []).forEach(walk);
  };
  readJson(RESULTS).suites.forEach(walk);
  return failed;
}

// Звіт за результатами Playwright: пакети → рецензент → вердикт → report.md.
async function finish() {
  const cases = pack();
  mkdirSync(WORK, { recursive: true });
  writeFileSync(
    path.join(WORK, "run.json"),
    JSON.stringify(
      {
        baseURL: url ?? "http://localhost:3000",
        deployedSha: await deployedSha(url),
        gitSha: git("rev-parse", "HEAD"),
        gitBranch: git("rev-parse", "--abbrev-ref", "HEAD"),
        gitDirty: Boolean(git("status", "--porcelain")),
        startedAt,
        playwrightMs,
        playwrightExit: pw.status,
        negativeControls,
        // Setup і прибирання — за results.json, а не за кодом Playwright: у негативних контролях він червоний завжди.
        // У run.json, щоб `npm run uat:review` (report.mjs без Playwright) теж показав їх у звіті (issues.mjs).
        infraFailures: infraFailures(),
      },
      null,
      2,
    ),
  );
  // process.exitCode, а не process.exit(): на Windows exit() після fetch падає з assertion libuv.
  if (!cases.length) {
    console.error("Жодного AC-тесту в результатах Playwright — звіту не буде.");
    process.exitCode = 1;
    return;
  }
  if (!skipReview) await review();
  // Проблеми прогону (issues.mjs) рахує report() — вони в report.md і manifest.json, а не лише в консолі.
  const { outDir, rows, manifest } = report(combine());
  console.log(`\nЗвіт: ${rel(outDir)}/report.md`);
  for (const r of rows) console.log(`  ${r.caseId}: ${r.verdict} — ${r.ruleText}`);
  const real = rows.filter((r) => !r.negativeControl);
  if (real.some((r) => r.verdict === "FAIL")) process.exitCode = 1;
  if (manifest.runIssues.length) {
    console.error(`Прогін не чистий:\n  ${manifest.runIssues.join("\n  ")}`);
    process.exitCode = 1;
  }
  if (real.some((r) => r.verdict === "NEEDS-HUMAN")) console.log("Є NEEDS-HUMAN: рішення — за PM (див. звіт).");
}
