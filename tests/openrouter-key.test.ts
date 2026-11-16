import { afterEach, describe, expect, it, vi } from "vitest";

// Лише в цьому файлі: "server-only" поза Server Component кидає виняток (це перевіряє tests/ai-key.test.ts).
vi.mock("server-only", () => ({}));

const { productModel } = await import("@/lib/ai/openrouter");

describe("productModel без ключа", () => {
  const saved = process.env.OPENROUTER_API_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = saved;
  });

  it("AC-INTAKE-08: ключа немає → null (помічник недоступний, ручна форма працює)", () => {
    delete process.env.OPENROUTER_API_KEY;
    expect(productModel()).toBeNull();
  });

  it("AC-INTAKE-08: ключ із самих пробілів → null", () => {
    process.env.OPENROUTER_API_KEY = "   ";
    expect(productModel()).toBeNull();
  });

  it("AC-INTAKE-08: синтетичний ключ є → модель створено (без мережі)", () => {
    process.env.OPENROUTER_API_KEY = "test-not-a-real-key";
    expect(productModel()).not.toBeNull();
  });
});
