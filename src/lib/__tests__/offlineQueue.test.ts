import { describe, expect, it } from "vitest";
import { queuedWriteMessage, shouldQueueResponseStatus } from "../offlineQueue";

describe("offline write classification", () => {
  it("queues only transient gateway and service failures", () => {
    expect([502, 503, 504].every(shouldQueueResponseStatus)).toBe(true);
    expect(shouldQueueResponseStatus(400)).toBe(false);
    expect(shouldQueueResponseStatus(401)).toBe(false);
    expect(shouldQueueResponseStatus(409)).toBe(false);
  });

  it("does not tell an online user that they are offline during a service interruption", () => {
    expect(queuedWriteMessage("service")).toContain("SisterCare reconnects");
    expect(queuedWriteMessage("service")).not.toContain("when your connection returns");
    expect(queuedWriteMessage("offline")).toContain("when your connection returns");
  });
});
