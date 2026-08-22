"use client";

import { authenticatedFetch } from "./authenticatedFetch";

const DATABASE = "SisterCareOfflineQueue";
const STORE = "writes";
const EVENT = "sistercare-offline-queue-change";

export interface QueuedWrite {
  id: string;
  userId: string;
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  idempotencyKey: string;
  createdAt: string;
  status: "pending" | "conflict";
  conflictMessage?: string;
}

export type QueuedWriteReason = "offline" | "connection" | "service";

export function shouldQueueResponseStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

export function queuedWriteMessage(reason: QueuedWriteReason): string {
  if (reason === "offline") {
    return "Saved on this device. It will sync automatically when your connection returns.";
  }
  if (reason === "connection") {
    return "Saved on this device because SisterCare could not reach the service. It will retry automatically.";
  }
  return "Saved safely on this device while SisterCare reconnects. Automatic retry is in progress.";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("userId", "userId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => database.close();
    tx.onerror = () => reject(tx.error);
  });
}

function notifyQueueChanged() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export async function listQueuedWrites(userId: string): Promise<QueuedWrite[]> {
  const entries = await transaction("readonly", (store) =>
    store.index("userId").getAll(userId),
  );
  return entries.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

async function putQueuedWrite(entry: QueuedWrite): Promise<void> {
  await transaction("readwrite", (store) => store.put(entry));
  notifyQueueChanged();
}

async function deleteQueuedWrite(id: string): Promise<void> {
  await transaction("readwrite", (store) => store.delete(id));
  notifyQueueChanged();
}

export async function discardQueuedWrite(id: string): Promise<void> {
  await deleteQueuedWrite(id);
}

export async function retryQueuedWrite(id: string): Promise<void> {
  const entry = await transaction("readonly", (store) => store.get(id));
  if (!entry) return;
  await putQueuedWrite({
    ...entry,
    status: "pending",
    conflictMessage: undefined,
  });
}

async function parsePayload(response: Response): Promise<Record<string, unknown>> {
  return response.json().catch(() => ({}));
}

export async function submitOfflineCapableWrite(params: {
  userId: string;
  url: string;
  method?: QueuedWrite["method"];
  body?: unknown;
}): Promise<
  | { state: "synced"; payload: Record<string, unknown> }
  | { state: "queued"; localId: string; reason: QueuedWriteReason }
> {
  const id = crypto.randomUUID();
  const entry: QueuedWrite = {
    id,
    userId: params.userId,
    url: params.url,
    method: params.method || "POST",
    body: params.body,
    idempotencyKey: id,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  let queueReason: QueuedWriteReason = navigator.onLine ? "connection" : "offline";
  if (navigator.onLine) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
      const response = await authenticatedFetch(entry.url, {
        method: entry.method,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": entry.idempotencyKey,
        },
        body: entry.body === undefined ? undefined : JSON.stringify(entry.body),
      });
      const payload = await parsePayload(response);
      if (response.ok) return { state: "synced", payload };
      if (!shouldQueueResponseStatus(response.status)) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : `The update was rejected (${response.status}).`,
        );
      }
        queueReason = "service";
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          continue;
        }
      } catch (error) {
        if (
          error instanceof Error &&
          !/fetch|network|offline|load failed/i.test(error.message)
        ) {
          throw error;
        }
        queueReason = navigator.onLine ? "connection" : "offline";
        break;
      }
      break;
    }
  }

  await putQueuedWrite(entry);
  return { state: "queued", localId: id, reason: queueReason };
}

export async function syncOfflineQueue(userId: string): Promise<{
  synced: number;
  conflicts: number;
  pending: number;
}> {
  if (!navigator.onLine) {
    const entries = await listQueuedWrites(userId);
    return {
      synced: 0,
      conflicts: entries.filter((entry) => entry.status === "conflict").length,
      pending: entries.filter((entry) => entry.status === "pending").length,
    };
  }

  let synced = 0;
  for (const entry of await listQueuedWrites(userId)) {
    if (entry.status === "conflict") continue;
    try {
      const response = await authenticatedFetch(entry.url, {
        method: entry.method,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": entry.idempotencyKey,
        },
        body: entry.body === undefined ? undefined : JSON.stringify(entry.body),
      });
      if (response.ok) {
        await deleteQueuedWrite(entry.id);
        synced += 1;
        continue;
      }
      const payload = await parsePayload(response);
      if (response.status === 409) {
        await putQueuedWrite({
          ...entry,
          status: "conflict",
          conflictMessage:
            typeof payload.error === "string"
              ? payload.error
              : "This update conflicts with a newer server change.",
        });
      } else if (!shouldQueueResponseStatus(response.status)) {
        await putQueuedWrite({
          ...entry,
          status: "conflict",
          conflictMessage:
            typeof payload.error === "string"
              ? payload.error
              : `The server rejected this update (${response.status}).`,
        });
      }
    } catch {
      break;
    }
  }

  const remaining = await listQueuedWrites(userId);
  return {
    synced,
    conflicts: remaining.filter((entry) => entry.status === "conflict").length,
    pending: remaining.filter((entry) => entry.status === "pending").length,
  };
}

export const OFFLINE_QUEUE_CHANGE_EVENT = EVENT;
