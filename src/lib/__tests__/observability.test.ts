import { describe, expect, it } from "vitest";
import { sanitizeTelemetry } from "@/lib/observability";
import {
  assertIncidentTransition,
  canTransitionIncident,
} from "@/lib/incidents";

describe("privacy-safe telemetry", () => {
  it("redacts health content, contact details, and credentials", () => {
    expect(
      sanitizeTelemetry({
        message: "private health disclosure",
        email: "person@example.com",
        authorization: "Bearer secret",
        nested: { phoneNumber: "+256700000000" },
      }),
    ).toEqual({
      message: "[REDACTED]",
      email: "[REDACTED]",
      authorization: "[REDACTED]",
      nested: { phoneNumber: "[REDACTED]" },
    });
  });

  it("pseudonymizes identifiers without exposing the original", () => {
    const result = sanitizeTelemetry({
      userId: "real-user-id",
      sessionId: "real-session-id",
    }) as Record<string, string>;
    expect(result.userId).not.toContain("real-user-id");
    expect(result.sessionId).not.toContain("real-session-id");
    expect(result.userId).toHaveLength(16);
  });
});

describe("incident lifecycle", () => {
  it("requires acknowledgement before resolution", () => {
    expect(canTransitionIncident("open", "acknowledged")).toBe(true);
    expect(canTransitionIncident("acknowledged", "resolved")).toBe(true);
    expect(canTransitionIncident("open", "resolved")).toBe(false);
  });

  it("does not reopen resolved incidents", () => {
    expect(() => assertIncidentTransition("resolved", "open")).toThrow(
      "Invalid incident transition",
    );
  });
});

