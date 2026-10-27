import { describe, expect, it } from "vitest";
import {
  firstCardError,
  INVALID_CLIENT_MESSAGE,
  INVALID_DATE_OF_BIRTH_MESSAGE,
  normalizeEmail,
  validateCard,
  validateClient,
} from "./validate";

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

describe("validateCard", () => {
  const child = {
    clientType: "child",
    fullName: "Client Eight",
    dateOfBirth: "2016-01-10",
    sessionLanguage: "English",
    email: "",
    guardianName: "Guardian Eight",
    guardianEmail: "guardian8@example.test",
  };

  it("AC-CARD-03: картка дитини без імені чи коректного email опікуна відхиляється текстом PM", () => {
    for (const guardian of [
      { guardianName: "", guardianEmail: "guardian8@example.test" },
      { guardianName: "Guardian Eight", guardianEmail: "" },
      { guardianName: "   ", guardianEmail: "guardian8@example.test" },
      { guardianName: "Guardian Eight", guardianEmail: "guardian8example.test" },
    ]) {
      expect(validateCard({ ...child, ...guardian }, "2026-11-03")).toEqual({
        ok: false,
        errors: { guardian: "Enter the guardian's name and a valid email." },
      });
    }
    expect(validateCard(child, "2026-11-03")).toEqual({
      ok: true,
      value: {
        client_type: "child",
        full_name: "Client Eight",
        date_of_birth: "2016-01-10",
        session_language: "English",
        email: null,
        guardian_name: "Guardian Eight",
        guardian_email: "guardian8@example.test",
      },
    });
  });

  it("дата народження сьогодні — можна, завтра — ні (дата практики з виклику)", () => {
    expect(validateCard({ ...child, dateOfBirth: "2026-11-03" }, "2026-11-03").ok).toBe(true);
    expect(validateCard({ ...child, dateOfBirth: "2026-11-04" }, "2026-11-03")).toEqual({
      ok: false,
      errors: { dateOfBirth: INVALID_DATE_OF_BIRTH_MESSAGE },
    });
    for (const dateOfBirth of ["", "2026-02-30", "03.11.2016"]) {
      expect(validateCard({ ...child, dateOfBirth }, "2026-11-03")).toEqual({
        ok: false,
        errors: { dateOfBirth: INVALID_DATE_OF_BIRTH_MESSAGE },
      });
    }
  });

  it("AC-CARD-12: порожнє ім'я, дата в майбутньому й без мови — три помилки одразу, кожна свого поля", () => {
    const result = validateCard({ ...child, fullName: "", dateOfBirth: "2026-11-04", sessionLanguage: "" }, "2026-11-03");
    expect(result).toEqual({
      ok: false,
      errors: {
        fullName: "Enter the client's name.",
        dateOfBirth: "Enter a date of birth that is not in the future.",
        sessionLanguage: "Select a session language.",
      },
    });
    expect(firstCardError(result.ok ? {} : result.errors)).toBe("Enter the client's name.");
  });

  it("AC-CARD-12: без типу клієнта — «Select a client type.»; невідома мова — «Select a session language.»", () => {
    expect(validateCard({ ...child, clientType: "" }, "2026-11-03")).toEqual({
      ok: false,
      errors: { clientType: "Select a client type." },
    });
    expect(validateCard({ ...child, clientType: "couple" }, "2026-11-03").ok).toBe(false);
    expect(validateCard({ ...child, sessionLanguage: "French" }, "2026-11-03")).toEqual({
      ok: false,
      errors: { sessionLanguage: "Select a session language." },
    });
  });

  it("дорослий без імені — помилка зрізу 1 біля імені й email, разом з іншими полями", () => {
    const adult = { ...child, clientType: "adult", fullName: "", email: "client6@example.test", sessionLanguage: "" };
    expect(validateCard(adult, "2026-11-03")).toEqual({
      ok: false,
      errors: { client: INVALID_CLIENT_MESSAGE, sessionLanguage: "Select a session language." },
    });
  });
});
