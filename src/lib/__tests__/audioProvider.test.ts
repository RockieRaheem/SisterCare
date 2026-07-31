import { describe, expect, it } from "vitest";
import { validateAudioJoinUrl } from "../server/audioProvider";

describe("anonymous audio provider boundary", () => {
  it("accepts only HTTPS URLs from the configured provider host", () => {
    expect(
      validateAudioJoinUrl(
        "https://calls.example.org/room/private?token=short-lived",
        "calls.example.org",
      ),
    ).toContain("https://calls.example.org/room/private");
    expect(() =>
      validateAudioJoinUrl("http://calls.example.org/room", "calls.example.org"),
    ).toThrow("untrusted");
    expect(() =>
      validateAudioJoinUrl("https://lookalike.example/room", "calls.example.org"),
    ).toThrow("untrusted");
  });
});
