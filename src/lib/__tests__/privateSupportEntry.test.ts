import { describe, expect, it } from "vitest";
import { PRIVATE_SUPPORT_ACTIONS } from "@/components/features/PrivateSupportEntry";

describe("private support entry", () => {
  it("offers both private assistant and verified human paths", () => {
    expect(PRIVATE_SUPPORT_ACTIONS).toEqual([
      expect.objectContaining({
        href: "/chat",
        label: "Ask Sister privately",
        primary: true,
      }),
      expect.objectContaining({
        href: "/sessions",
        label: "Talk to a counsellor",
        primary: false,
      }),
    ]);
  });

  it("keeps the conversation path primary", () => {
    expect(
      PRIVATE_SUPPORT_ACTIONS.filter(({ primary }) => primary),
    ).toHaveLength(1);
    expect(
      PRIVATE_SUPPORT_ACTIONS.find(({ primary }) => primary)?.href,
    ).toBe("/chat");
  });
});
