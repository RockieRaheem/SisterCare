import { describe, expect, it } from "vitest";
import {
  isOAuthWorkspaceReturn,
  resolveRegistrationIntent,
  resolveWorkspaceRoute,
} from "../workspaceRouting";

describe("login callback routing", () => {
  it("does not auto-route an ordinary login-page visit", () => {
    expect(isOAuthWorkspaceReturn("")).toBe(false);
    expect(isOAuthWorkspaceReturn("?redirect=%2Fdashboard")).toBe(false);
  });

  it("auto-routes only an explicit OAuth return", () => {
    expect(isOAuthWorkspaceReturn("?oauth=1")).toBe(true);
    expect(isOAuthWorkspaceReturn("?oauth=0")).toBe(false);
  });
});

describe("workspace routing", () => {
  it("always routes administrators to administration", () => {
    expect(
      resolveWorkspaceRoute({
        role: "admin",
        registrationIntent: "counsellor",
      }),
    ).toBe("/admin");
  });

  it("always routes verified counsellors to their portal", () => {
    expect(
      resolveWorkspaceRoute({
        role: "counsellor",
        registrationIntent: "member",
      }),
    ).toBe("/counsellor");
  });

  it("routes submitted applicants to their application status portal", () => {
    expect(
      resolveWorkspaceRoute({
        role: "member",
        registrationIntent: "counsellor",
        applicationStatus: "pending",
      }),
    ).toBe("/counsellor");
  });

  it("routes new counsellor applicants to KYC", () => {
    expect(
      resolveWorkspaceRoute({
        role: "member",
        registrationIntent: "counsellor",
        applicationStatus: null,
      }),
    ).toBe("/counsellor/apply");
  });

  it("routes members according to onboarding state", () => {
    expect(
      resolveWorkspaceRoute({ role: "member", onboardingCompleted: false }),
    ).toBe("/onboarding");
    expect(
      resolveWorkspaceRoute({ role: "member", onboardingCompleted: true }),
    ).toBe("/dashboard");
  });
});

describe("registration intent integrity", () => {
  it("preserves signup metadata and submitted applications", () => {
    expect(
      resolveRegistrationIntent({
        role: "member",
        metadataIntent: "counsellor",
      }),
    ).toBe("counsellor");
    expect(
      resolveRegistrationIntent({
        role: "member",
        hasCounsellorApplication: true,
      }),
    ).toBe("counsellor");
  });

  it("lets a member begin KYC without granting a privileged role", () => {
    expect(
      resolveRegistrationIntent({
        role: "member",
        requestedIntent: "counsellor",
      }),
    ).toBe("counsellor");
  });

  it("does not let a login selection alter an administrator identity", () => {
    expect(
      resolveRegistrationIntent({
        role: "admin",
        storedIntent: "member",
        requestedIntent: "counsellor",
      }),
    ).toBe("member");
  });
});
