import { describe, expect, it } from "vitest";
import { insuranceLine, parseInsuranceStatus } from "./insurance";

describe("insuranceLine", () => {
  it("AC-INS-01: статус ще не позначено — «Insurance: Not set»", () => {
    expect(insuranceLine("not_set")).toBe("Insurance: Not set");
  });

  it("AC-INS-02: позначено «Verified» — «Insurance: Verified»", () => {
    expect(insuranceLine("verified")).toBe("Insurance: Verified");
  });

  it("AC-INS-03: змінено на «Private pay» — «Insurance: Private pay»", () => {
    expect(insuranceLine("private_pay")).toBe("Insurance: Private pay");
  });

  it("«Not accepted» — «Insurance: Not accepted»", () => {
    expect(insuranceLine("not_accepted")).toBe("Insurance: Not accepted");
  });
});

describe("parseInsuranceStatus", () => {
  it("приймає лише три значення, які можна позначити", () => {
    expect(parseInsuranceStatus("verified")).toBe("verified");
    expect(parseInsuranceStatus("not_accepted")).toBe("not_accepted");
    expect(parseInsuranceStatus("private_pay")).toBe("private_pay");
  });

  it("«Not set» — лише початковий: повернути його не можна", () => {
    expect(parseInsuranceStatus("not_set")).toBeNull();
  });

  it("порожнє, інше й не рядок — null", () => {
    for (const value of ["", "Verified", "private pay", "unknown", null, undefined, 1]) {
      expect(parseInsuranceStatus(value)).toBeNull();
    }
  });
});
