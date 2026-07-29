"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";

/** One-time bootstrap for the first administrator. The secret is never stored. */
export default function AdminSetupPage() {
  const { user, loading } = useAuth(); const router = useRouter(); const [secret, setSecret] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [loading, router, user]);
  const activate = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !data.session?.access_token) throw new Error("Your secure session could not be refreshed. Sign out, sign in again, and retry.");
      const token = data.session.access_token;
      const response = await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-admin-bootstrap-secret": secret }, body: JSON.stringify({ email: user?.email, role: "admin" }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Administrator activation failed");
      setSecret(""); setMessage("Administrator access is active. Sign out and back in, then open the admin workspace.");
    } catch (activationError) { setError(activationError instanceof Error ? activationError.message : "Administrator activation failed"); } finally { setSaving(false); }
  };
  if (loading) return <AdminShell><p className="py-20 text-center text-gray-400">Loading...</p></AdminShell>;
  if (!user) return null;
  return <AdminShell><div className="mx-auto w-full max-w-lg"><Link href="/admin" className="text-sm font-semibold text-primary">Back to admin</Link><section className="mt-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-700 dark:bg-card-dark"><span className="material-symbols-outlined text-3xl text-primary">admin_panel_settings</span><h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">Activate the first administrator</h1><p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">Use this only once, for a trusted account. Enter the one-time <code>ADMIN_BOOTSTRAP_SECRET</code> configured on the server. The secret is sent only to the protected role endpoint and is never saved in SisterCare.</p><p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">Signed in as <strong>{user.email}</strong></p><form onSubmit={activate} className="mt-5 space-y-4"><label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Bootstrap secret<input type="password" required value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="off" className="mt-1 w-full rounded-xl border-gray-300 dark:bg-gray-800" /></label><button disabled={saving} className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Activating..." : "Activate administrator account"}</button></form>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}{message && <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">{message}<Link href="/admin" className="ml-2 font-semibold underline">Open admin workspace</Link></div>}</section></div></AdminShell>;
}
