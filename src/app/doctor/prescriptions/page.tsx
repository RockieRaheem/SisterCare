"use client";

import { useCallback, useEffect, useState } from "react";
import DoctorShell from "@/components/doctor/DoctorShell";
import { OperationsEmptyState, OperationsPageHeader, OperationsSkeleton, StatusBadge } from "@/components/operations/OperationsUI";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import type { DoctorPrescription } from "@/types";

export default function DoctorPrescriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<DoctorPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await authenticatedFetch("/api/doctor/prescriptions", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Prescription records could not be loaded");
      setRecords(result.data?.prescriptions || []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Prescription records could not be loaded");
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (!authLoading && user) void load(); }, [authLoading, load, user]);

  return <DoctorShell>
    <OperationsPageHeader eyebrow="Clinical records" title="Prescriptions" description="Read-only history of prescriptions you issued after assigned consultations." />
    {error && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
    {loading ? <div className="mt-6"><OperationsSkeleton rows={4} /></div> : records.length === 0 ? <div className="mt-6"><OperationsEmptyState icon="prescriptions" title="No prescriptions issued" description="Prescriptions created after clinical assessments will appear here." /></div> : <div className="mt-6 space-y-3">{records.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922]"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold">{item.medicineName} {item.strength}</h2><StatusBadge tone={item.status === "issued" ? "success" : "neutral"}>{item.status}</StatusBadge></div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.dose} · {item.route} · {item.frequency} · {item.duration}</p><p className="mt-1 text-xs text-slate-500">Quantity: {item.quantity} · Member ref {item.memberId.slice(0, 8)}</p>{item.instructions && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">{item.instructions}</p>}</div><time className="text-xs text-slate-400">{new Date(item.issuedAt).toLocaleString()}</time></div></article>)}</div>}
  </DoctorShell>;
}
