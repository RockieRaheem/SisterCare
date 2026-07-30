"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase";

export class BrowserAuthenticationError extends Error {
  constructor(message = "Your session is missing or expired. Please sign in again.") {
    super(message);
    this.name = "BrowserAuthenticationError";
  }
}

async function accessToken(forceRefresh: boolean): Promise<string> {
  const client = getSupabaseBrowserClient();
  const { data, error } = forceRefresh
    ? await client.auth.refreshSession()
    : await client.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new BrowserAuthenticationError();
  }
  return data.session.access_token;
}

/**
 * Send a browser request with the active Supabase user JWT.
 * A single forced refresh and replay repairs an access token that expires
 * between page authentication and a protected API call.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  dependencies: {
    getAccessToken?: (forceRefresh: boolean) => Promise<string>;
    fetcher?: typeof fetch;
  } = {},
): Promise<Response> {
  const getAccessToken = dependencies.getAccessToken || accessToken;
  const fetcher = dependencies.fetcher || fetch;

  const send = async (forceRefresh: boolean) => {
    const token = await getAccessToken(forceRefresh);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetcher(input, { ...init, headers });
  };

  const response = await send(false);
  return response.status === 401 ? send(true) : response;
}
