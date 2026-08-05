import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  authorizationFailure: vi.fn(),
  listSessionMessages: vi.fn(),
  sendSessionMessage: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.authenticateRequest,
  getAuthorizationFailure: mocks.authorizationFailure,
  isAuthEnforced: () => true,
}));

vi.mock("../server/sessions", () => ({
  listSessionMessages: mocks.listSessionMessages,
  sendSessionMessage: mocks.sendSessionMessage,
}));

import {
  GET,
  POST,
} from "@/app/api/sessions/[id]/messages/route";

const context = {
  params: Promise.resolve({ id: "session-1" }),
};

describe("/api/sessions/:id/messages", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.authorizationFailure.mockReturnValue(null);
    mocks.authenticateRequest.mockResolvedValue({
      status: "verified",
      uid: "member-1",
    });
  });

  it("returns ordered private message history without caching", async () => {
    mocks.listSessionMessages.mockResolvedValue([
      { id: "message-1", text: "Hello" },
    ]);

    const response = await GET(
      new NextRequest(
        "https://sistercare.test/api/sessions/session-1/messages",
      ),
      context,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.listSessionMessages).toHaveBeenCalledWith(
      "session-1",
      "member-1",
    );
  });

  it("saves a message for the authenticated participant", async () => {
    mocks.sendSessionMessage.mockResolvedValue({
      id: "message-2",
      senderId: "member-1",
      text: "I need support",
    });

    const response = await POST(
      new NextRequest(
        "https://sistercare.test/api/sessions/session-1/messages",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "I need support" }),
        },
      ),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.sendSessionMessage).toHaveBeenCalledWith(
      "session-1",
      "member-1",
      "I need support",
    );
  });

  it("rejects callers who are not session participants", async () => {
    mocks.sendSessionMessage.mockRejectedValue(
      new Error("Not a participant of this session"),
    );

    const response = await POST(
      new NextRequest(
        "https://sistercare.test/api/sessions/session-1/messages",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "Cross-room message" }),
        },
      ),
      context,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Not a participant of this session",
    });
  });
});
