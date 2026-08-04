"use client";

import { auth } from "./authClient";
import { authenticatedFetch } from "./authenticatedFetch";
import { readApiResponse } from "./apiResponse";

type WorkspaceResponse = {
  success: boolean;
  error?: string;
  data?: { destination: string };
};

const WORKSPACE_RETRY_DELAYS_MS = [250, 700, 1400] as const;

class WorkspaceResolutionError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
    this.name = "WorkspaceResolutionError";
  }
}

export function isWorkspaceResolutionRetryable(status: number): boolean {
  return [401, 409, 429, 502, 503, 504].includes(status);
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * Resolve the signed-in account's workspace on the server. The optional intent
 * can start a counsellor application but can never elevate a privileged role.
 */
export async function resolveSignedInWorkspace(
  requestedIntent?: "member" | "counsellor",
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Authentication required");

  let lastError = "Unable to open your SisterCare workspace";
  for (
    let attempt = 0;
    attempt <= WORKSPACE_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    try {
      // authenticatedFetch uses the newly issued token first and refreshes it
      // only if the server actually rejects it. This avoids the post-signup
      // forced-refresh race while preserving expired-session recovery.
      const response = await authenticatedFetch("/api/auth/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestedIntent }),
      });
      const result = await readApiResponse<WorkspaceResponse>(response);
      if (response.ok && result.success && result.data?.destination) {
        return result.data.destination;
      }
      lastError =
        result.error || "Unable to open your SisterCare workspace";
      if (!isWorkspaceResolutionRetryable(response.status)) {
        throw new WorkspaceResolutionError(lastError, false);
      }
    } catch (error) {
      if (
        error instanceof WorkspaceResolutionError &&
        !error.retryable
      ) {
        throw error;
      }
      lastError =
        error instanceof Error
          ? error.message
          : "Unable to open your SisterCare workspace";
    }
    if (attempt < WORKSPACE_RETRY_DELAYS_MS.length) {
      await wait(WORKSPACE_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error(lastError);
}
