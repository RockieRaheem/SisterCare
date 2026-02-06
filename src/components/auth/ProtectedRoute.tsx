"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile } from "@/lib/firestore";

interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;
}

/**
 * Component wrapper for protected routes
 * Redirects unauthenticated users to login
 * Optionally redirects users who haven't completed onboarding
 */
export default function ProtectedRoute({
  children,
  requireOnboarding = true,
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checkingOnboarding, setCheckingOnboarding] =
    useState(requireOnboarding);

  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading) return;

      // Redirect to login if not authenticated
      if (!user) {
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      // Check onboarding status if required
      if (requireOnboarding && pathname !== "/onboarding") {
        try {
          const profile = await getUserProfile(user.uid);

          if (!profile || !profile.onboardingCompleted) {
            router.push("/onboarding");
            return;
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
      }

      setCheckingOnboarding(false);
    };

    checkAuth();
  }, [user, authLoading, router, pathname, requireOnboarding]);

  // Show loading state
  if (authLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
