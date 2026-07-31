import { describe, expect, it } from "vitest";
import {
  buildSystemNotificationContent,
  DISCREET_NOTIFICATION_BODY,
  DISCREET_NOTIFICATION_TITLE,
} from "../notificationPrivacy";

describe("system notification privacy", () => {
  it("hides health and identity details by default", () => {
    const content = buildSystemNotificationContent(
      "Period expected tomorrow for Amina",
      "Your counsellor replied about the symptoms you shared.",
    );

    expect(content).toEqual({
      title: DISCREET_NOTIFICATION_TITLE,
      body: DISCREET_NOTIFICATION_BODY,
    });
    expect(JSON.stringify(content)).not.toContain("Amina");
    expect(JSON.stringify(content)).not.toContain("Period");
    expect(JSON.stringify(content)).not.toContain("symptoms");
  });

  it("allows a preview only after an explicit preference", () => {
    expect(
      buildSystemNotificationContent("Check-in", "How are you feeling?", {
        allowSensitivePreview: true,
      }),
    ).toEqual({
      title: "Check-in",
      body: "How are you feeling?",
    });
  });

  it("does not emit blank preview content", () => {
    expect(
      buildSystemNotificationContent(" ", " ", {
        allowSensitivePreview: true,
      }),
    ).toEqual({
      title: DISCREET_NOTIFICATION_TITLE,
      body: DISCREET_NOTIFICATION_BODY,
    });
  });
});
