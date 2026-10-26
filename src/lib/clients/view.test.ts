import { describe, expect, it } from "vitest";
import { clientContact, clientOptionLabel, clientTypeLabel, orNotProvided } from "./view";

describe("clientOptionLabel", () => {
  it("AC-CARD-02: під час утримання біля дитини client7 показано email опікуна", () => {
    expect(
      clientOptionLabel({ full_name: "Client Seven", email: null, guardian_email: "guardian7@example.test" }),
    ).toBe("Client Seven (guardian: guardian7@example.test)");
  });

  it("AC-CARD-01: біля дорослого client6 — його email", () => {
    expect(clientOptionLabel({ full_name: "Client Six", email: "client6@example.test", guardian_email: null })).toBe(
      "Client Six (client6@example.test)",
    );
  });
});

describe("картка клієнта", () => {
  it("AC-CARD-10: у картці дитини — дані опікуна, у старій картці — «Not provided»", () => {
    expect(
      clientContact({ email: null, guardian_name: "Guardian Seven", guardian_email: "guardian7@example.test" }),
    ).toBe("Guardian: Guardian Seven, guardian7@example.test");
    expect(clientContact({ email: "client6@example.test", guardian_name: null, guardian_email: null })).toBe(
      "client6@example.test",
    );
    expect(orNotProvided(null)).toBe("Not provided");
    expect(orNotProvided("1990-05-14")).toBe("1990-05-14");
    expect(clientTypeLabel("child")).toBe("Child");
    expect(clientTypeLabel("adult")).toBe("Adult");
  });
});
