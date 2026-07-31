import { describe, expect, it } from "vitest";
import { shouldQueueResponseStatus } from "../offlineQueue";

describe("offline write classification", () => {
  it("queues only transient gateway and service failures", () => {
    expect([502, 503, 504].every(shouldQueueResponseStatus)).toBe(true);
    expect(shouldQueueResponseStatus(400)).toBe(false);
    expect(shouldQueueResponseStatus(401)).toBe(false);
    expect(shouldQueueResponseStatus(409)).toBe(false);
  });
});
