import { describe, expect, it } from "vitest";
import { clientSearchFilter } from "./search";

describe("clientSearchFilter", () => {
  it("шукає за частиною імені або email", () => {
    expect(clientSearchFilter("  three ")).toBe("full_name.ilike.%three%,email.ilike.%three%");
  });

  it("порожній запит — без фільтра", () => {
    expect(clientSearchFilter("   ")).toBeNull();
  });

  it("прибирає символи синтаксису фільтра й шаблону", () => {
    expect(clientSearchFilter("a,b)(c%_*")).toBe("full_name.ilike.%a b c%,email.ilike.%a b c%");
  });
});
