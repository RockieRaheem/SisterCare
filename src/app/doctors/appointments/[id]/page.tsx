"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import HelpLink from "@/components/features/HelpLink";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { AppShellSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import type { DoctorAppointment, DoctorPrescription } from "@/types";

type PrivateMessage = { id: string; senderRole: "member" | "doctor"; text: string; createdAt: string };
const labels: Record<DoctorAppointment["status"], string> = { requested: "Waiting for doctor response", booked: "Doctor accepted your request", in_consultation: "Consultation in progress", completed: "Consultation completed", declined: "Doctor unavailable", cancelled: "Request cancelled" };

export default function MemberDoctorAppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [appointment, setAppointment] = useState<DoctorAppointment | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!authLoading && !user) router.replace(`/auth/login?next=/doctors/appointments/${id}`); }, [authLoading, id, router, user]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [appointmentsResponse, prescriptionsResponse] = await Promise.all([authenticatedFetch("/api/doctor-appointments", { cache: "no-store" }), authenticatedFetch("/api/prescriptions", { cache: "no-store" })]);
      const [appointmentsResult, prescriptionsResult] = await Promise.all([appointmentsResponse.json().catch(() => ({})), prescriptionsResponse.json().catch(() => ({}))]);
      if (!appointmentsResponse.ok) throw new Error(appointmentsResult.error || "Medical request could not be loaded");
      const found = (appointmentsResult.data?.appointments || []).find((item: DoctorAppointment) => item.id === id);
      if (!found) throw new Error("This medical request was not found in your account");
      setAppointment(found);
      if (prescriptionsResponse.ok) setPrescriptions((prescriptionsResult.data?.prescriptions || []).filter((item: DoctorPrescription) => item.appointmentId === id));
      if (["booked", "in_consultation", "completed"].includes(found.status)) {
        const response = await authenticatedFetch(`/api/doctor-appointments/${id}/messages`, { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (response.ok) setMessages(result.data?.messages || []);
      } else setMessages([]);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Medical request could not be loaded"); }
    finally { setLoading(false); }
  }, [id, user]);

  useEffect(() => { if (!user) return; void load(); const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 4_000); return () => window.clearInterval(timer); }, [load, user]);

  const send = async (event: FormEvent) => {
    event.preventDefault(); if (!message.trim()) return; setSending(true);
    try {
      const response = await authenticatedFetch(`/api/doctor-appointments/${id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message.trim(), clientMessageId: crypto.randomUUID() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Message could not be sent");
      setMessage(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Message could not be sent"); }
    finally { setSending(false); }
  };

  if (authLoading || loading) return <AppShellSkeleton variant="chat" />;
  const connected = appointment && ["booked", "in_consultation", "completed"].includes(appointment.status);

  return <div className="app-page overflow-x-clip"><Header variant="app" /><main className="main-content page-container py-5 sm:py-7">
    <Link href="/doctors" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Doctors</Link>
    {error && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
    {!appointment ? <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><h1 className="font-extrabold">Medical request unavailable</h1><p className="mt-2 text-sm text-slate-500">It may have been removed or does not belong to this account.</p></section> : <>
      <section className="rounded-[24px] border border-primary/15 bg-white p-5 shadow-soft dark:bg-card-dark sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${appointment.status === "in_consultation" ? "bg-emerald-100 text-emerald-800" : appointment.status === "declined" ? "bg-red-100 text-red-800" : "bg-primary/10 text-primary"}`}>{labels[appointment.status]}</span><h1 className="mt-3 text-2xl font-black sm:text-3xl">{appointment.doctorName || "Verified doctor matching"}</h1><p className="mt-2 text-sm text-text-secondary dark:text-gray-300">{appointment.specialty} · Requested {new Date(appointment.requestedAt).toLocaleString()}</p></div><span className="inline-flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-sm font-bold text-primary"><span className="material-symbols-outlined" aria-hidden="true">verified_user</span>Verified care</span></div>
        {appointment.status === "requested" && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">Your request was sent, but a doctor has not accepted it yet. You are not connected. Do not wait here if symptoms are severe or rapidly worsening.</p>}
        {appointment.status === "declined" && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-900">This doctor could not take the request. Return to the directory to request another verified doctor.</p>}
      </section>
      <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-950 dark:border-red-900 dark:bg-red-950/20 dark:text-red-100"><strong>Emergency warning:</strong> severe bleeding, fainting, breathing difficulty, poisoning, severe worsening pain or immediate danger needs urgent in-person care. <HelpLink className="font-bold underline">Open urgent help</HelpLink>.</section>

      {connected && <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="flex min-h-[520px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-card-dark"><div className="border-b border-slate-200 p-4 dark:border-slate-800"><h2 className="font-extrabold">Private consultation</h2><p className="mt-1 text-xs text-slate-500">Only you and the assigned doctor can read these messages.</p></div><div aria-live="polite" className="min-h-64 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">{messages.map((item) => <div key={item.id} className={`flex ${item.senderRole === "member" ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.senderRole === "member" ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800"}`}><p className="whitespace-pre-wrap break-words">{item.text}</p><p className={`mt-1 text-[10px] ${item.senderRole === "member" ? "text-white/70" : "text-slate-400"}`}>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div></div>)}{!messages.length && <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-900">The doctor accepted. You can send the first message when ready.</p>}</div>{appointment.status !== "completed" && <form onSubmit={send} className="border-t border-slate-200 p-4 dark:border-slate-800"><label htmlFor="member-doctor-message" className="sr-only">Message your doctor</label><div className="flex gap-2"><textarea id="member-doctor-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={2} placeholder="Write a private message" className="min-w-0 flex-1 resize-none rounded-xl border-slate-300 text-base dark:border-slate-700 dark:bg-slate-900" /><button disabled={!message.trim() || sending} className="min-h-12 self-end rounded-xl bg-primary px-4 font-bold text-white disabled:opacity-50">Send</button></div></form>}</section>
        <aside className="space-y-4"><section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-card-dark"><h2 className="font-extrabold">Prescription record</h2><p className="mt-1 text-xs leading-5 text-slate-500">Only a verified doctor can issue one after assessment. Never share it with another person.</p>{prescriptions.length ? <div className="mt-4 space-y-3">{prescriptions.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${item.status === "voided" ? "border-red-300 bg-red-50 text-red-950" : "border-primary/15 bg-primary/5"}`}><div className="flex items-center justify-between gap-2"><h3 className="font-extrabold">{item.medicineName} {item.strength}</h3><span className={`text-xs font-bold uppercase ${item.status === "voided" ? "text-red-700" : "text-emerald-700"}`}>{item.status}</span></div>{item.status === "voided" && <p className="mt-3 rounded-lg bg-white/70 p-3 text-xs leading-5"><strong>Do not continue this prescription.</strong> {item.voidReason || "Contact the issuing doctor or a pharmacist for the updated plan."}</p>}<dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-500">Dose</dt><dd className="font-bold">{item.dose}</dd></div><div><dt className="text-slate-500">Route</dt><dd className="font-bold">{item.route}</dd></div><div><dt className="text-slate-500">Frequency</dt><dd className="font-bold">{item.frequency}</dd></div><div><dt className="text-slate-500">Duration</dt><dd className="font-bold">{item.duration}</dd></div><div><dt className="text-slate-500">Quantity</dt><dd className="font-bold">{item.quantity}</dd></div></dl>{item.instructions && <p className="mt-3 border-t border-primary/10 pt-3 text-xs leading-5">{item.instructions}</p>}<p className="mt-3 text-[10px] text-slate-500">Issued {new Date(item.issuedAt).toLocaleString()}</p></article>)}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">No prescription has been issued for this consultation.</p>}</section><section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 dark:border-slate-800 dark:bg-card-dark"><h2 className="font-extrabold">Before taking medicine</h2><p className="mt-2 text-slate-600 dark:text-slate-300">Confirm anything you do not understand with the issuing doctor or a pharmacist. Seek urgent help for severe reactions, breathing difficulty or fainting.</p></section></aside>
      </div>}
    </>}
  </main></div>;
}
