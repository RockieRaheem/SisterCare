"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { applyAdminVerificationOutcome } from "@/lib/adminAccess";
import { resolveSignedInWorkspace } from "@/lib/workspaceClient";

export function useAdminAccess() {
  const { user, userProfile, loading, profileLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [verificationUnavailable, setVerificationUnavailable] = useState(false);

  const verify = useCallback(async () => {
    if (!user) {
      if (!loading) setIsAdmin(false);
      return;
    }
    try {
      const destination = await resolveSignedInWorkspace();
      setIsAdmin((current) =>
        applyAdminVerificationOutcome(
          current,
          destination === "/admin" ? "admin" : "non_admin",
        ),
      );
      setVerificationUnavailable(false);
    } catch {
      setIsAdmin((current) =>
        applyAdminVerificationOutcome(current, "unavailable"),
      );
      setVerificationUnavailable(true);
    }
  }, [loading, user]);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      setIsAdmin(false);
      setVerificationUnavailable(false);
      return;
    }
    if (userProfile?.role === "admin") setIsAdmin(true);
    void verify();
    const interval = window.setInterval(() => void verify(), 60_000);
    return () => window.clearInterval(interval);
  }, [loading, profileLoading, user, userProfile?.role, verify]);

  return {
    isAdmin,
    checking:
      loading || isAdmin === null || (profileLoading && isAdmin !== true),
    verificationUnavailable,
    retry: verify,
  };
}
