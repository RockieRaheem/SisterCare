import { describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  callback: null as null | ((event: string, session: unknown) => void),
  getSession: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: mock.getSession,
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        mock.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  }),
}));

import { auth } from "@/lib/authClient";

describe("authentication initialization", () => {
  it("uses the Supabase initial event without a competing session read", () => {
    const observed: Array<string | null> = [];
    const unsubscribe = auth.onAuthStateChanged((user) => {
      observed.push(user?.uid || null);
    });

    expect(mock.getSession).not.toHaveBeenCalled();
    mock.callback?.("INITIAL_SESSION", null);
    mock.callback?.("SIGNED_IN", {
      user: { id: "member-1", email: "member@example.com", user_metadata: {} },
    });
    mock.callback?.("INITIAL_SESSION", null);

    expect(observed).toEqual([null, "member-1"]);
    expect(auth.currentUser?.uid).toBe("member-1");
    unsubscribe();
  });
});
