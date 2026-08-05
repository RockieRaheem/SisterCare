import { describe, expect, it, vi } from "vitest";
import { markCounsellorOfflineBeforeSignOut } from "../presenceClient";

describe("counsellor sign-out presence", () => {
  it("awaits an offline update before counsellor authentication is removed", async () => {
    const update = vi.fn().mockResolvedValue("offline");

    await expect(
      markCounsellorOfflineBeforeSignOut("counsellor", update),
    ).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith("offline");
  });

  it("does not send presence updates for other workspaces", async () => {
    const update = vi.fn();

    await expect(
      markCounsellorOfflineBeforeSignOut("admin", update),
    ).resolves.toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("reports a failed offline acknowledgement without blocking sign-out", async () => {
    const update = vi.fn().mockRejectedValue(new Error("Network unavailable"));

    await expect(
      markCounsellorOfflineBeforeSignOut("counsellor", update),
    ).resolves.toBe(false);
  });
});
