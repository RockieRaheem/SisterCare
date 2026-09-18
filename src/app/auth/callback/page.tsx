"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/layout/AuthShell";
import { useAuth } from "@/context/AuthContext";
import { clearOAuthTransaction } from "@/lib/oauthTransaction";
import { resolveSignedInWorkspace } from "@/lib/workspaceClient";

function readProviderError(): string | null {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const description =
    query.get("error_description") ||
    hash.get("error_description") ||
    query.get("error") ||
    hash.get("error");
  return description ? description.replaceAll("+", " ").slice(0, 240) : null;
}

export default function GoogleAuthCallbackPage() {
  const { user, userProfile, loading, profileLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const routingRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const providerError = readProviderError();
    if (providerError) {
      clearOAuthTransaction(window.sessionStorage);
      setError(`Google could not complete sign-in: ${providerError}`);
    }
  }, []);

  useEffect(() => {
    if (error || loading || profileLoading || !user || !userProfile || routingRef.current) {
      return;
    }
    routingRef.current = true;
    void resolveSignedInWorkspace()
      .then((destination) => router.replace(destination))
      .catch((routeError: unknown) => {
        routingRef.current = false;
        setError(
          routeError instanceof Error
            ? routeError.message
            : "SisterCare could not open your workspace.",
        );
      });
  }, [error, loading, profileLoading, router, user, userProfile]);

  useEffect(() => {
    if (error || loading || profileLoading || userProfile) return;
    const timeout = window.setTimeout(() => {
      setError(
        user
          ? "Your Google account is signed in, but SisterCare could not finish preparing your profile. Select Try again."
          : "No Google session was returned. Please start Google sign-in again.",
      );
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [error, loading, profileLoading, user, userProfile]);

  return (
    <AuthShell activeTab="login">
      <section className="animate-fade-in rounded-3xl border border-border-light bg-white p-6 text-center shadow-soft-lg dark:border-border-dark dark:bg-card-dark sm:p-8">
        {error ? (
          <>
            <span className="material-symbols-outlined text-4xl text-red-500" aria-hidden="true">
              error
            </span>
            <h1 className="mt-3 text-2xl font-bold text-text-primary dark:text-white">
              Google sign-in needs another try
            </h1>
            <p role="alert" className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-300">
              {error}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="touch-target rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-dark"
              >
                Try again
              </button>
              <Link
                href="/auth/login"
                className="touch-target flex items-center justify-center rounded-xl border border-border-light px-4 py-3 text-sm font-bold text-text-primary transition hover:border-primary dark:border-border-dark dark:text-white"
              >
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <div role="status" aria-live="polite">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined animate-pulse text-3xl" aria-hidden="true">
                shield_lock
              </span>
            </span>
            <h1 className="mt-4 text-2xl font-bold text-text-primary dark:text-white">
              Opening your private space
            </h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-300">
              SisterCare is securely confirming your Google account and workspace.
            </p>
            <div className="mx-auto mt-6 h-1.5 w-32 overflow-hidden rounded-full bg-primary/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        )}
      </section>
    </AuthShell>
  );
}
