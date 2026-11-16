import { describe, expect, it } from "vitest";
import {
  ALL_CONSENT_DOCUMENTS_SIGNED_MESSAGE,
  consentStateLabel,
  consentSummary,
  consentTitle,
  NO_CONSENT_DOCUMENTS_MESSAGE,
  sortConsentDocuments,
} from "./documents";

// Рядок підсумку й стан документа згоди (openspec/specs/consent-documents; design.md impl-consent-documents).
// Тексти — дослівно з AC PM.

describe("consentSummary", () => {
  it("AC-DOC-01: документів згоди ще немає — «No consent documents yet.»", () => {
    expect(consentSummary([])).toBe("No consent documents yet.");
    expect(NO_CONSENT_DOCUMENTS_MESSAGE).toBe("No consent documents yet.");
  });

  it("AC-DOC-02: два непідписані документи дорослого в будь-якому порядку з бази — «Missing signatures: …» у порядку набору", () => {
    const expected = "Missing signatures: Consent to treatment, Cancellation policy acknowledgement";
    expect(
      consentSummary([
        { kind: "consent_to_treatment", signed_at: null },
        { kind: "cancellation_policy", signed_at: null },
      ]),
    ).toBe(expected);
    // База порядку не гарантує: зворотний порядок дає той самий рядок.
    expect(
      consentSummary([
        { kind: "cancellation_policy", signed_at: null },
        { kind: "consent_to_treatment", signed_at: null },
      ]),
    ).toBe(expected);
  });

  it("AC-DOC-05: «Consent to treatment» підписано — «Missing signatures: Cancellation policy acknowledgement»", () => {
    expect(
      consentSummary([
        { kind: "cancellation_policy", signed_at: null },
        { kind: "consent_to_treatment", signed_at: "2026-11-04T18:15:00Z" },
      ]),
    ).toBe("Missing signatures: Cancellation policy acknowledgement");
  });

  it("AC-DOC-06: підписано всі документи — «All consent documents signed.»", () => {
    expect(
      consentSummary([
        { kind: "consent_to_treatment", signed_at: "2026-11-04T18:15:00Z" },
        { kind: "cancellation_policy", signed_at: "2026-11-04T18:30:00Z" },
      ]),
    ).toBe("All consent documents signed.");
    expect(ALL_CONSENT_DOCUMENTS_SIGNED_MESSAGE).toBe("All consent documents signed.");
  });
});

describe("sortConsentDocuments / consentTitle", () => {
  it("AC-DOC-03: набір дитини — у порядку Consent to treatment, Cancellation policy acknowledgement, Release of information", () => {
    const docs = [
      { id: "d3", kind: "release_of_information" },
      { id: "d2", kind: "cancellation_policy" },
      { id: "d1", kind: "consent_to_treatment" },
    ];
    expect(sortConsentDocuments(docs).map((d) => consentTitle(d.kind))).toEqual([
      "Consent to treatment",
      "Cancellation policy acknowledgement",
      "Release of information",
    ]);
    // Вхідний масив не змінено.
    expect(docs.map((d) => d.id)).toEqual(["d3", "d2", "d1"]);
  });
});

describe("consentStateLabel", () => {
  it("AC-DOC-05: підписано 2026-11-04 о 10:15 за часом практики (PST, UTC−8) — «Signed 2026-11-04 10:15»", () => {
    expect(consentStateLabel("2026-11-04T18:15:00Z")).toBe("Signed 2026-11-04 10:15");
  });

  it("AC-DOC-06: непідписаний документ — «Not signed»", () => {
    expect(consentStateLabel(null)).toBe("Not signed");
  });
});
