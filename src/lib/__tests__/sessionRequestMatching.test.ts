import { describe, expect, it } from "vitest";
import { buildQueuedRequestDetails } from "../server/sessions";

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
});
