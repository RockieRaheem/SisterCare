import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("../supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

import { emitEvent } from "../server/events";
import {
  openCrisisIncident,
  transitionIncident,
} from "../server/incidents";

describe("server incident and audit persistence", () => {
  beforeEach(() => {
    mocks.from.mockReset();
  });

  it("opens one deterministic critical incident per breached session", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert });

    await openCrisisIncident({
      sessionId: "5e8b9a10-a61d-4cc0-bb84-08944b643499",
      waitingSeconds: 601.7,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "crisis-5e8b9a10-a61d-4cc0-bb84-08944b643499",
        severity: "critical",
        status: "open",
        waiting_seconds_at_open: 602,
      }),
      { onConflict: "id", ignoreDuplicates: true },
    );
  });

  it("uses an optimistic status check to prevent conflicting reviews", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: { status: "open" }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));
    const changedMaybeSingle = vi.fn(() => maybeSingle());
    const changedSelect = vi.fn(() => ({ maybeSingle: changedMaybeSingle }));
    const secondEq = vi.fn(() => ({ select: changedSelect }));
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    const update = vi.fn(() => ({ eq: firstEq }));
    mocks.from.mockReturnValue({ select, update });

    await expect(
      transitionIncident({
        incidentId: "incident-1",
        to: "acknowledged",
        actorUid: "admin-1",
      }),
    ).rejects.toThrow("Incident changed before this update");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "acknowledged",
        acknowledged_by: "admin-1",
      }),
    );
    expect(secondEq).toHaveBeenCalledWith("status", "open");
  });

  it("stores only valid UUID session identifiers as audit subjects", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ insert });

    await emitEvent("session.requested", {
      sessionId: "5e8b9a10-a61d-4cc0-bb84-08944b643499",
      channel: "chat",
    });
    await emitEvent("session.requested", {
      sessionId: "client-controlled-text",
    });

    expect(insert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        subject_id: "5e8b9a10-a61d-4cc0-bb84-08944b643499",
      }),
    );
    expect(insert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ subject_id: null }),
    );
  });

  it("never breaks a user action when audit emission is unavailable", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: new Error("audit offline") }),
    });

    await expect(
      emitEvent("counsellor.presence_changed", { status: "available" }),
    ).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });
});
