import { defineConfig } from "vitest/config";

// `npm run eval` — живий прогін golden cases на безкоштовних моделях. Ніколи не частина `npm test` / CI:
// основний vitest.config.mts бере лише *.test.ts(x), а цей — лише evals/**/*.eval.ts.
// За зразком materials/ai-feature/vitest.eval.config.mts; .env.local читає Node 24 (process.loadEnvFile), а не
// `loadEnv` з vite — vite не наша пряма залежність.
try {
  process.loadEnvFile(".env.local"); // .env.local → process.env лише для цього прогону; файлу немає — ключа немає
} catch {
  // без .env.local eval пропускає всі кейси (describe.skipIf) — це не помилка
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    fileParallelism: false, // по одному запиту: безкоштовний тариф — 20 запитів/хв
    testTimeout: 120_000,
    hookTimeout: 30_000,
    expect: { requireAssertions: true },
  },
});
