import { describe, expect, it } from "vitest";
import { bindToolArgumentsToVerifiedUser } from "@/lib/agent/toolAuthorization";

describe("agent tool authorization", () => {
  it("overwrites a model-supplied user id with the verified caller", () => {
    expect(
      bindToolArgumentsToVerifiedUser(
        { userId: "attacker-selected-user", value: "safe" },
        "verified-user",
      ),
    ).toEqual({ userId: "verified-user", value: "safe" });
  });

  it("does not invent an identity for an unauthenticated context", () => {
    expect(bindToolArgumentsToVerifiedUser({ value: "read-only" })).toEqual({
      value: "read-only",
    });
  });
});
