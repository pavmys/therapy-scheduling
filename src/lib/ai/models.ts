import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Ланцюжок безкоштовних моделей OpenRouter (design.md impl-client-intake-draft, D1; ADR 0006). Взято з
// materials/ai-feature/src/lib/ai/models.ts (koldovsky/2026-quitcode-10-ai-features-hw), кандидати на 04.11.2026.
// Безкоштовні моделі з'являються й зникають: перед роботою — `npm run ai:models`, якість — живий `npm run eval`.
// Порядок = пріоритет. Лише ID із `:free`: платна модель у списку fallback оплачується за її ціною.
//   gemma-4-31b / gemma-4-26b — НЕ мають structured_outputs: json_schema може бути проігноровано, тому поля
//     повторено в промпті, а zod — ворота (invalid_output → AC-INTAKE-08).
//   nemotron-3.5-super-vl     — строга схема (structured_outputs).
// Судді немає: PM фіксує в golden cases точні поля й повідомлення, вільного тексту для оцінки немає.
export const PRODUCT_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3.5-super-vl:free",
] as const;

// Фабрика приймає ключ параметром і НЕ читає process.env: так її можна імпортувати в eval-скрипті.
// У коді застосунку модель бере лише src/lib/ai/openrouter.ts (server-only).
export function makeProductModel(apiKey: string | undefined) {
  const openrouter = createOpenRouter({ apiKey, appName: "Therapy scheduling intake draft" });
  return openrouter.chat(PRODUCT_MODELS[0], {
    // OpenRouter пробує наступну модель при помилці, ліміті постачальника або простої.
    // Платформний ліміт безкоштовних моделей (20/хв, 50/день на акаунт) ланцюжок НЕ обходить.
    models: [...PRODUCT_MODELS],
    // Портативний параметр `reasoning` з AI SDK 7 цей провайдер не передає — лише його власний.
    reasoning: { effort: "low", exclude: true },
  });
}
