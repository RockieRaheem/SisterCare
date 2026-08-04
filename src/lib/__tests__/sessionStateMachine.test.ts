import { describe, it, expect } from "vitest";
import {
  canTransition,
  assertTransition,
  evaluateTimeout,
  compareQueuePriority,
  SESSION_TRANSITIONS,
  TERMINAL_STATES,
  ACCEPT_TIMEOUT_MINUTES,
  REQUEST_EXPIRY_HOURS,
} from "../sessionStateMachine";
import { SessionState } from "@/types";

describe("session transitions", () => {
  it("allows the happy path end to end", () => {
    expect(canTransition("requested", "matched")).toBe(true);
    expect(canTransition("matched", "accepted")).toBe(true);
    expect(canTransition("accepted", "active")).toBe(true);
    expect(canTransition("active", "completed")).toBe(true);
    expect(canTransition("completed", "feedback_received")).toBe(true);
  });

  it("allows decline/timeout back to the queue and crisis escalation", () => {
    expect(canTransition("matched", "requested")).toBe(true);
    expect(canTransition("active", "escalated")).toBe(true);
    expect(canTransition("requested", "expired")).toBe(true);
    expect(canTransition("requested", "cancelled")).toBe(true);
    expect(canTransition("matched", "cancelled")).toBe(true);
  });

  it("rejects skipping states and reviving terminal states", () => {
    expect(canTransition("requested", "active")).toBe(false);
    expect(canTransition("requested", "accepted")).toBe(false);
    expect(canTransition("active", "requested")).toBe(false);
    for (const terminal of TERMINAL_STATES) {
      expect(SESSION_TRANSITIONS[terminal]).toEqual([]);
    }
  });

  it("assertTransition throws with a readable message", () => {
    expect(() => assertTransition("expired", "active")).toThrow(
      "Invalid session transition: expired → active",
    );
  });

  it("every state is covered by the transition table", () => {
    const states: SessionState[] = [
      "requested",
      "matched",
      "accepted",
      "active",
      "completed",
      "feedback_received",
      "expired",
      "escalated",
      "cancelled",
    ];
    for (const s of states) {
      expect(SESSION_TRANSITIONS[s]).toBeDefined();
    }
  });
});

describe("evaluateTimeout", () => {
  const base = new Date("2026-07-19T12:00:00");
  const minutesLater = (m: number) => new Date(base.getTime() + m * 60_000);

  it("rematches a matched session after the accept timeout", () => {
    const session = {
      state: "matched" as SessionState,
      priority: "normal" as const,
      requestedAt: base,
      matchedAt: base,
    };
    expect(
      evaluateTimeout(session, minutesLater(ACCEPT_TIMEOUT_MINUTES - 1)),
    ).toBe("none");
    expect(
      evaluateTimeout(session, minutesLater(ACCEPT_TIMEOUT_MINUTES + 1)),
    ).toBe("rematch");
  });

  it("expires a stale normal request but never a critical one", () => {
    const stale = minutesLater((REQUEST_EXPIRY_HOURS + 1) * 60);
    const normal = {
      state: "requested" as SessionState,
      priority: "normal" as const,
      requestedAt: base,
    };
    const critical = { ...normal, priority: "critical" as const };
    expect(evaluateTimeout(normal, stale)).toBe("expire");
    expect(evaluateTimeout(critical, stale)).toBe("none");
  });

  it("does nothing for active or terminal sessions", () => {
    const active = {
      state: "active" as SessionState,
      priority: "normal" as const,
      requestedAt: base,
    };
    expect(evaluateTimeout(active, minutesLater(600))).toBe("none");
  });
});

describe("compareQueuePriority", () => {
  const at = (iso: string) => new Date(iso);

  it("puts critical requests before older normal ones", () => {
    const critical = {
      priority: "critical" as const,
      requestedAt: at("2026-07-19T12:00:00"),
    };
    const olderNormal = {
      priority: "normal" as const,
      requestedAt: at("2026-07-19T08:00:00"),
    };
    expect(compareQueuePriority(critical, olderNormal)).toBeLessThan(0);
  });

  it("orders same-priority requests oldest first", () => {
    const older = {
      priority: "normal" as const,
      requestedAt: at("2026-07-19T08:00:00"),
    };
    const newer = {
      priority: "normal" as const,
      requestedAt: at("2026-07-19T09:00:00"),
    };
    expect(compareQueuePriority(older, newer)).toBeLessThan(0);
    expect([newer, older].sort(compareQueuePriority)[0]).toBe(older);
  });
});
