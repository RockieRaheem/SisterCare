"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hasPrivacyTimeoutElapsed, mostRecentDeviceActivity } from "@/lib/privacyTimeout";

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "pointerdown",
  "keydown",
  "touchstart",
  "touchmove",
  "wheel",
  "scroll",
];
const SHARED_ACTIVITY_PREFIX = "sistercare-last-active:";
const SHARED_WRITE_INTERVAL_MS = 10_000;

/** Signs an idle account out so a shared device cannot expose private data. */
export default function SharedDevicePrivacyGuard() {
  const { user, userProfile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const lastSharedWrite = useRef(0);
  const signingOut = useRef(false);
  const signOutRef = useRef(signOut);
  const routerRef = useRef(router);
  const [warning, setWarning] = useState(false);
  const uid = user?.uid;
  const timeoutMinutes = userProfile?.privacyPreferences.sharedDeviceLockMinutes;
  signOutRef.current = signOut;
  routerRef.current = router;

  useEffect(() => {
    if (!uid || !timeoutMinutes || pathname.startsWith("/sessions/")) {
      lastActivity.current = Date.now();
      setWarning(false);
      if (!uid) signingOut.current = false;
      return;
    }
    const storageKey = `${SHARED_ACTIVITY_PREFIX}${uid}`;
    const timeoutMs = timeoutMinutes * 60_000;
    lastSharedWrite.current = 0;
    const active = () => {
      const now = Date.now();
      lastActivity.current = now;
      setWarning(false);
      if (now - lastSharedWrite.current < SHARED_WRITE_INTERVAL_MS) return;
      try {
        window.localStorage.setItem(storageKey, String(now));
        lastSharedWrite.current = now;
      } catch {
        // Private browsing may disable storage; same-tab activity still works.
      }
    };
    const readSharedActivity = () => {
      try {
        return Number(window.localStorage.getItem(storageKey));
      } catch {
        return Number.NaN;
      }
    };
    const enforceTimeout = async () => {
      if (signingOut.current) return;
      const now = Date.now();
      const recentActivity = mostRecentDeviceActivity(
        lastActivity.current,
        readSharedActivity(),
        now,
      );
      if (!hasPrivacyTimeoutElapsed(recentActivity, timeoutMinutes, now)) {
        setWarning(
          document.visibilityState === "visible" &&
          now - recentActivity >= timeoutMs - 60_000,
        );
        return;
      }
      signingOut.current = true;
      try {
        await signOutRef.current();
      } finally {
        routerRef.current.replace("/auth/login?reason=privacy-timeout");
      }
    };
    active();
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, active, { passive: true });
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void enforceTimeout();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(() => void enforceTimeout(), 15_000);
    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, active);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(timer);
    };
  }, [pathname, timeoutMinutes, uid]);

  return warning ? (
    <div role="alert" className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-[100] max-w-sm rounded-2xl border border-primary/20 bg-white p-4 text-sm text-text-primary shadow-xl dark:bg-card-dark dark:text-white md:bottom-4">
      <p className="font-bold">Your private session is about to close</p>
      <p className="mt-1 text-xs leading-5 text-text-secondary dark:text-gray-300">This device has been inactive. Stay signed in if it is still safe to use.</p>
      <button type="button" onClick={() => {
        const now = Date.now();
        lastActivity.current = now;
        setWarning(false);
        if (uid) {
          try { window.localStorage.setItem(`${SHARED_ACTIVITY_PREFIX}${uid}`, String(now)); } catch { /* same-tab activity remains available */ }
        }
      }} className="mt-3 min-h-10 rounded-xl bg-primary px-4 font-bold text-white">Stay signed in</button>
    </div>
  ) : null;
}
