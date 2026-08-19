"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { resolveRoleBoundaryRedirect } from "@/lib/workspaceRouting";
import ControlledPilotBoundary from "./ControlledPilotBoundary";

export default function WorkspaceBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, loading, profileLoading } = useAuth();
  const destination =
    user && userProfile
      ? resolveRoleBoundaryRedirect({
          pathname,
          role: userProfile.role,
          registrationIntent: userProfile.registrationIntent,
          onboardingCompleted: userProfile.onboardingCompleted,
        })
      : null;

  useEffect(() => {
    if (!loading && !profileLoading && destination) {
      router.replace(destination);
    }
  }, [destination, loading, profileLoading, router]);

  if (!loading && !profileLoading && destination) return null;
  return <ControlledPilotBoundary>{children}</ControlledPilotBoundary>;
}
