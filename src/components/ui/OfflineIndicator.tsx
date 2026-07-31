"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listQueuedWrites,
  OFFLINE_QUEUE_CHANGE_EVENT,
  syncOfflineQueue,
} from "@/lib/offlineQueue";

/**
 * Offline Indicator Component
 * Shows a banner when the user loses internet connection
 */
export default function OfflineIndicator() {
  const { user } = useAuth();
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState(0);

  useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      // Show "back online" message briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setPending(0);
      setConflicts(0);
      return;
    }
    const refresh = async () => {
      const entries = await listQueuedWrites(user.uid).catch(() => []);
      setPending(entries.filter((entry) => entry.status === "pending").length);
      setConflicts(entries.filter((entry) => entry.status === "conflict").length);
    };
    const synchronize = async () => {
      const result = await syncOfflineQueue(user.uid).catch(() => null);
      if (result) {
        setPending(result.pending);
        setConflicts(result.conflicts);
        if (result.synced > 0) setShowBanner(true);
      }
    };
    void refresh();
    if (navigator.onLine) void synchronize();
    window.addEventListener("online", synchronize);
    window.addEventListener(OFFLINE_QUEUE_CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("online", synchronize);
      window.removeEventListener(OFFLINE_QUEUE_CHANGE_EVENT, refresh);
    };
  }, [user]);

  // Don't render if online and banner not showing
  if (!isOffline && !showBanner && pending === 0 && conflicts === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed top-0 left-0 right-0 z-[100] 
        flex items-center justify-center gap-2
        px-4 py-3 text-sm font-medium text-white
        transition-all duration-300 ease-out
        ${
          isOffline
            ? "bg-amber-500 dark:bg-amber-600"
            : "bg-emerald-500 dark:bg-emerald-600"
        }
        ${showBanner ? "translate-y-0" : "-translate-y-full"}
      `}
    >
      <span className="material-symbols-outlined text-xl" aria-hidden="true">
        {isOffline ? "cloud_off" : "cloud_done"}
      </span>
      <span>
        {isOffline
          ? `You're offline.${pending ? ` ${pending} update${pending === 1 ? "" : "s"} waiting to sync.` : ""}`
          : conflicts
            ? `${conflicts} offline update${conflicts === 1 ? "" : "s"} need review; nothing was overwritten.`
            : pending
              ? `Syncing ${pending} saved update${pending === 1 ? "" : "s"}…`
              : "You're back online and saved updates are synchronized."}
      </span>
      {conflicts > 0 && (
        <a href="/settings#offline-sync" className="ml-2 underline underline-offset-2">
          Review
        </a>
      )}
      {isOffline && (
        <button
          onClick={() => setShowBanner(false)}
          className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <span
            className="material-symbols-outlined text-lg"
            aria-hidden="true"
          >
            close
          </span>
        </button>
      )}
    </div>
  );
}
