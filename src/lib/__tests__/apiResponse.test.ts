import { describe, expect, it } from "vitest";
import { readApiResponse } from "../apiResponse";

describe("readApiResponse", () => {
  it("parses a JSON response", async () => {
    const response = new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
    await expect(readApiResponse(response)).resolves.toEqual({ success: true });
  });

  it("turns an empty error body into an actionable message", async () => {
    const response = new Response(null, { status: 503 });
    await expect(readApiResponse(response)).rejects.toThrow(
      "The request failed with status 503",
    );
  });

  it("turns malformed content into an actionable message", async () => {
    const response = new Response("<html>failure</html>", { status: 500 });
    await expect(readApiResponse(response)).rejects.toThrow(
      "The server returned an invalid response (500)",
    );
  });
});
