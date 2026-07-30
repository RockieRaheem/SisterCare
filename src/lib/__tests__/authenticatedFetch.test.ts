import { describe, expect, it, vi } from "vitest";
import { authenticatedFetch } from "../authenticatedFetch";

describe("authenticatedFetch", () => {
  it("sends the active user access token", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const getAccessToken = vi.fn().mockResolvedValue("active-token");

    await authenticatedFetch("/api/sessions", {}, { fetcher, getAccessToken });

    expect(getAccessToken).toHaveBeenCalledWith(false);
    expect(new Headers(fetcher.mock.calls[0][1].headers).get("Authorization"))
      .toBe("Bearer active-token");
  });

  it("refreshes and retries exactly once after an unauthorized response", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const getAccessToken = vi
      .fn()
      .mockResolvedValueOnce("expired-token")
      .mockResolvedValueOnce("fresh-token");

    const response = await authenticatedFetch(
      "/api/presence",
      { method: "POST" },
      { fetcher, getAccessToken },
    );

    expect(response.status).toBe(200);
    expect(getAccessToken.mock.calls).toEqual([[false], [true]]);
    expect(new Headers(fetcher.mock.calls[1][1].headers).get("Authorization"))
      .toBe("Bearer fresh-token");
  });
});
