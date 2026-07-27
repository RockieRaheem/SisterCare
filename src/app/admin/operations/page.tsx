"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { auth } from "@/lib/firebase";

type MetricDay = Record<string, string | number>;

export default function OperationsDashboardPage() {
  const [days, setDays] = useState<MetricDay[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Authentication required");
      const response = await fetch("/api/admin/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDays(result.data.days);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const latest = days[0] || {};
  const metrics = Object.entries(latest).filter(
    ([key, value]) => key !== "date" && typeof value === "number",
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background-dark">
      <Header variant="app" />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Operations
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Privacy-safe service health and request outcomes.
        </p>
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map(([name, value]) => (
            <div
              key={name}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {name.replaceAll("_", " ")}
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
              <p className="text-xs text-gray-400">{String(latest.date || "Today")}</p>
            </div>
          ))}
        </section>
        {metrics.length === 0 && !error && (
          <p className="rounded-2xl border border-dashed p-8 text-center text-gray-400">
            Metrics will appear after instrumented requests are served.
          </p>
        )}
      </main>
    </div>
  );
}

