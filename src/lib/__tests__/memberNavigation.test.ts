import { describe, expect, it } from "vitest";
import {
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
});
