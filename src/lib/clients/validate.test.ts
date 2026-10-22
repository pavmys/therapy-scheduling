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

  it("відхиляє email з кількома @ або порожніми частинами", () => {
    for (const email of ["@", "a@", "@b", "a@b@c", "a b@c"]) {
      expect(validateClient("Client Three", email).ok).toBe(false);
    }
  });
});
