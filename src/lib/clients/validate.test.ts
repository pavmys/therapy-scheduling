import { describe, expect, it } from "vitest";
import { INVALID_CLIENT_MESSAGE, normalizeEmail, validateClient } from "./validate";

describe("validateClient", () => {
  it("AC-HOLD-11: порожнє ім'я з коректним email відхиляється", () => {
    expect(validateClient("", "client3@example.test")).toEqual({
      ok: false,
      message: "Enter the client's name and a valid email.",
    });
    expect(validateClient("   ", "client3@example.test")).toEqual({
      ok: false,
      message: INVALID_CLIENT_MESSAGE,
    });
  });

  it("AC-HOLD-15: email без знака @ відхиляється", () => {
    expect(validateClient("Client Three", "client3example.test")).toEqual({
      ok: false,
      message: "Enter the client's name and a valid email.",
    });
  });

  it("AC-HOLD-35: email зберігається малими літерами без пробілів по краях", () => {
    expect(normalizeEmail(" Client3@Example.TEST ")).toBe("client3@example.test");
    expect(validateClient("Client Three", " Client3@Example.TEST ")).toEqual({
      ok: true,
      value: { fullName: "Client Three", email: "client3@example.test" },
    });
  });

  it("AC-HOLD-39: email без крапки після «@», з двома «@», з порожньою частиною до «@» чи з пробілом — відхиляється", () => {
    for (const email of ["client3@example", "client3@@example.test", "@example.test", "client 3@example.test"]) {
      expect(validateClient("Client Three", email)).toEqual({
        ok: false,
        message: "Enter the client's name and a valid email.",
      });
    }
    expect(validateClient("Client Three", "client3@example.test").ok).toBe(true);
  });

  it("AC-HOLD-41: ім'я лише з пробілів — порожнє, пробіли по краях прибираються", () => {
    expect(validateClient("   ", "client5@example.test")).toEqual({
      ok: false,
      message: "Enter the client's name and a valid email.",
    });
    expect(validateClient(" Client Four ", "client4@example.test")).toEqual({
      ok: true,
      value: { fullName: "Client Four", email: "client4@example.test" },
    });
  });

  it("довгий некоректний домен перевіряється за лінійний час (без ReDoS)", () => {
    const email = `a@${"a.".repeat(40_000)} `;
    const started = performance.now();
    expect(validateClient("Client Three", `${email}x y`).ok).toBe(false);
    expect(performance.now() - started).toBeLessThan(200);
  });

  it("ім'я лише з табуляцій чи переносів — порожнє", () => {
    expect(validateClient("\t\t", "client5@example.test").ok).toBe(false);
    expect(validateClient("\n Client Four\t", "client4@example.test")).toEqual({
      ok: true,
      value: { fullName: "Client Four", email: "client4@example.test" },
    });
  });

  it("відхиляє email з кількома @ або порожніми частинами", () => {
    for (const email of ["@", "a@", "@b", "a@b@c", "a b@c", "a@b"]) {
      expect(validateClient("Client Three", email).ok).toBe(false);
    }
  });
});
