import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("../supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));

import {
  getDatabaseReadiness,
  getMaintenanceReadiness,
  getSafetyCoverageReadiness,
  recordMaintenanceRun,
} from "../server/operations";

describe("server operations readiness", () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.rpc.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("records a maintenance heartbeat without discarding its details", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert });

    await recordMaintenanceRun("session_sweep", true, { expired: 4 });

    expect(mocks.from).toHaveBeenCalledWith("operations_heartbeats");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        job: "session_sweep",
        success: true,
        details: { expired: 4 },
        ran_at: expect.any(String),
      }),
      { onConflict: "job" },
    );
  });

  it("fails closed when either production maintenance job is stale", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const now = Date.parse("2026-08-04T18:00:00.000Z");
    mocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            job: "session_sweep",
            success: true,
            ran_at: "2026-08-04T17:00:00.000Z",
          },
          {
            job: "availability_sync",
            success: true,
            ran_at: "2026-08-02T00:00:00.000Z",
          },
        ],
        error: null,
      }),
    });

    await expect(getMaintenanceReadiness(now)).resolves.toBe(false);
  });

  it("requires every critical table, column set and matching function", async () => {
    mocks.from.mockImplementation(() => ({
      select: vi.fn().mockResolvedValue({ error: null }),
    }));
    mocks.rpc.mockResolvedValue({ error: null });

    await expect(getDatabaseReadiness()).resolves.toBe(true);
    expect(mocks.from).toHaveBeenCalledTimes(15);
    expect(mocks.from).toHaveBeenCalledWith("session_audio_calls");
    expect(mocks.rpc).toHaveBeenCalledWith("claim_counselling_session", {
      target_session_id: "00000000-0000-0000-0000-000000000000",
      target_counsellor_id: "00000000-0000-0000-0000-000000000000",
      target_counsellor_name: "Readiness probe",
    });
  });

  it("requires a fresh named safety responder", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { responder_id: "admin-1" }, error: null });
    const limit = vi.fn(() => ({ maybeSingle }));
    const gte = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ gte }));
    mocks.from.mockReturnValue({ select: vi.fn(() => ({ eq })) });

    await expect(getSafetyCoverageReadiness()).resolves.toBe(true);
  });

  it("reports the database unavailable when any required probe fails", async () => {
    mocks.from.mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue({
        error: table === "incidents" ? { message: "missing relation" } : null,
      }),
    }));
    mocks.rpc.mockResolvedValue({ error: null });

    await expect(getDatabaseReadiness()).resolves.toBe(false);
  });
});
