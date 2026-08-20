import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  isMemberNavigationHiddenPath,
  isMemberPrimaryDestination,
  MEMBER_PRIMARY_NAVIGATION,
} from "../memberNavigation";

describe("member primary navigation", () => {
  it("contains the five product destinations in their intended order", () => {
    expect(MEMBER_PRIMARY_NAVIGATION.map(({ labelKey }) => labelKey)).toEqual([
      "home",
      "chat",
      "counsellors",
      "analytics",
      "profile",
    ]);
  });

  it("keeps the knowledge route outside primary navigation", () => {
    const destinations = MEMBER_PRIMARY_NAVIGATION.map(({ href }) => href);

    expect(destinations).toContain("/counsellors");
    expect(destinations).not.toContain("/library");
  });

  it("recognizes primary destinations and their nested routes", () => {
    expect(isMemberPrimaryDestination("/dashboard")).toBe(true);
    expect(isMemberPrimaryDestination("/chat/history")).toBe(true);
    expect(isMemberPrimaryDestination("/analytics")).toBe(true);
    expect(isMemberPrimaryDestination("/profile")).toBe(true);
    expect(isMemberPrimaryDestination("/library")).toBe(false);
  });

  it("keeps chat in phone navigation while excluding non-member workspaces", () => {
    expect(isMemberNavigationHiddenPath("/chat")).toBe(false);
    expect(isMemberNavigationHiddenPath("/dashboard")).toBe(false);
    expect(isMemberNavigationHiddenPath("/auth/login")).toBe(true);
    expect(isMemberNavigationHiddenPath("/admin")).toBe(true);
    expect(isMemberNavigationHiddenPath("/counsellor/profile")).toBe(true);
  });

  it("drives both desktop and phone navigation from the same source", () => {
    const header = readFileSync(
      path.join(process.cwd(), "src", "components", "layout", "Header.tsx"),
      "utf8",
    );
    const bottomNavigation = readFileSync(
      path.join(process.cwd(), "src", "components", "layout", "BottomNav.tsx"),
      "utf8",
    );

    expect(header).toContain("MEMBER_PRIMARY_NAVIGATION.map");
    expect(bottomNavigation).toContain("MEMBER_PRIMARY_NAVIGATION.map");
    expect(header).not.toContain("const navLinks");
  });
});
