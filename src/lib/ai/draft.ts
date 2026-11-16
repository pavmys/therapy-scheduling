import { APICallError, NoObjectGeneratedError, Output, RetryError, generateText, type LanguageModel } from "ai";
import { DRAFT_INSTRUCTIONS, wrapDocument } from "./prompts/draft";
import { IntakeDraftSchema, type IntakeDraft } from "./schema";

// Чиста функція: модель передають параметром. Застосунок передає модель OpenRouter (src/lib/ai/openrouter.ts),
// тести — MockLanguageModelV4 із записаною відповіддю. Тут немає `import "server-only"` і немає process.env,
// тому Vitest може імпортувати цей файл. За зразком materials/ai-feature/src/lib/ai/draft.ts
// (koldovsky/2026-quitcode-10-ai-features-hw); без файлів — PM: «лише вставлений текст».

export type DraftInput = { text: string; today: string };

export type DraftFailureReason = "invalid_output" | "rate_limited" | "timeout" | "provider_error" | "no_key";

export type DraftResult =
  | { ok: true; draft: IntakeDraft; modelId: string }
  | { ok: false; reason: DraftFailureReason; message: string };

export type DraftOptions = { maxRetries?: number; timeoutMs?: number };

/** design.md D1: на безкоштовному тарифі повтор витрачає той самий денний ліміт; PM не задав таймаут — 25 с. */
export const DEFAULT_MAX_RETRIES = 0;
export const DEFAULT_TIMEOUT_MS = 25_000;

export async function proposeDraft(input: DraftInput, model: LanguageModel, opts: DraftOptions = {}): Promise<DraftResult> {
  try {
    const result = await generateText({
      model,
      instructions: DRAFT_INSTRUCTIONS,
      messages: [{ role: "user", content: [{ type: "text", text: wrapDocument(input.text, input.today) }] }],
      output: Output.object({ name: "client_card_draft", schema: IntakeDraftSchema }),
      temperature: 0,
      maxRetries: opts.maxRetries ?? DEFAULT_MAX_RETRIES,
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    // result.output уже перевірено за IntakeDraftSchema (інакше — виняток NoObjectGeneratedError).
    return { ok: true, draft: result.output, modelId: result.response.modelId };
  } catch (error) {
    return classifyError(error);
  }
}

// 429 — і як HTTP 429, і як HTTP 200 з тілом помилки `code: 429` (OpenRouter передає ліміт постачальника так).
function isRateLimited(cause: unknown): boolean {
  if (!APICallError.isInstance(cause)) return false;
  const code = cause.statusCode === 200 ? (cause.data as { code?: unknown } | undefined)?.code : cause.statusCode;
  return String(code) === "429";
}

const isTimeout = (cause: unknown) => cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");

export function classifyError(error: unknown): Extract<DraftResult, { ok: false }> {
  // Після повторів AI SDK загортає останню помилку в RetryError — спершу розгортаємо.
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  if (NoObjectGeneratedError.isInstance(cause)) {
    return { ok: false, reason: "invalid_output", message: "model output did not match the schema" };
  }
  if (isRateLimited(cause)) return { ok: false, reason: "rate_limited", message: "free-model limit reached, try later" };
  if (isTimeout(cause)) return { ok: false, reason: "timeout", message: "model did not answer in time" };
  return { ok: false, reason: "provider_error", message: cause instanceof Error ? cause.message : String(cause) };
}
