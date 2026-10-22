import { describe, expect, it } from "vitest";
import { clientSearchFilter } from "./search";

describe("clientSearchFilter", () => {
  it("шукає за частиною імені або email", () => {
    expect(clientSearchFilter("  three ")).toBe('full_name.ilike."%three%",email.ilike."%three%"');
  });

  it("порожній запит — без фільтра", () => {
    expect(clientSearchFilter("   ")).toBeNull();
    expect(clientSearchFilter(" * ")).toBeNull();
  });

  it("шукає _ і % буквально, апостроф лишає", () => {
    expect(clientSearchFilter("john_doe")).toBe('full_name.ilike."%john\\\\_doe%",email.ilike."%john\\\\_doe%"');
    expect(clientSearchFilter("100%")).toBe('full_name.ilike."%100\\\\%%",email.ilike."%100\\\\%%"');
    expect(clientSearchFilter("O'Brien")).toBe(`full_name.ilike."%O'Brien%",email.ilike."%O'Brien%"`);
  });

  it("кома, дужки й лапки не ламають .or(…)", () => {
    expect(clientSearchFilter('a,b)(c"')).toBe('full_name.ilike."%a,b)(c\\"%",email.ilike."%a,b)(c\\"%"');
  });
});
