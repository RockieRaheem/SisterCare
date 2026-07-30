/** Supabase-backed browser authentication facade. */
"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";

export interface SisterCareAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  getIdTokenResult: () => Promise<{ claims: { role?: string } }>;
}

type AuthListener = (user: SisterCareAuthUser | null) => void | Promise<void>;

function toUser(session: Session | null): SisterCareAuthUser | null {
  if (!session) return null;
  const source = session.user;
  return {
    uid: source.id,
    email: source.email ?? null,
    displayName: (source.user_metadata.full_name as string | undefined) ?? null,
    photoURL: (source.user_metadata.avatar_url as string | undefined) ?? null,
    getIdToken: async (forceRefresh = false) => {
      const client = getSupabaseBrowserClient();
      const { data, error } = forceRefresh
        ? await client.auth.refreshSession()
        : await client.auth.getSession();
      if (error) throw error;
      if (!data.session?.access_token) throw new Error("Authentication required");
      return data.session.access_token;
    },
    getIdTokenResult: async () => {
      const { data, error } = await getSupabaseBrowserClient()
        .from("profiles")
        .select("role")
        .eq("id", source.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { claims: { role: data?.role } };
    },
  };
}

class SupabaseAuthFacade {
  private cachedUser: SisterCareAuthUser | null = null;
  private initialized = false;
  private listeners = new Set<AuthListener>();

  get currentUser() { return this.cachedUser; }

  private async notify(session: Session | null) {
    this.cachedUser = toUser(session);
    // Authentication success must not be turned into a password failure when a
    // secondary profile fetch is briefly unavailable. Each listener owns its
    // recovery/retry path, while the valid Supabase session remains usable.
    for (const listener of this.listeners) {
      Promise.resolve(listener(this.cachedUser)).catch((error) =>
        console.error("Auth state listener failed:", error),
      );
    }
  }

  private initialize() {
    if (this.initialized) return;
    this.initialized = true;
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => this.notify(data.session));
    supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session) => {
      void this.notify(session);
    });
  }

  onAuthStateChanged(listener: AuthListener) {
    this.initialize();
    this.listeners.add(listener);
    if (this.cachedUser) void listener(this.cachedUser);
    return () => { this.listeners.delete(listener); };
  }

  async signInWithEmailAndPassword(email: string, password: string) {
    const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this.notify(data.session);
  }

  async createUserWithEmailAndPassword(email: string, password: string, registrationIntent: "member" | "counsellor") {
    const { data, error } = await getSupabaseBrowserClient().auth.signUp({
      email,
      password,
      options: { data: { registration_intent: registrationIntent } },
    });
    if (error) throw error;
    await this.notify(data.session);
    return { emailConfirmationRequired: Boolean(data.user && !data.session) };
  }

  async signInWithGoogle(registrationIntent: "member" | "counsellor") {
    window.localStorage.setItem("sistercare-registration-intent", registrationIntent);
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/login?oauth=1`,
      },
    });
    if (error) throw error;
  }

  async signOut() {
    const { error } = await getSupabaseBrowserClient().auth.signOut({
      scope: "local",
    });
    if (error) throw error;
    await this.notify(null);
  }

  async sendPasswordResetEmail(email: string) {
    const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/reset-password` },
    );
    if (error) throw error;
  }

  async updatePassword(password: string) {
    const { error } = await getSupabaseBrowserClient().auth.updateUser({
      password,
    });
    if (error) throw error;
  }
}

export const auth = new SupabaseAuthFacade();
