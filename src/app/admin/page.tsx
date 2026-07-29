"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/authClient";

type Overview = {
  counts: { members: number; counsellors: number; available: number; inSession: number; pendingKyc: number; liveSessions: number; waiting: number; openIncidents: number };
  applications: Array<{ id: string; name: string; title: string }>;
};

async function adminFetch(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Authentication required");
  return fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } });
}

const sections = [
  { href: "/admin/counsellors", icon: "verified_user", title: "Counsellor verification", description: "Review KYC, credentials, capacity and shift eligibility." },
  { href: "/admin/crisis", icon: "emergency", title: "Crisis monitor", description: "Watch urgent care requests and time-to-human targets." },
  { href: "/admin/incidents", icon: "assignment_late", title: "Incident response", description: "Acknowledge and resolve operational safety incidents." },
  { href: "/admin/operations", icon: "monitoring", title: "Service health", description: "Review privacy-safe usage and reliability metrics." },
  { href: "/admin/articles", icon: "edit_note", title: "Library review", description: "Review and publish counsellor health articles." },
];

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountRole, setAccountRole] = useState<"admin" | "user">("admin");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!loading && !user) { router.replace("/auth/login"); return; }
    if (user) auth.currentUser?.getIdTokenResult().then((result) => setIsAdmin(result.claims.role === "admin")).catch(() => setIsAdmin(false));
  }, [loading, router, user]);

  const load = useCallback(async () => {
    try {
      const response = await adminFetch("/api/admin/overview");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load the admin overview");
      setOverview(result.data); setError("");
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load the admin overview"); }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    load(); const interval = setInterval(load, 30_000); return () => clearInterval(interval);
  }, [isAdmin, load]);

  const assignRole = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setNotice(""); setError("");
    try {
      const response = await adminFetch("/api/admin/roles", { method: "POST", body: JSON.stringify({ email: accountEmail.trim(), role: accountRole }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Role assignment failed");
      setNotice(`${accountEmail.trim()} is now assigned the ${accountRole} role. They should sign out and back in.`); setAccountEmail("");
    } catch (assignmentError) { setError(assignmentError instanceof Error ? assignmentError.message : "Role assignment failed"); } finally { setSaving(false); }
  };

  if (loading || isAdmin === null) return <Shell><p className="py-20 text-center text-gray-400">Loading secure workspace…</p></Shell>;
  if (!isAdmin) return <Shell><div className="mx-auto max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-soft dark:border-gray-700 dark:bg-card-dark"><span className="material-symbols-outlined text-4xl text-primary">admin_panel_settings</span><h1 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">Administrator access required</h1><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">This workspace is restricted to authorised SisterCare administrators. Ask an existing administrator to add your signed-in account.</p><Link href="/admin/setup" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Activate first administrator</Link></div></Shell>;

  const counts = overview?.counts;
  const statCards = [
    ["Pending KYC", counts?.pendingKyc ?? 0, "verified_user", "text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300"],
    ["Available counsellors", counts?.available ?? 0, "support_agent", "text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-300"],
    ["Members waiting", counts?.waiting ?? 0, "schedule", "text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300"],
    ["Open incidents", counts?.openIncidents ?? 0, "warning", "text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300"],
  ] as const;

  return <Shell><div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow">Secure administration</span><h1 className="mt-1 text-3xl font-extrabold text-text-primary dark:text-white">Care operations</h1><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">A real-time view of the care network. Refreshes every 30 seconds.</p></div><button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 dark:border-gray-600 dark:bg-card-dark dark:text-white"><span className="material-symbols-outlined text-lg">refresh</span>Refresh</button></div>{error && <p className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{statCards.map(([label, value, icon, tone]) => <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark"><div className={`inline-flex rounded-xl p-2 ${tone}`}><span className="material-symbols-outlined">{icon}</span></div><p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{value}</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p></div>)}</section><section className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.85fr]"><div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark"><div className="flex items-center justify-between"><div><h2 className="font-bold text-gray-900 dark:text-white">KYC review queue</h2><p className="mt-1 text-sm text-gray-500">Profiles do not become visible or assignable until you approve them.</p></div><Link href="/admin/counsellors" className="text-sm font-semibold text-primary">Open verification</Link></div><div className="mt-4 space-y-3">{overview?.applications.length ? overview.applications.map((application) => <Link key={application.id} href="/admin/counsellors" className="flex items-center justify-between rounded-2xl bg-amber-50 p-4 transition hover:bg-amber-100 dark:bg-amber-950/25 dark:hover:bg-amber-950/40"><div><p className="font-semibold text-gray-900 dark:text-white">{application.name}</p><p className="text-xs text-gray-600 dark:text-gray-300">{application.title}</p></div><span className="material-symbols-outlined text-amber-700">chevron_right</span></Link>) : <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700">No KYC applications are waiting for review.</p>}</div></div><div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark"><h2 className="font-bold text-gray-900 dark:text-white">Network snapshot</h2><dl className="mt-4 space-y-3 text-sm"><Row label="Registered members" value={counts?.members ?? 0} /><Row label="Verified counsellors" value={counts?.counsellors ?? 0} /><Row label="Counsellors in session" value={counts?.inSession ?? 0} /><Row label="Live care sessions" value={counts?.liveSessions ?? 0} /></dl></div></section><section className="mt-6 grid gap-3 sm:grid-cols-2">{sections.map((section) => <Link key={section.href} href={section.href} className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft dark:border-gray-700 dark:bg-card-dark"><span className="material-symbols-outlined text-2xl text-primary">{section.icon}</span><h2 className="mt-3 font-bold text-gray-900 dark:text-white">{section.title}</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{section.description}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Open <span className="material-symbols-outlined text-base transition group-hover:translate-x-0.5">arrow_forward</span></span></Link>)}</section><section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark"><div><h2 className="font-bold text-gray-900 dark:text-white">Admin account access</h2><p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">Grant access only to a known account that has already signed up. This changes a Firebase custom claim; the person must sign out and back in before access takes effect.</p></div><form onSubmit={assignRole} className="mt-4 flex flex-col gap-3 sm:flex-row"><input type="email" required value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="Existing account email" className="min-w-0 flex-1 rounded-xl border-gray-300 dark:bg-gray-800" /><select value={accountRole} onChange={(event) => setAccountRole(event.target.value as "admin" | "user")} className="rounded-xl border-gray-300 dark:bg-gray-800"><option value="admin">Administrator</option><option value="user">Remove admin access</option></select><button disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Updating…" : "Update access"}</button></form>{notice && <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">{notice}</p>}</section></Shell>;
}

function Row({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between"><dt className="text-gray-500 dark:text-gray-400">{label}</dt><dd className="font-bold text-gray-900 dark:text-white">{value}</dd></div>; }
function Shell({ children }: { children: React.ReactNode }) { return <AdminShell>{children}</AdminShell>; }
