const PRIVATE_STORAGE_PREFIXES = [
  "sistercare-conversations",
  "sistercare-messages-",
  "sistercare-deleted-conversations",
  "sistercare-chat-draft-",
  "sistercare-last-active",
  "sistercare-pinned-",
  "sistercare_notifications",
  "sistercare-notifications-",
  "sistercare-reminder",
  "sistercare-scheduled",
  "sistercare_tts_cache_metadata",
  "sc_dismissed_period_banner",
];

export function isPrivateStorageKey(key: string): boolean {
  return PRIVATE_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export async function clearPrivateClientData(): Promise<void> {
  if (typeof window === "undefined") return;

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key && isPrivateStorageKey(key)) {
      window.localStorage.removeItem(key);
    }
  }

  if ("indexedDB" in window) {
    window.indexedDB.deleteDatabase("SisterCareAudioCache");
    window.indexedDB.deleteDatabase("SisterCareOfflineQueue");
  }

  if ("caches" in window) {
    const keys = await window.caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("sistercare-dynamic-"))
        .map((key) => window.caches.delete(key)),
    );
  }

  navigator.serviceWorker?.controller?.postMessage({
    type: "PURGE_PRIVATE_DATA",
  });
}
