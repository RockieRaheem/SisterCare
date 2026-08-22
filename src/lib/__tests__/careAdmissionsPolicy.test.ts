import { describe, expect, it } from "vitest";
import { canOpenNewCareRequest } from "../careAdmissionsPolicy";

describe("safe care admission policy", () => {
  it("stops new routine promises without safety coverage", () => {
    expect(canOpenNewCareRequest({ priority: "normal", pilotPaused: false, safetyCoverageReady: false })).toBe(false);
  });

  it("preserves critical records and existing follow-up obligations", () => {
    expect(canOpenNewCareRequest({ priority: "critical", pilotPaused: true, safetyCoverageReady: false })).toBe(true);
    expect(canOpenNewCareRequest({ priority: "normal", continuity: true, pilotPaused: true, safetyCoverageReady: false })).toBe(true);
  });
});
