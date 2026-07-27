"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import Header from "@/components/layout/Header";

interface OperationsRecord {
  id: string;
  name: string;
  title: string;
  verificationStatus: "pending" | "verified" | "suspended" | "expired";
  credentialExpiresAt: string | null;
  maxConcurrentSessions: number;
  acceptingNewSessions: boolean;
  crisisTrained: boolean;
  supervisorId: string;
  availableHours: { start: string; end: string; days: string[] };
}

async function authorizedFetch(url: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Authentication required");
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

export default function CounsellorOperationsPage() {
  const [records, setRecords] = useState<OperationsRecord[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await authorizedFetch("/api/admin/counsellors");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRecords(result.data.counsellors);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load",
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (id: string, changes: Partial<OperationsRecord>) => {
    setRecords((current) =>
      current.map((record) =>
        record.id === id ? { ...record, ...changes } : record,
      ),
    );
  };

  const save = async (record: OperationsRecord) => {
    setSaving(record.id);
    setError("");
    try {
      const response = await authorizedFetch(
        `/api/admin/counsellors/${record.id}/operations`,
        { method: "PATCH", body: JSON.stringify(record) },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save",
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="app-page">
      <Header variant="app" />
      <main className="main-content page-container pt-8">
        <span className="eyebrow">Care network</span>
        <h1 className="mt-1 text-3xl font-extrabold text-text-primary dark:text-white">
          Counsellor operations
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Verification, capacity, crisis training and shift eligibility.
        </p>
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-4">
          {records.map((record) => (
            <section
              key={record.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark"
            >
              <div className="mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {record.name}
                </h2>
                <p className="text-xs text-gray-500">{record.title}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Verification
                  <select
                    value={record.verificationStatus}
                    onChange={(event) =>
                      update(record.id, {
                        verificationStatus: event.target
                          .value as OperationsRecord["verificationStatus"],
                      })
                    }
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm dark:bg-gray-800"
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="suspended">Suspended</option>
                    <option value="expired">Expired</option>
                  </select>
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Credential expiry
                  <input
                    type="date"
                    value={record.credentialExpiresAt?.slice(0, 10) || ""}
                    onChange={(event) =>
                      update(record.id, {
                        credentialExpiresAt: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm dark:bg-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Maximum active sessions
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={record.maxConcurrentSessions}
                    onChange={(event) =>
                      update(record.id, {
                        maxConcurrentSessions: Number(event.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm dark:bg-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Supervisor UID
                  <input
                    value={record.supervisorId}
                    onChange={(event) =>
                      update(record.id, { supervisorId: event.target.value })
                    }
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm dark:bg-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Shift start
                  <input
                    type="time"
                    value={record.availableHours.start}
                    onChange={(event) =>
                      update(record.id, {
                        availableHours: {
                          ...record.availableHours,
                          start: event.target.value,
                        },
                      })
                    }
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm dark:bg-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Shift end
                  <input
                    type="time"
                    value={record.availableHours.end}
                    onChange={(event) =>
                      update(record.id, {
                        availableHours: {
                          ...record.availableHours,
                          end: event.target.value,
                        },
                      })
                    }
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm dark:bg-gray-800"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <label>
                  <input
                    type="checkbox"
                    checked={record.acceptingNewSessions}
                    onChange={(event) =>
                      update(record.id, {
                        acceptingNewSessions: event.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Accepting sessions
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={record.crisisTrained}
                    onChange={(event) =>
                      update(record.id, {
                        crisisTrained: event.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Crisis trained
                </label>
              </div>
              <button
                onClick={() => save(record)}
                disabled={saving === record.id}
                className="mt-5 rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving === record.id ? "Saving…" : "Save operations"}
              </button>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
