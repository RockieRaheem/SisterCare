"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { auth } from "@/lib/authClient";
import { readApiResponse } from "@/lib/apiResponse";

interface Incident {
  id: string;
  type: string;
  severity: string;
  status: "open" | "acknowledged" | "resolved";
  sessionId: string;
  waitingSecondsAtOpen: number;
  openedAt: string | null;
  resolutionNote: string;
}

async function callIncidents(init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Authentication required");
  return fetch("/api/admin/incidents", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await callIncidents();
      const result = await readApiResponse<any>(response);
      if (!response.ok) throw new Error(result.error);
      setIncidents(result.data.incidents);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const transition = async (
    incident: Incident,
    to: "acknowledged" | "resolved",
  ) => {
    let resolutionNote = "";
    if (to === "resolved") {
      resolutionNote =
        window.prompt("Resolution note (required for the audit trail)") || "";
      if (!resolutionNote.trim()) return;
    }
    setBusy(incident.id);
    try {
      const response = await callIncidents({
        method: "PATCH",
        body: JSON.stringify({ incidentId: incident.id, to, resolutionNote }),
      });
      const result = await readApiResponse<any>(response);
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (transitionError) {
      setError(
        transitionError instanceof Error
          ? transitionError.message
          : "Update failed",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell>
        <span className="eyebrow">Safety operations</span>
        <h1 className="mt-1 text-3xl font-extrabold text-text-primary dark:text-white">
          Incident response
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Crisis SLA breaches requiring accountable human action.
        </p>
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
        <div className="space-y-3">
          {incidents.map((incident) => (
            <section
              key={incident.id}
              className="rounded-2xl border border-red-200 bg-white p-5 dark:border-red-900 dark:bg-card-dark"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold uppercase text-red-700">
                    {incident.status}
                  </span>
                  <h2 className="mt-2 font-semibold text-gray-900 dark:text-white">
                    Crisis response SLA breach
                  </h2>
                  <p className="text-sm text-gray-500">
                    Waiting at open: {incident.waitingSecondsAtOpen}s · Session {incident.sessionId}
                  </p>
                </div>
                {incident.status === "open" ? (
                  <button
                    onClick={() => transition(incident, "acknowledged")}
                    disabled={busy === incident.id}
                    className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Acknowledge
                  </button>
                ) : incident.status === "acknowledged" ? (
                  <button
                    onClick={() => transition(incident, "resolved")}
                    disabled={busy === incident.id}
                    className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Resolve
                  </button>
                ) : null}
              </div>
              {incident.resolutionNote && (
                <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {incident.resolutionNote}
                </p>
              )}
            </section>
          ))}
          {incidents.length === 0 && !error && (
            <p className="rounded-2xl border border-dashed p-8 text-center text-gray-400">
              No incidents recorded.
            </p>
          )}
        </div>
    </AdminShell>
  );
}
