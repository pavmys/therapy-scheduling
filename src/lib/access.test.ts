import { describe, expect, it } from "vitest";
import { accessFor, NO_ROLE_MESSAGE } from "./access";

describe("accessFor", () => {
  it("AC-CARD-07: відвідувач без входу — лише сторінка входу", () => {
    expect(accessFor(null)).toBe("login");
  });

  it("AC-CARD-11: користувач без ролі — лише повідомлення PM, не сторінки ролей", () => {
    expect(accessFor({ role: null })).toBe("no-role");
    expect(NO_ROLE_MESSAGE).toBe("Your account has no access yet. Contact an administrator.");
    expect(accessFor({ role: "scheduler" })).toBe("staff");
    expect(accessFor({ role: "admin" })).toBe("staff");
    expect(accessFor({ role: "therapist" })).toBe("therapist");
  });
});
