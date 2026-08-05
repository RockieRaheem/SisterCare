import { describe, expect, it } from "vitest";
import {
  buildQueuedRequestDetails,
  reconcileDeclinedCounsellors,
} from "../server/sessions";

describe("queued preferred-counsellor requests", () => {
  it("retargets an existing waiting request to the selected counsellor", () => {
    expect(
      buildQueuedRequestDetails(
        {
          reason: "user_request",
          summary: "",
          preferredLanguage: "Luganda",
        },
        {
          preferredCounsellorId:
            "5e8b9a10-a61d-4cc0-bb84-08944b643499",
          preferredLanguage: "English",
          specialty: "Mental Health",
        },
      ),
    ).toEqual({
      reason: "user_request",
      summary: "",
      preferredCounsellorId:
        "5e8b9a10-a61d-4cc0-bb84-08944b643499",
      preferredLanguage: "English",
      specialty: "Mental Health",
    });
  });

  it("preserves existing queue context when no preference is supplied", () => {
    const current = {
      reason: "risk_detected",
      contextScope: "safety_minimum",
      preferredCounsellorId: "existing-counsellor",
    };

    expect(buildQueuedRequestDetails(current, {})).toEqual(current);
  });

  it("clears a stale decline notice when the member explicitly selects again", () => {
    expect(
      buildQueuedRequestDetails(
        {
          preferredCounsellorId: "counsellor-1",
          lastDeclinedAt: "2026-08-05T04:00:00.000Z",
          preferredCounsellorDeclined: true,
          declineCount: 1,
        },
        { preferredCounsellorId: "counsellor-1" },
      ),
    ).toEqual({
      preferredCounsellorId: "counsellor-1",
      declineCount: 1,
    });
  });

  it("removes only the explicitly reselected counsellor from exclusions", () => {
    expect(
      reconcileDeclinedCounsellors(
        ["counsellor-1", "counsellor-2"],
        "counsellor-1",
      ),
    ).toEqual(["counsellor-2"]);
    expect(
      reconcileDeclinedCounsellors(["counsellor-1"], undefined),
    ).toEqual(["counsellor-1"]);
  });
});
