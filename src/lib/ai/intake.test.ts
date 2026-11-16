import { describe, expect, it } from "vitest";
import type { DraftResult } from "./draft";
import { intakeOutcome, normalizeDraft } from "./intake";
import type { IntakeDraft } from "./schema";

// Правила полів з «Припущення» вимоги PM #36 (requirements/36-…), які застосовує код поверх відповіді моделі.
// Очікування — з тексту PM, а не з реалізації.

const TODAY = "2026-11-13";
const READY = "Draft ready. Check the fields and create the card.";
const REFUSED = "This text can't be used to draft a client card. Paste the client's request or fill in the form manually.";

const empty: IntakeDraft = {
  status: "ok",
  clientType: null,
  fullName: null,
  dateOfBirth: null,
  sessionLanguage: null,
  email: null,
  guardianName: null,
  guardianEmail: null,
};

const adult = (over: Partial<IntakeDraft> = {}): IntakeDraft => ({
  ...empty,
  clientType: "adult",
  fullName: "Client Ten",
  dateOfBirth: "1990-05-14",
  sessionLanguage: "English",
  email: "client10@example.test",
  ...over,
});

const child = (over: Partial<IntakeDraft> = {}): IntakeDraft => ({
  ...empty,
  clientType: "child",
  fullName: "Client Eleven",
  dateOfBirth: "2016-09-03",
  sessionLanguage: "Spanish",
  guardianName: "Guardian Eleven",
  guardianEmail: "guardian11@example.test",
  ...over,
});

const ok = (draft: IntakeDraft): DraftResult => ({ ok: true, draft, modelId: "test" });

