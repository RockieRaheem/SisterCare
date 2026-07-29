"use client";

import { auth } from "./authClient";
import { readApiResponse } from "./apiResponse";

type WorkspaceResponse = {
  success: boolean;
  error?: string;
  data?: { destination: string };
};

/**
 * Resolve the signed-in account's workspace on the server. The optional intent
 * can start a counsellor application but can never elevate a privileged role.
 */
export async function resolveSignedInWorkspace(
  requestedIntent?: "member" | "counsellor",
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Authentication required");
  const token = await user.getIdToken(true);
  const response = await fetch("/api/auth/workspace", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ requestedIntent }),
  });
  const result = await readApiResponse<WorkspaceResponse>(response);
  if (!response.ok || !result.success || !result.data?.destination) {
    throw new Error(result.error || "Unable to open your SisterCare workspace");
  }
  return result.data.destination;
}
