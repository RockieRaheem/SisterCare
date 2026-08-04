// @vitest-environment jsdom

import React from "react";
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authState: {
    current: {
      user: null as null | { uid: string },
      userProfile: null as null | {
        role: string;
        registrationIntent: "member" | "counsellor";
        onboardingCompleted: boolean;
      },
      loading: false,
      profileLoading: false,
    },
  },
  getUserProfile: vi.fn(),
  pathname: { current: "/dashboard" },
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mocks.authState.current,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname.current,
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
  }),
}));

vi.mock("@/lib/dataClient", () => ({
  getUserProfile: mocks.getUserProfile,
}));

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WorkspaceBoundary from "@/components/auth/WorkspaceBoundary";

describe("browser access boundaries", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.replace.mockReset();
    mocks.getUserProfile.mockReset();
    mocks.pathname.current = "/dashboard";
    mocks.authState.current = {
      user: null,
      userProfile: null,
      loading: false,
      profileLoading: false,
    };
  });

  afterEach(cleanup);

  it("preserves the requested destination when sending a guest to login", async () => {
    render(
      <ProtectedRoute>
        <p>Private dashboard</p>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(
        "/auth/login?redirect=%2Fdashboard",
      );
    });
    expect(screen.queryByText("Private dashboard")).toBeNull();
  });

  it("keeps an incomplete member out of protected pages until onboarding", async () => {
    mocks.authState.current = {
      user: { uid: "member-1" },
      userProfile: null,
      loading: false,
      profileLoading: false,
    };
    mocks.getUserProfile.mockResolvedValue({ onboardingCompleted: false });

    render(
      <ProtectedRoute>
        <p>Private dashboard</p>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/onboarding");
    });
    expect(screen.queryByText("Private dashboard")).toBeNull();
  });

  it("renders a protected page after confirmed onboarding", async () => {
    mocks.authState.current = {
      user: { uid: "member-1" },
      userProfile: null,
      loading: false,
      profileLoading: false,
    };
    mocks.getUserProfile.mockResolvedValue({ onboardingCompleted: true });

    render(
      <ProtectedRoute>
        <p>Private dashboard</p>
      </ProtectedRoute>,
    );

    expect(await screen.findByText("Private dashboard")).toBeTruthy();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("moves administrators out of every member workspace", async () => {
    mocks.authState.current = {
      user: { uid: "admin-1" },
      userProfile: {
        role: "admin",
        registrationIntent: "member",
        onboardingCompleted: true,
      },
      loading: false,
      profileLoading: false,
    };

    render(
      <WorkspaceBoundary>
        <p>Member interface</p>
      </WorkspaceBoundary>,
    );

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/admin"));
    expect(screen.queryByText("Member interface")).toBeNull();
  });

  it("moves counsellors from member library UI to editorial tools", async () => {
    mocks.pathname.current = "/library";
    mocks.authState.current = {
      user: { uid: "counsellor-1" },
      userProfile: {
        role: "counsellor",
        registrationIntent: "counsellor",
        onboardingCompleted: false,
      },
      loading: false,
      profileLoading: false,
    };

    render(
      <WorkspaceBoundary>
        <p>Member library</p>
      </WorkspaceBoundary>,
    );

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/counsellor/articles"),
    );
    expect(screen.queryByText("Member library")).toBeNull();
  });
});
