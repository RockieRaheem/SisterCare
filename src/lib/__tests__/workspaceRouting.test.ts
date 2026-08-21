import { describe, expect, it } from "vitest";
import {
  isOAuthWorkspaceReturn,
  resolveRegistrationIntent,
  resolveRoleBoundaryRedirect,
  resolveWorkspaceHome,
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
  it("returns every signed-in role to its own workspace", () => {
    expect(resolveWorkspaceHome({ role: "admin" })).toBe("/admin");
    expect(resolveWorkspaceHome({ role: "counsellor" })).toBe("/counsellor");
    expect(
      resolveWorkspaceHome({
        role: "member",
        registrationIntent: "counsellor",
      }),
    ).toBe("/counsellor");
    expect(
      resolveWorkspaceHome({ role: "member", onboardingCompleted: true }),
    ).toBe("/dashboard");
    expect(
      resolveWorkspaceHome({ role: "member", onboardingCompleted: false }),
    ).toBe("/onboarding");
  });

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

  it("does not let a counsellor login convert a member account", () => {
    expect(
      resolveRegistrationIntent({
        role: "member",
        requestedIntent: "counsellor",
      }),
    ).toBe("member");
  });

  it("repairs an accidentally changed unsubmitted account as member", () => {
    expect(
      resolveRegistrationIntent({
        role: "member",
        storedIntent: "counsellor",
        metadataIntent: "counsellor",
        requestedIntent: "member",
        hasCounsellorApplication: false,
      }),
    ).toBe("member");
  });

  it("never lets a login choice erase an existing KYC application", () => {
    expect(
      resolveRegistrationIntent({
        role: "member",
        storedIntent: "counsellor",
        requestedIntent: "member",
        hasCounsellorApplication: true,
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

describe("role-isolated product navigation", () => {
  it("keeps counsellors out of member AI and profile pages", () => {
    expect(
      resolveRoleBoundaryRedirect({
        pathname: "/chat",
        role: "counsellor",
        registrationIntent: "counsellor",
      }),
    ).toBe("/counsellor");
    expect(
      resolveRoleBoundaryRedirect({
        pathname: "/profile",
        role: "member",
        registrationIntent: "counsellor",
      }),
    ).toBe("/counsellor");
  });

  it("maps member library and help links to professional equivalents", () => {
    expect(
      resolveRoleBoundaryRedirect({
        pathname: "/library",
        role: "counsellor",
        registrationIntent: "counsellor",
      }),
    ).toBe("/counsellor/articles");
    expect(
      resolveRoleBoundaryRedirect({
        pathname: "/help",
        role: "member",
        registrationIntent: "counsellor",
      }),
    ).toBe("/counsellor/support");
  });

  it("keeps administrators in administration", () => {
    expect(
      resolveRoleBoundaryRedirect({
        pathname: "/counsellor",
        role: "admin",
      }),
    ).toBe("/admin");
    expect(
      resolveRoleBoundaryRedirect({ pathname: "/dashboard", role: "admin" }),
    ).toBe("/admin");
  });

  it("keeps members out of professional-only support and publishing", () => {
    expect(
      resolveRoleBoundaryRedirect({
        pathname: "/counsellor/support",
        role: "member",
        registrationIntent: "member",
        onboardingCompleted: true,
      }),
    ).toBe("/dashboard");
    expect(
      resolveRoleBoundaryRedirect({
        pathname: "/counsellor/articles",
        role: "member",
        registrationIntent: "member",
        onboardingCompleted: false,
      }),
    ).toBe("/onboarding");
  });

  it("does not redirect members away from their own workspace", () => {
    expect(
      resolveRoleBoundaryRedirect({
        pathname: "/library",
        role: "member",
        registrationIntent: "member",
      }),
    ).toBeNull();
  });
});
