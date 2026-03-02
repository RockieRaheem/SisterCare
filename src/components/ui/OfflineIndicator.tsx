"use client";

import { useState, useEffect } from "react";

/**
 * Offline Indicator Component
 * Shows a banner when the user loses internet connection
 */
export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

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

  // Don't render if online and banner not showing
  if (!isOffline && !showBanner) return null;

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
          ? "You're offline. Some features may be limited."
          : "You're back online!"}
      </span>
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
