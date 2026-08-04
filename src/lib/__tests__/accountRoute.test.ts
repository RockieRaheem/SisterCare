import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  deleteAuthUser: vi.fn(),
  deleteUserData: vi.fn(),
  isAuthEnforced: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.authenticateRequest,
  deleteAuthUser: mocks.deleteAuthUser,
  isAuthEnforced: mocks.isAuthEnforced,
}));

vi.mock("../server/accountDeletion", () => ({
  deleteUserData: mocks.deleteUserData,
}));

import { DELETE } from "@/app/api/account/route";

describe("DELETE /api/account", () => {
  beforeEach(() => {
    mocks.authenticateRequest.mockReset();
    mocks.deleteAuthUser.mockReset();
    mocks.deleteUserData.mockReset();
    mocks.isAuthEnforced.mockReset();
    mocks.isAuthEnforced.mockReturnValue(true);
  });

  it("is unavailable rather than unsafe when server auth is not configured", async () => {
    mocks.isAuthEnforced.mockReturnValue(false);

    const response = await DELETE(
      new NextRequest("https://sistercare.test/api/account", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ success: false });
    expect(mocks.authenticateRequest).not.toHaveBeenCalled();
  });

  it("rejects an unverified caller without touching any account", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      status: "unauthenticated",
      reason: "missing_token",
    });

    const response = await DELETE(
      new NextRequest("https://sistercare.test/api/account", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.deleteUserData).not.toHaveBeenCalled();
    expect(mocks.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("deletes owned data before deleting the authenticated identity", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      status: "verified",
      uid: "user-1",
      token: { uid: "user-1", role: "user" },
    });
    mocks.deleteUserData.mockResolvedValue({
      deletedDocuments: 4,
      deletedFiles: 2,
    });
    mocks.deleteAuthUser.mockResolvedValue(undefined);

    const response = await DELETE(
      new NextRequest("https://sistercare.test/api/account", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { deletedDocuments: 4, deletedFiles: 2 },
    });
    expect(mocks.deleteUserData).toHaveBeenCalledWith("user-1");
    expect(mocks.deleteAuthUser).toHaveBeenCalledWith("user-1");
    expect(
      mocks.deleteUserData.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.deleteAuthUser.mock.invocationCallOrder[0]);
  });

  it("does not report success when any deletion stage fails", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      status: "verified",
      uid: "user-1",
      token: { uid: "user-1", role: "user" },
    });
    mocks.deleteUserData.mockRejectedValue(new Error("storage unavailable"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await DELETE(
      new NextRequest("https://sistercare.test/api/account", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ success: false });
    expect(mocks.deleteAuthUser).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
