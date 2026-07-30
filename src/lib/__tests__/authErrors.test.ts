import { describe, expect, it } from "vitest";
import { getLoginErrorMessage } from "../authErrors";

describe("login error guidance", () => {
  it("does not disclose whether an account exists", () => {
    expect(getLoginErrorMessage("auth/user-not-found")).toBe(
      getLoginErrorMessage("auth/wrong-password"),
    );
    expect(getLoginErrorMessage("invalid_credentials")).toContain(
      "reset the password",
    );
  });

  it("explains safe, conclusive provider states", () => {
    expect(getLoginErrorMessage("email_not_confirmed")).toContain(
      "has not been confirmed",
    );
    expect(getLoginErrorMessage("over_request_rate_limit")).toContain(
      "Wait a few minutes",
    );
  });
});
