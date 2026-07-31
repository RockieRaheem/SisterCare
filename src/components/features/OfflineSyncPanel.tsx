"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  discardQueuedWrite,
  listQueuedWrites,
  OFFLINE_QUEUE_CHANGE_EVENT,
  QueuedWrite,
  retryQueuedWrite,
  syncOfflineQueue,
} from "@/lib/offlineQueue";

export default function OfflineSyncPanel() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<QueuedWrite[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return setEntries([]);
    setEntries(await listQueuedWrites(user.uid).catch(() => []));
  }, [user]);

  useEffect(() => {
    void refresh();
    window.addEventListener(OFFLINE_QUEUE_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(OFFLINE_QUEUE_CHANGE_EVENT, refresh);
  }, [refresh]);

  if (entries.length === 0) return null;
  const conflicts = entries.filter((entry) => entry.status === "conflict");

  return (
    <section
      id="offline-sync"
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20 sm:p-5"
    >
      <h3 className="font-bold text-amber-950 dark:text-amber-100">
        Offline synchronization
      </h3>
      <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-200/80">
        {conflicts.length
          ? "Some saved updates conflict with the server. SisterCare did not overwrite either version."
          : "These updates are safely waiting on this device and will synchronize when a connection is available."}
      </p>
      <div className="mt-4 space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-xl bg-white p-3 dark:bg-card-dark">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-text-primary dark:text-white">
                  {entry.url === "/api/wellbeing" ? "Private wellbeing check-in" : "Saved update"}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                  {entry.status === "conflict"
                    ? entry.conflictMessage || "Needs review"
                    : `Waiting since ${new Date(entry.createdAt).toLocaleString()}`}
                </p>
              </div>
              <div className="flex gap-2">
                {entry.status === "conflict" && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={async () => {
                      if (!user) return;
                      setBusy(entry.id);
                      await retryQueuedWrite(entry.id);
                      await syncOfflineQueue(user.uid);
                      await refresh();
                      setBusy(null);
                    }}
                    className="min-h-10 rounded-lg border border-primary/30 px-3 text-xs font-bold text-primary disabled:opacity-50"
                  >
                    Retry mine
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={async () => {
                    setBusy(entry.id);
                    await discardQueuedWrite(entry.id);
                    await refresh();
                    setBusy(null);
                  }}
                  className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600 disabled:opacity-50 dark:border-red-900"
                >
                  Discard local
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
