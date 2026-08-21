import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  authorizationFailure: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/serverAuth", () => ({
  authenticateRequest: mocks.authenticateRequest,
  getAuthorizationFailure: mocks.authorizationFailure,
  isAuthEnforced: () => true,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

function query(result: object) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    then: (
      resolve: (value: object) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

import { DELETE, GET } from "@/app/api/symptoms/route";

const recordId = "11111111-1111-4111-8111-111111111111";

describe("private physical symptom records", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({
      status: "verified",
      uid: "member-1",
      token: { uid: "member-1", role: "user" },
    });
    mocks.authorizationFailure.mockReturnValue(null);
  });

  it("returns only display-safe fields with honest legacy provenance", async () => {
    const databaseQuery = query({
      data: [
        {
          id: recordId,
          payload: {
            date: new Date().toISOString(),
            symptoms: ["headache"],
            notes: "private detail that must not be returned",
          },
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
    mocks.from.mockReturnValue(databaseQuery);

    const response = await GET(
      new NextRequest("https://sistercare.test/api/symptoms?days=30"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(databaseQuery.eq).toHaveBeenCalledWith("user_id", "member-1");
    expect(payload.data.symptoms[0]).toMatchObject({
      id: recordId,
      symptoms: ["headache"],
    });
    expect(payload.data.symptoms[0].source).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("private detail");
  });

  it("refuses deletion when every requested record is not owned by the member", async () => {
    mocks.from.mockReturnValue(query({ data: [], error: null }));
    const response = await DELETE(
      new NextRequest("https://sistercare.test/api/symptoms", {
        method: "DELETE",
        body: JSON.stringify({ ids: [recordId] }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(404);
    expect(mocks.from).toHaveBeenCalledOnce();
  });

  it("deletes a verified member-owned symptom record", async () => {
    mocks.from
      .mockReturnValueOnce(query({ data: [{ id: recordId }], error: null }))
      .mockReturnValueOnce(query({ data: [{ id: recordId }], error: null }));
    const response = await DELETE(
      new NextRequest("https://sistercare.test/api/symptoms", {
        method: "DELETE",
        body: JSON.stringify({ ids: [recordId] }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.deleted).toBe(1);
  });
});
