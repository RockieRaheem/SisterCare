import { describe, expect, it } from "vitest";
import {
  isLegacyCancellationConstraintError,
  normalizeStoredSessionState,
} from "../server/sessions";

describe("member session cancellation compatibility", () => {
  it("recognizes a database missing the cancelled session state", () => {
    expect(
      isLegacyCancellationConstraintError({
        code: "23514",
        message:
          'new row violates check constraint "counselling_sessions_state_check"',
      }),
    ).toBe(true);
  });

  it("does not hide unrelated database constraint failures", () => {
    expect(
      isLegacyCancellationConstraintError({
        code: "23514",
        message: 'new row violates check constraint "another_check"',
      }),
    ).toBe(false);
  });

  it("presents the legacy expired fallback as a cancelled session", () => {
    expect(
      normalizeStoredSessionState("expired", {
        terminationReason: "member_cancelled",
      }),
    ).toBe("cancelled");
    expect(normalizeStoredSessionState("expired", {})).toBe("expired");
  });
});
