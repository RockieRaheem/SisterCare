import { describe, expect, it } from "vitest";
import { isPilotPaused, shouldPauseApiPath, shouldPauseWorkspacePath } from "../pilotAccess";

describe("pilot emergency pause", () => {
  it("requires an explicit true value", () => {
    expect(isPilotPaused({ PILOT_PAUSED: "true" })).toBe(true);
    expect(isPilotPaused({ PILOT_PAUSED: "TRUE" })).toBe(true);
    expect(isPilotPaused({ PILOT_PAUSED: "false" })).toBe(false);
    expect(isPilotPaused({})).toBe(false);
  });

  it("pauses private workspaces but leaves public and admin recovery open", () => {
    expect(shouldPauseWorkspacePath("/chat")).toBe(true);
    expect(shouldPauseWorkspacePath("/sessions/session-1")).toBe(true);
    expect(shouldPauseWorkspacePath("/privacy")).toBe(false);
    expect(shouldPauseWorkspacePath("/admin")).toBe(false);
  });

  it("blocks care APIs while preserving health, admin and maintenance routes", () => {
    expect(shouldPauseApiPath("/api/chat")).toBe(true);
    expect(shouldPauseApiPath("/api/sessions/session-1/messages")).toBe(true);
    expect(shouldPauseApiPath("/api/health")).toBe(false);
    expect(shouldPauseApiPath("/api/admin/incidents")).toBe(false);
    expect(shouldPauseApiPath("/api/sessions/sweep")).toBe(false);
  });
});