describe("normalizeDraft і intakeOutcome — правила PM", () => {
  it("AC-INTAKE-01: дорослий з усіма полями → Draft ready і поля AC-INTAKE-01", () => {
    const outcome = intakeOutcome(ok(adult()), TODAY);
    expect(outcome.state).toBe("ready");
    expect(outcome.message).toBe(READY);
    expect(outcome.fields).toEqual({
      clientType: "adult",
      fullName: "Client Ten",
      dateOfBirth: "1990-05-14",
      sessionLanguage: "English",
      email: "client10@example.test",
      guardianName: "",
      guardianEmail: "",
    });
  });

  it("AC-INTAKE-02: дитина з полями опікуна → Draft ready і поля AC-INTAKE-02", () => {
    const outcome = intakeOutcome(ok(child()), TODAY);
    expect(outcome.state).toBe("ready");
    expect(outcome.message).toBe(READY);
    expect(outcome.fields).toEqual({
      clientType: "child",
      fullName: "Client Eleven",
      dateOfBirth: "2016-09-03",
      sessionLanguage: "Spanish",
      email: "",
      guardianName: "Guardian Eleven",
      guardianEmail: "guardian11@example.test",
    });
  });

  it("AC-INTAKE-01: рівно 18 років сьогодні → Adult", () => {
    const { fields } = normalizeDraft(adult({ dateOfBirth: "2008-11-13" }), TODAY);
    expect(fields.clientType).toBe("adult");
    expect(fields.email).toBe("client10@example.test");
  });

  it("AC-INTAKE-02: 18 років завтра (17 сьогодні) → Child, навіть якщо модель сказала adult; email клієнта не стає email опікуна", () => {
    const outcome = intakeOutcome(ok(adult({ dateOfBirth: "2008-11-14" })), TODAY);
    expect(outcome.fields?.clientType).toBe("child");
    expect(outcome.fields?.email).toBe("");
    expect(outcome.fields?.guardianEmail).toBe("");
    expect(outcome.message).toBe("Draft is incomplete. Missing: Guardian name, Guardian email. Fill them in manually.");
  });

  it("AC-INTAKE-02: модель сказала child (дорослий пише про дитину) → Child без огляду на вік", () => {
    const { fields } = normalizeDraft(child({ dateOfBirth: null }), TODAY);
    expect(fields.clientType).toBe("child");
  });

  it("AC-INTAKE-01: email — trim і нижній регістр", () => {
    expect(normalizeDraft(adult({ email: "  Ellis.Reed@Example.TEST " }), TODAY).fields.email).toBe("ellis.reed@example.test");
    expect(normalizeDraft(child({ guardianEmail: " Guardian11@EXAMPLE.test" }), TODAY).fields.guardianEmail).toBe(
      "guardian11@example.test",
    );
  });

  it("AC-INTAKE-04: email без @ → поле порожнє й у Missing", () => {
    const outcome = intakeOutcome(ok(adult({ email: "morgan.bell.example.test" })), TODAY);
    expect(outcome.fields?.email).toBe("");
    expect(outcome.message).toBe("Draft is incomplete. Missing: Email. Fill them in manually.");
  });

  it("AC-INTAKE-01: дорослий — поля опікуна порожні, навіть якщо модель їх повернула", () => {
    const { fields } = normalizeDraft(adult({ guardianName: "Someone", guardianEmail: "someone@example.test" }), TODAY);
    expect(fields.guardianName).toBe("");
    expect(fields.guardianEmail).toBe("");
  });

  it("AC-INTAKE-02: дитина — поле Email порожнє, навіть якщо модель його повернула", () => {
    const { fields } = normalizeDraft(child({ email: "kid@example.test" }), TODAY);
    expect(fields.email).toBe("");
    expect(fields.guardianEmail).toBe("guardian11@example.test");
  });

  it("AC-INTAKE-01: неіснуюча дата (2026-02-30) чи не РРРР-ММ-ДД → Date of birth порожнє", () => {
    expect(normalizeDraft(adult({ dateOfBirth: "2026-02-30" }), TODAY).fields.dateOfBirth).toBe("");
    expect(normalizeDraft(adult({ dateOfBirth: "1990-13-01" }), TODAY).fields.dateOfBirth).toBe("");
    expect(normalizeDraft(adult({ dateOfBirth: "05/14/1990" }), TODAY).fields.dateOfBirth).toBe("");
    expect(normalizeDraft(adult({ dateOfBirth: "1991" }), TODAY).fields.dateOfBirth).toBe("");
  });

  it("AC-INTAKE-01: мова сеансів — лише English або Spanish", () => {
    const french = normalizeDraft(adult({ sessionLanguage: "French" as IntakeDraft["sessionLanguage"] }), TODAY);
    expect(french.fields.sessionLanguage).toBe("");
    expect(normalizeDraft(adult({ sessionLanguage: "Spanish" }), TODAY).fields.sessionLanguage).toBe("Spanish");
  });

  it("AC-INTAKE-05: дата народження пізніша за сьогодні → порожня й у Missing", () => {
    const outcome = intakeOutcome(
      ok(adult({ fullName: "Client Fourteen", dateOfBirth: "2027-01-05", email: "client14@example.test" })),
      TODAY,
    );
    expect(outcome.state).toBe("incomplete");
    expect(outcome.fields?.dateOfBirth).toBe("");
    expect(outcome.fields?.clientType).toBe("adult");
    expect(outcome.missing).toEqual(["Date of birth"]);
    expect(outcome.message).toBe("Draft is incomplete. Missing: Date of birth. Fill them in manually.");
  });

  it("AC-INTAKE-05: дата завтра порожня, дата сьогодні лишається", () => {
    expect(normalizeDraft(child({ dateOfBirth: "2026-11-14" }), TODAY).fields.dateOfBirth).toBe("");
    expect(normalizeDraft(child({ dateOfBirth: "2026-11-13" }), TODAY).fields.dateOfBirth).toBe("2026-11-13");
  });

  it("AC-INTAKE-04: Missing у порядку форми й дослівний текст PM", () => {
    const outcome = intakeOutcome(
      ok(adult({ fullName: "Client Twelve", dateOfBirth: null, sessionLanguage: null, email: "client12@example.test" })),
      TODAY,
    );
    expect(outcome.state).toBe("incomplete");
    expect(outcome.fields).toMatchObject({ clientType: "adult", fullName: "Client Twelve", email: "client12@example.test" });
    expect(outcome.missing).toEqual(["Date of birth", "Session language"]);
    expect(outcome.message).toBe("Draft is incomplete. Missing: Date of birth, Session language. Fill them in manually.");
  });

  it("AC-INTAKE-04: усе порожнє в дорослого → Name, Date of birth, Session language, Email", () => {
    const outcome = intakeOutcome(ok({ ...empty, clientType: "adult" }), TODAY);
    expect(outcome.message).toBe("Draft is incomplete. Missing: Name, Date of birth, Session language, Email. Fill them in manually.");
  });

  it("AC-INTAKE-04: усе порожнє в дитини → … Guardian name, Guardian email", () => {
    const outcome = intakeOutcome(ok({ ...empty, clientType: "child" }), TODAY);
    expect(outcome.missing).toEqual(["Name", "Date of birth", "Session language", "Guardian name", "Guardian email"]);
  });

  it("AC-INTAKE-04: імена з пробілів вважаються порожніми", () => {
    const outcome = intakeOutcome(ok(child({ fullName: "   ", guardianName: " " })), TODAY);
    expect(outcome.missing).toEqual(["Name", "Guardian name"]);
  });

  it("AC-INTAKE-06: відповідь refused → повідомлення PM, полів немає (форма не змінюється)", () => {
    const outcome = intakeOutcome(ok({ ...empty, status: "refused" }), TODAY);
    expect(outcome).toEqual({ state: "refused", message: REFUSED });
  });

  it("AC-INTAKE-08: збій моделі → повідомлення PM, полів немає", () => {
    const outcome = intakeOutcome({ ok: false, reason: "timeout", message: "x" }, TODAY);
    expect(outcome).toEqual({ state: "unavailable", message: "The assistant is unavailable right now. Fill in the form manually." });
  });
});
