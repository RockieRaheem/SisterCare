/**
 * TTS Audio Cache Manager
 * Caches generated audio to reduce API costs and improve response times
 * Uses IndexedDB for audio blob storage with fallback to localStorage for metadata
 */

interface CachedAudio {
  id: string;
  text: string;
  language: string;
  audioBlob: Blob;
  createdAt: number;
  expiresAt: number;
  hash: string;
}

interface CacheEntry {
  hash: string;
  text: string;
  language: string;
  durationSeconds: number;
  createdAt: number;
  expiresAt: number;
}

const CACHE_DURATION_DAYS = 30;
const INDEXEDDB_NAME = "SisterCareAudioCache";
const INDEXEDDB_STORE = "ttsAudio";
const CACHE_METADATA_KEY = "sistercare_tts_cache_metadata";

/**
 * Generate hash for text + language combination
 */
function generateHash(text: string, language: string): string {
  const combined = `${text}|${language}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Initialize IndexedDB for audio storage
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXEDDB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(INDEXEDDB_STORE)) {
        db.createObjectStore(INDEXEDDB_STORE, { keyPath: "hash" });
      }
    };
  });
}

/**
 * Check if audio is cached and valid
 */
export async function getCachedAudio(
  text: string,
  language: string,
): Promise<Blob | null> {
  if (typeof window === "undefined") return null;

  try {
    const hash = generateHash(text, language);

    // Check metadata in localStorage first
    const metadata = getLocalMetadata();
    const entry = metadata[hash];

    if (!entry || Date.now() > entry.expiresAt) {
      // Cache expired, remove it
      if (entry) {
        deleteCacheEntry(hash);
      }
      return null;
    }

    // Try to get audio blob from IndexedDB
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([INDEXEDDB_STORE], "readonly");
        const store = transaction.objectStore(INDEXEDDB_STORE);
        const request = store.get(hash);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const cached = request.result;
          if (cached?.audioBlob) {
            resolve(cached.audioBlob);
          } else {
            resolve(null);
          }
        };
      });
    } catch (indexedDBError) {
      console.warn(
        "IndexedDB unavailable, skipping cache retrieval:",
        indexedDBError,
      );
      return null;
    }
  } catch (error) {
    console.warn("Error checking cache:", error);
    return null;
  }
}

/**
 * Store audio in cache
 */
export async function cacheAudio(
  text: string,
  language: string,
  audioBlob: Blob,
  durationSeconds: number,
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const hash = generateHash(text, language);
    const now = Date.now();
    const expiresAt = now + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000;

    // Save to IndexedDB
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([INDEXEDDB_STORE], "readwrite");
        const store = transaction.objectStore(INDEXEDDB_STORE);
        const request = store.put({
          hash,
          text,
          language,
          audioBlob,
          createdAt: now,
          expiresAt,
        });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          // Also save metadata to localStorage for quick lookup
          const metadata = getLocalMetadata();
          metadata[hash] = {
            hash,
            text,
            language,
            durationSeconds,
            createdAt: now,
            expiresAt,
          };
          setLocalMetadata(metadata);
          resolve();
        };
      });
    } catch (indexedDBError) {
      console.warn(
        "IndexedDB unavailable, caching to localStorage metadata only:",
        indexedDBError,
      );
      // Still save metadata so we know cache would exist
      const metadata = getLocalMetadata();
      metadata[hash] = {
        hash,
        text,
        language,
        durationSeconds,
        createdAt: now,
        expiresAt,
      };
      setLocalMetadata(metadata);
    }
  } catch (error) {
    console.warn("Error caching audio:", error);
  }
}

/**
 * Get cache metadata from localStorage
 */
function getLocalMetadata(): Record<string, CacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(CACHE_METADATA_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Set cache metadata in localStorage
 */
function setLocalMetadata(metadata: Record<string, CacheEntry>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.warn("Error saving cache metadata:", error);
  }
}

/**
 * Delete a specific cache entry
 */
async function deleteCacheEntry(hash: string): Promise<void> {
  // Remove from localStorage
  const metadata = getLocalMetadata();
  delete metadata[hash];
  setLocalMetadata(metadata);

  // Remove from IndexedDB
  if (typeof window !== "undefined") {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([INDEXEDDB_STORE], "readwrite");
        const store = transaction.objectStore(INDEXEDDB_STORE);
        const request = store.delete(hash);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn("Error deleting from IndexedDB:", error);
    }
  }
}

/**
 * Clear all expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const metadata = getLocalMetadata();
    const now = Date.now();
    const expired = Object.keys(metadata).filter(
      (hash) => now > metadata[hash].expiresAt,
    );

    for (const hash of expired) {
      await deleteCacheEntry(hash);
    }

    console.log(`Cleared ${expired.length} expired cache entries`);
  } catch (error) {
    console.warn("Error clearing expired cache:", error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  expiredEntries: number;
  validEntries: number;
} {
  const metadata = getLocalMetadata();
  const now = Date.now();
  const entries = Object.values(metadata);

  const expired = entries.filter((entry) => now > entry.expiresAt).length;
  const valid = entries.length - expired;

  return {
    totalEntries: entries.length,
    expiredEntries: expired,
    validEntries: valid,
  };
}

/**
 * Create audio URL from cached blob
 */
export function createAudioUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke audio URL to free memory
 */
export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url);
}
