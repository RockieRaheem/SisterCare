import { describe, expect, it } from "vitest";
import { isWorkspaceResolutionRetryable } from "../workspaceClient";

describe("post-authentication workspace provisioning", () => {
  it("retries transient session, profile and service states", () => {
    for (const status of [401, 409, 429, 502, 503, 504]) {
      expect(isWorkspaceResolutionRetryable(status)).toBe(true);
    }
  });

  it("does not retry permanent input and authorization failures", () => {
    for (const status of [400, 403, 404, 422]) {
      expect(isWorkspaceResolutionRetryable(status)).toBe(false);
    }
  });
});
