import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  authorizationFailure: vi.fn(),
  getLiveCounsellors: vi.fn(),
  from: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.authenticateRequest,
  getAuthorizationFailure: mocks.authorizationFailure,
  isAuthEnforced: () => true,
}));

vi.mock("../server/serverData", () => ({
  getLiveCounsellors: mocks.getLiveCounsellors,
}));

vi.mock("../supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

vi.mock("../observability", () => ({
  withApiObservability:
    (_name: string, handler: (request: NextRequest) => Promise<Response>) =>
    handler,
}));

import { GET } from "@/app/api/admin/overview/route";

function query(result: object) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (
      resolve: (value: object) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

describe("live admin operations overview", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.authorizationFailure.mockReturnValue(null);
    mocks.authenticateRequest.mockResolvedValue({
      status: "verified",
      uid: "admin-1",
      token: { role: "admin" },
    });
    mocks.getLiveCounsellors.mockResolvedValue([
      { id: "counsellor-1", status: "offline" },
    ]);
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return query({ data: null, count: 8, error: null });
      }
      if (table === "counsellor_applications") {
        return query({ data: [], error: null });
      }
      if (table === "counselling_sessions") {
        return query({
          data: [{ id: "session-1", state: "requested" }],
          error: null,
        });
      }
      return query({ data: null, count: 0, error: null });
    });
  });

  it("reports stored offline presence immediately and disables caching", async () => {
    const response = await GET(
      new NextRequest("https://sistercare.test/api/admin/overview"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload.data.counts).toMatchObject({
      available: 0,
      inSession: 0,
      waiting: 1,
      liveSessions: 1,
    });
  });
});
