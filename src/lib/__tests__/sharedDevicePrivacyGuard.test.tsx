// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  replace: vi.fn(),
  enabled: true,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "member-1" },
    userProfile: { privacyPreferences: { sharedDeviceAutoSignOut: mocks.enabled, sharedDeviceLockMinutes: 5 } },
    signOut: mocks.signOut,
  }),
}));

import SharedDevicePrivacyGuard from "@/components/auth/SharedDevicePrivacyGuard";

describe("shared-device privacy guard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-19T12:00:00Z"));
    const entries = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => entries.get(key) ?? null,
        setItem: (key: string, value: string) => { entries.set(key, value); },
        removeItem: (key: string) => { entries.delete(key); },
        clear: () => entries.clear(),
      },
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    mocks.signOut.mockReset().mockResolvedValue(undefined);
    mocks.replace.mockReset();
    mocks.enabled = true;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not sign out an account that was active in another tab", async () => {
    render(<SharedDevicePrivacyGuard />);
    expect(vi.getTimerCount()).toBe(1);
    expect(window.localStorage.getItem("sistercare-last-active:member-1")).not.toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    expect(Date.now()).toBe(Date.parse("2026-09-19T12:04:00Z"));
    expect(window.localStorage.getItem("sistercare-last-active:member-1")).toBe(String(Date.parse("2026-09-19T12:00:00Z")));
    expect(screen.getByText("Your private session is about to close")).toBeTruthy();

    window.localStorage.setItem("sistercare-last-active:member-1", String(Date.now()));
    await act(async () => { await vi.advanceTimersByTimeAsync(2 * 60_000); });

    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(screen.queryByText("Your private session is about to close")).toBeNull();
  });

  it("warns before sign-out and lets the person continue", async () => {
    render(<SharedDevicePrivacyGuard />);
    expect(vi.getTimerCount()).toBe(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    fireEvent.click(screen.getByRole("button", { name: "Stay signed in" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(2 * 60_000); });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("never schedules inactivity sign-out without an explicit opt-in", async () => {
    mocks.enabled = false;
    render(<SharedDevicePrivacyGuard />);
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(60 * 60_000); });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
