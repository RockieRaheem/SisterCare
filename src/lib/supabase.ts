"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getLegacySupabaseStorageKey,
  getOrCreateTabId,
  getTabAuthStorageKey,
  migrateLegacyAuthSession,
} from "./tabAuthStorage";

let browserClient: SupabaseClient | null = null;

/** Browser client for Supabase Auth, Postgres and Realtime. */
export function getSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  if (!browserClient) {
    const tabId = getOrCreateTabId(window, () => crypto.randomUUID());
    const storageKey = getTabAuthStorageKey(tabId);
    migrateLegacyAuthSession(
      window.localStorage,
      window.sessionStorage,
      getLegacySupabaseStorageKey(url),
      storageKey,
    );
    browserClient = createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.sessionStorage,
        storageKey,
      },
    });
  }
  return browserClient;
}

export const isSupabaseBrowserConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
