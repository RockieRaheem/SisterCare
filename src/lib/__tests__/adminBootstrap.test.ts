import { describe, expect, it } from "vitest";
import { resolveFirstAdminTarget } from "../adminBootstrap";

describe("first administrator bootstrap", () => {
  it("targets the authenticated account without relying on an email lookup", () => {
    expect(resolveFirstAdminTarget({
      authenticatedUid: "signed-in-user",
      requestedRole: "admin",
      administratorCount: 0,
      bootstrapSecretMatches: true,
    })).toBe("signed-in-user");
  });

  it("fails closed when any bootstrap condition is missing", () => {
    expect(resolveFirstAdminTarget({ authenticatedUid: null, requestedRole: "admin", administratorCount: 0, bootstrapSecretMatches: true })).toBeNull();
    expect(resolveFirstAdminTarget({ authenticatedUid: "user", requestedRole: "user", administratorCount: 0, bootstrapSecretMatches: true })).toBeNull();
    expect(resolveFirstAdminTarget({ authenticatedUid: "user", requestedRole: "admin", administratorCount: 1, bootstrapSecretMatches: true })).toBeNull();
    expect(resolveFirstAdminTarget({ authenticatedUid: "user", requestedRole: "admin", administratorCount: 0, bootstrapSecretMatches: false })).toBeNull();
  });
});
