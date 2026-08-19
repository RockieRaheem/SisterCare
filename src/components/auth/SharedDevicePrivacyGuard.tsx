"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hasPrivacyTimeoutElapsed } from "@/lib/privacyTimeout";

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "pointerdown",
  "keydown",
  "touchstart",
  "focus",
];

/** Signs an idle account out so a shared device cannot expose private data. */
export default function SharedDevicePrivacyGuard() {
  const { user, userProfile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const signingOut = useRef(false);

  useEffect(() => {
    if (!user || !userProfile || pathname.startsWith("/sessions/")) {
      lastActivity.current = Date.now();
      if (!user) signingOut.current = false;
      return;
    }
    const timeoutMs = userProfile.privacyPreferences.sharedDeviceLockMinutes * 60_000;
    const active = () => { lastActivity.current = Date.now(); };
    const enforceTimeout = async () => {
      if (
        signingOut.current ||
        !hasPrivacyTimeoutElapsed(lastActivity.current, timeoutMs / 60_000)
      ) return;
      signingOut.current = true;
      try {
        await signOut();
      } finally {
        router.replace("/auth/login?reason=privacy-timeout");
      }
    };
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, active, { passive: true });
    document.addEventListener("visibilitychange", enforceTimeout);
    const timer = window.setInterval(() => void enforceTimeout(), 15_000);
    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, active);
      document.removeEventListener("visibilitychange", enforceTimeout);
      window.clearInterval(timer);
    };
  }, [pathname, router, signOut, user, userProfile]);

  return null;
}
