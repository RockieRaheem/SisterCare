"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import AdminShell from "@/components/admin/AdminShell";

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
  liveStatus: "available" | "in_session" | "offline";
  lastHeartbeat: string | null;
}

interface ApplicationRecord {
  id: string;
  name: string;
  title: string;
  legalName: string;
  registrationNumber: string;
  credentialType: string;
  credentialExpiresAt: string | null;
  documentReferences: string[];
}

function liveStatusMeta(status: OperationsRecord["liveStatus"]) {
  if (status === "available") return { label: "Live · available", tone: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300" };
  if (status === "in_session") return { label: "Live · in session", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" };
  return { label: "Offline", tone: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
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
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await authorizedFetch("/api/admin/counsellors");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRecords(result.data.counsellors);
      setApplications(result.data.applications || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load",
      );
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const update = (id: string, changes: Partial<OperationsRecord>) => {
    setRecords((current) =>
      current.map((record) =>
        record.id === id ? { ...record, ...changes } : record,
      ),
    );
  };

  const review = async (application: ApplicationRecord, decision: "approve" | "reject") => {
    setSaving(application.id);
    setError("");
    try {
      const response = await authorizedFetch(`/api/admin/counsellors/${application.id}/review`, {
        method: "POST", body: JSON.stringify({ decision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to review application");
    } finally {
      setSaving(null);
    }
  };

  const openDocument = async (applicationId: string, index: number) => {
    setError("");
    try {
      const response = await authorizedFetch(`/api/admin/counsellors/${applicationId}/documents?index=${index}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open the private document");
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    } catch (documentError) { setError(documentError instanceof Error ? documentError.message : "Could not open the private document"); }
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
    <AdminShell>
        <span className="eyebrow">Care network</span>
        <h1 className="mt-1 text-3xl font-extrabold text-text-primary dark:text-white">
          Counsellor operations
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Verification, capacity, crisis training and shift eligibility. Live status refreshes every 15 seconds and uses the same availability rules as member matching.
        </p>
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {applications.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">KYC applications awaiting review</h2>
            <div className="space-y-3">
              {applications.map((application) => (
                <article key={application.id} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{application.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{application.title} · {application.credentialType}</p>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">Legal name: {application.legalName} · Registration: {application.registrationNumber}</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Credential expiry: {application.credentialExpiresAt?.slice(0, 10) || "Not supplied"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">{application.documentReferences.map((reference, index) => <button key={reference} type="button" onClick={() => openDocument(application.id, index)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary">Open private document {index + 1}</button>)}</div>
                  <div className="mt-4 flex gap-2"><button onClick={() => review(application, "approve")} disabled={saving === application.id} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve KYC</button><button onClick={() => review(application, "reject")} disabled={saving === application.id} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Decline</button></div>
                </article>
              ))}
            </div>
          </section>
        )}
        <div className="space-y-4">
          {records.map((record) => (
            <section
              key={record.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-semibold text-gray-900 dark:text-white">{record.name}</h2><p className="text-xs text-gray-500">{record.title}</p></div>
                <div className="text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${liveStatusMeta(record.liveStatus).tone}`}>{liveStatusMeta(record.liveStatus).label}</span><p className="mt-1 text-[11px] text-gray-500">{record.lastHeartbeat ? `Last signal ${new Date(record.lastHeartbeat).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "No live signal received"}</p></div>
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
    </AdminShell>
  );
}
