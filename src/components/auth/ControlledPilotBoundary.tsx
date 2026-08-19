"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/authClient";
import { CONTROLLED_PILOT, currentPilotConsent } from "@/lib/pilot";

const MEMBER_WORKSPACES = [
  "/dashboard",
  "/chat",
  "/counsellors",
  "/sessions",
  "/library",
  "/wellbeing",
  "/profile",
  "/settings",
  "/analytics",
];

export default function ControlledPilotBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, userProfile, refreshProfile, signOut } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isMemberWorkspace = MEMBER_WORKSPACES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const needsConsent = Boolean(
    CONTROLLED_PILOT.active &&
      isMemberWorkspace &&
      user &&
      userProfile &&
      userProfile.role === "member" &&
      userProfile.registrationIntent !== "counsellor" &&
      (!userProfile.adultConfirmed ||
        userProfile.pilotConsentVersion !== CONTROLLED_PILOT.consentVersion),
  );

  const accept = async () => {
    if (!confirmed) {
      setError(`Confirm that you are at least ${CONTROLLED_PILOT.minimumAge} years old to continue.`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error("Your session has expired. Sign in again.");
      const response = await fetch("/api/profile/pilot-consent", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentPilotConsent()),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Consent could not be recorded.");
      await refreshProfile();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Consent could not be recorded.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!needsConsent) return <>{children}</>;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background-light px-4 py-10 dark:bg-background-dark">
      <section aria-labelledby="pilot-access-heading" className="w-full max-w-lg rounded-3xl border border-border-light bg-white p-6 shadow-soft-lg dark:border-border-dark dark:bg-card-dark sm:p-8">
        <span className="material-symbols-outlined rounded-2xl bg-primary/10 p-3 text-3xl text-primary" aria-hidden="true">verified_user</span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">Controlled pilot</p>
        <h1 id="pilot-access-heading" className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">One safety check before you continue</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary dark:text-gray-300">
          This early SisterCare pilot is currently limited to adults. SisterCare offers private support and wellbeing tools, but it is not an emergency service and cannot diagnose or replace professional care.
        </p>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-text-primary dark:text-white">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 rounded border-primary/40 text-primary focus:ring-primary" />
          <span>I confirm that I am at least {CONTROLLED_PILOT.minimumAge} years old and agree to participate under the current <Link href="/terms" className="font-semibold text-primary underline">pilot terms</Link> and <Link href="/privacy" className="font-semibold text-primary underline">privacy notice</Link>.</span>
        </label>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
        <button type="button" onClick={accept} disabled={submitting} className="mt-5 min-h-12 w-full rounded-xl bg-primary px-4 font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? "Recording consent…" : "Agree and continue"}
        </button>
        <button type="button" onClick={() => void signOut()} className="mt-3 min-h-11 w-full rounded-xl px-4 text-sm font-semibold text-text-secondary hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5">Sign out</button>
      </section>
    </div>
  );
}
