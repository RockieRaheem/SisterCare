// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import OperationsShell from "@/components/operations/OperationsShell";
import { OperationsSyncStatus } from "@/components/operations/OperationsUI";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  authenticatedFetch: vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/counsellor",
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "helper@sistercare.test", displayName: "Helper One" },
    userProfile: { displayName: "Helper One" },
    signOut: mocks.signOut,
  }),
}));

vi.mock("@/lib/authenticatedFetch", () => ({
  authenticatedFetch: mocks.authenticatedFetch,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const navigation = [
  { href: "/counsellor", label: "Care desk", description: "Live care", icon: "support_agent" },
];

describe("operations workspace status", () => {
  it("distinguishes live, delayed and offline data", () => {
    const { rerender } = render(<OperationsSyncStatus updatedAt={new Date()} />);
    expect(screen.getByText("Live data")).toBeTruthy();

    rerender(<OperationsSyncStatus updatedAt={new Date()} stale />);
    expect(screen.getByText("Data delayed")).toBeTruthy();

    rerender(<OperationsSyncStatus updatedAt={new Date()} online={false} />);
    expect(screen.getByText("Device offline")).toBeTruthy();
  });
});

describe("counsellor sign-out", () => {
  it("marks the professional offline before ending the local session", async () => {
    const user = userEvent.setup();
    render(
      <OperationsShell mode="counsellor" navigation={navigation}>
        Care desk
      </OperationsShell>,
    );

    await user.click(screen.getAllByRole("button", { name: "Sign out" })[0]);

    await waitFor(() => {
      expect(mocks.authenticatedFetch).toHaveBeenCalledWith(
        "/api/presence",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ status: "offline" }) }),
      );
      expect(mocks.signOut).toHaveBeenCalledOnce();
      expect(mocks.replace).toHaveBeenCalledWith("/auth/login");
    });
    expect(mocks.authenticatedFetch.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.signOut.mock.invocationCallOrder[0],
    );
  });
});
