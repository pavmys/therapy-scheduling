// Проблеми прогону UAT: через них звіт є, але прогону не можна вірити (код виходу 1, пункт «Прогін не чистий» у звіті).
// Рахує report.mjs щоразу, зокрема й у `npm run uat:review` (без Playwright): факти Playwright (setup, прибирання,
// код виходу) беруться з run.json, а негативні контролі — із вердиктів поточного розбору, бо повторний розбір їх змінює.
// Логіки вердикту (R1–R6 у combine.mjs) тут немає: лише чи довів щось кожен негативний контроль.

// Що має показати кожен негативний контроль, щоб йому можна було вірити (див. tests/e2e/negative-controls.spec.ts):
//   перевірки впали → лише в «Тоді» (навмисно хибне очікування), а всі «Дано» і «Коли» виконано: інакше FAIL дав
//     збій переходу чи входу, а не хибна перевірка (NC-1);
//   перевірки пройшли → розбіжність знайшов рецензент: R3 (не погодився) чи R4 (його цитати немає на сторінці);
//     R2 (вердикту немає, зокрема --skip-review) нічого не доводить (NC-2).
function unprovenControl(c) {
  const a = c.assertions;
  if (c.verdict === "PASS") return `${a.caseId}: PASS — UAT не вміє падати, звіту довіряти не можна`;
  if (a.status === "passed") {
    return ["R3", "R4"].includes(c.rule) ? null : `${a.caseId}: ${c.verdict} за ${c.rule}, а не R3/R4 — розбіжність не знайшов рецензент`;
  }
  if (a.status !== "failed") return `${a.caseId}: тест не завершився (${a.status}): setup, таймаут чи обрив — див. вивід Playwright`;
  const brokenStep = a.steps.find((s) => /^(Дано|Коли):/.test(s.title) && !s.ok);
  if (brokenStep) return `${a.caseId}: впав крок «${brokenStep.title}», а не навмисно хибна перевірка «Тоді»`;
  if (!a.thens.some((t) => t.assertionsPassed === false)) return `${a.caseId}: жодна перевірка «Тоді» не впала — FAIL не від навмисно хибного очікування`;
  return null;
}

/** rows — combine(); run — run.json (infraFailures, playwrightExit, negativeControls). */
export function runIssues(rows, run = {}) {
  const infra = (run.infraFailures ?? []).map((f) => `не пройшов ${f}`);
  const real = rows.filter((r) => !r.negativeControl);
  const controls = rows.filter((r) => r.negativeControl);
  const proven = controls.filter((c) => !unprovenControl(c));
  // Прогін негативних контролів має показати ОБИДВА способи падіння: інакше, наприклад, `npm run uat:nc -- --grep NC-1`
  // дав би код 0 без жодного контролю рецензента. Не за ID (NC-1, NC-2), а за способом — нові контролі не ламають правило.
  const missing = run.negativeControls
    ? [
        !proven.some((c) => c.assertions.status === "failed") && "немає доведеного контролю, де впала перевірка «Тоді» (як NC-1) — фільтр --grep?",
        !proven.some((c) => c.assertions.status === "passed") && "немає доведеного контролю, де розбіжність знайшов рецензент (як NC-2) — фільтр --grep?",
      ].filter(Boolean)
    : [];
  const playwright =
    !infra.length && !run.negativeControls && "playwrightExit" in run && run.playwrightExit !== 0 && !real.some((r) => r.verdict === "FAIL")
      ? [`Playwright завершився з кодом ${run.playwrightExit}, хоч жоден AC не FAIL — див. вивід Playwright`]
      : [];
  return [...infra, ...controls.map(unprovenControl).filter(Boolean), ...missing, ...playwright];
}
