"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import DoctorShell from "@/components/doctor/DoctorShell";
import { OperationsEmptyState, OperationsNotice, OperationsPageHeader, OperationsSkeleton, OperationsStat, StatusBadge } from "@/components/operations/OperationsUI";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import type { DoctorAppointment } from "@/types";

const REFRESH_MS = 8_000;
const HEARTBEAT_MS = 60_000;
type Presence = "available" | "busy" | "offline";
type PrivateMessage = { id: string; senderRole: "member" | "doctor"; text: string; createdAt: string };
const emptyDraft = { medicineName: "", strength: "", dose: "", route: "", frequency: "", duration: "", quantity: "", instructions: "", clinicalAttestation: false };

function appointmentDates(item: DoctorAppointment): DoctorAppointment {
  return { ...item, requestedAt: new Date(item.requestedAt), scheduledFor: item.scheduledFor ? new Date(item.scheduledFor) : undefined, respondedAt: item.respondedAt ? new Date(item.respondedAt) : undefined, consultationStartedAt: item.consultationStartedAt ? new Date(item.consultationStartedAt) : undefined, completedAt: item.completedAt ? new Date(item.completedAt) : undefined };
}

function statusLabel(value: DoctorAppointment["status"]) {
  return { requested: "Needs response", booked: "Accepted", in_consultation: "In consultation", completed: "Completed", declined: "Declined", cancelled: "Cancelled" }[value];
}

export default function DoctorPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [presence, setPresence] = useState<Presence>("offline");
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const response = await authenticatedFetch("/api/doctor/appointments", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Clinical requests could not be loaded");
      const next = (result.data?.appointments || []).map(appointmentDates);
      setAppointments(next);
      setSelectedId((current) => {
        if (current && next.some((item: DoctorAppointment) => item.id === current)) return current;
        const linked = new URLSearchParams(window.location.search).get("appointment");
        return next.find((item: DoctorAppointment) => item.id === linked)?.id || next.find((item: DoctorAppointment) => ["in_consultation", "booked", "requested"].includes(item.status))?.id || next[0]?.id || "";
      });
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Clinical desk unavailable");
    } finally { setLoading(false); }
  }, [user]);

  const selected = useMemo(() => appointments.find((item) => item.id === selectedId), [appointments, selectedId]);

  const loadMessages = useCallback(async () => {
    if (!selected || !["booked", "in_consultation", "completed"].includes(selected.status)) { setMessages([]); return; }
    const response = await authenticatedFetch(`/api/doctor-appointments/${selected.id}/messages`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (response.ok) setMessages(result.data?.messages || []);
  }, [selected]);

  useEffect(() => { if (!authLoading && user) void refresh(); }, [authLoading, refresh, user]);
  useEffect(() => { if (!user) return; const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, REFRESH_MS); return () => window.clearInterval(timer); }, [refresh, user]);
  useEffect(() => { void loadMessages(); if (!selected) return; const timer = window.setInterval(() => { if (document.visibilityState === "visible") void loadMessages(); }, 4_000); return () => window.clearInterval(timer); }, [loadMessages, selected]);
  useEffect(() => {
    if (!user || presence === "offline") return;
    heartbeat.current = setInterval(async () => {
      try {
        const response = await authenticatedFetch("/api/doctor/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "available" }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error();
        setPresence(result.data?.status || "available");
      } catch { setPresence("offline"); setError("Your live availability signal stopped. Go available again after reconnecting."); }
    }, HEARTBEAT_MS);
    return () => { if (heartbeat.current) clearInterval(heartbeat.current); };
  }, [presence, user]);

  const setAvailability = async (status: "available" | "offline") => {
    setBusy(`presence-${status}`); setError("");
    try {
      const response = await authenticatedFetch("/api/doctor/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Availability update failed");
      setPresence(result.data?.status || status);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Availability update failed"); }
    finally { setBusy(""); }
  };

  const transition = async (to: "booked" | "in_consultation" | "completed" | "declined") => {
    if (!selected) return;
    setBusy(to); setError(""); setNotice("");
    try {
      const response = await authenticatedFetch("/api/doctor/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointmentId: selected.id, to }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Appointment update failed");
      if (to === "in_consultation") setPresence("busy");
      setNotice(to === "booked" ? "The member was notified that you accepted." : to === "declined" ? "The member was notified that you are unavailable." : to === "in_consultation" ? "Consultation started. Assess before prescribing." : "Consultation completed.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Appointment update failed"); }
    finally { setBusy(""); }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || !message.trim()) return; setBusy("message");
    try {
      const response = await authenticatedFetch(`/api/doctor-appointments/${selected.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message.trim(), clientMessageId: crypto.randomUUID() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Message could not be sent");
      setMessage(""); await loadMessages();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Message could not be sent"); }
    finally { setBusy(""); }
  };

  const prescribe = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return; setBusy("prescription"); setError("");
    try {
      const response = await authenticatedFetch("/api/doctor/prescriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointmentId: selected.id, ...draft }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Prescription could not be issued");
      setDraft(emptyDraft); setNotice("Prescription issued and recorded in the clinical audit trail.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Prescription could not be issued"); }
    finally { setBusy(""); }
  };

  if (authLoading || loading) return <DoctorShell><OperationsSkeleton rows={5} /></DoctorShell>;
  const active = appointments.filter((item) => ["requested", "booked", "in_consultation"].includes(item.status));
  const urgent = active.filter((item) => item.urgency !== "routine");

  return <DoctorShell>
    <OperationsPageHeader eyebrow="Clinical care" title="Doctor clinical desk" description="Accept only cases you can assess promptly. SisterCare never authorises the AI to diagnose or prescribe." />
    {(error || notice) && <div className="mt-5"><OperationsNotice tone={error ? "danger" : "success"} title={error ? "Action needed" : "Update saved"}>{error || notice}</OperationsNotice></div>}
    {urgent.length > 0 && <div className="mt-5"><OperationsNotice tone="danger" title={`${urgent.length} urgent medical ${urgent.length === 1 ? "request needs" : "requests need"} review`}>Online consultation must not delay emergency in-person care.</OperationsNotice></div>}
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><OperationsStat label="Awaiting response" value={appointments.filter((item) => item.status === "requested").length} icon="notification_important" tone="warning" /><OperationsStat label="In consultation" value={appointments.filter((item) => item.status === "in_consultation").length} icon="stethoscope" tone="success" /><OperationsStat label="Completed" value={appointments.filter((item) => item.status === "completed").length} icon="task_alt" /></div>

    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922]"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h2 className="font-extrabold">Clinical availability</h2><StatusBadge tone={presence === "available" ? "success" : presence === "busy" ? "warning" : "neutral"} dot>{presence === "available" ? "Available" : presence === "busy" ? "In consultation" : "Offline"}</StatusBadge></div><p className="mt-1 text-sm text-slate-500">Your public availability expires automatically without a live heartbeat.</p></div><div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"><button type="button" disabled={Boolean(busy) || presence === "busy"} onClick={() => void setAvailability("available")} className={`min-h-11 rounded-lg px-4 text-sm font-bold ${presence === "available" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700" : "text-slate-500"}`}>Available</button><button type="button" disabled={Boolean(busy) || presence === "busy"} onClick={() => void setAvailability("offline")} className={`min-h-11 rounded-lg px-4 text-sm font-bold ${presence === "offline" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}>Offline</button></div></div></section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
      <section><div className="mb-3 flex items-center justify-between"><div><h2 className="font-extrabold">Clinical queue</h2><p className="mt-1 text-xs text-slate-500">Requests assigned to you</p></div><StatusBadge tone={active.length ? "info" : "neutral"}>{active.length} active</StatusBadge></div><div className="space-y-3">{appointments.length === 0 ? <OperationsEmptyState icon="inbox" title="No medical requests" description="Verified requests assigned to you will appear here." /> : appointments.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-2xl border p-4 text-left transition ${item.id === selectedId ? "border-primary bg-primary/5 ring-2 ring-primary/10" : item.urgency !== "routine" && item.status === "requested" ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20" : "border-slate-200 bg-white hover:border-primary/40 dark:border-slate-800 dark:bg-[#1b1922]"}`}><div className="flex items-center justify-between gap-2"><StatusBadge tone={item.urgency === "critical" ? "danger" : item.urgency === "urgent" ? "warning" : "neutral"}>{item.urgency === "routine" ? statusLabel(item.status) : `${item.urgency} · ${statusLabel(item.status)}`}</StatusBadge><span className="text-[11px] text-slate-400">{item.requestedAt.toLocaleDateString()}</span></div><p className="mt-3 line-clamp-2 text-sm font-bold leading-5">{item.memberSummary || "Member requested a medical consultation"}</p><p className="mt-2 text-xs text-slate-500">{item.specialty} · {item.preferredLanguage}</p></button>)}</div></section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1b1922]">{!selected ? <div className="p-6"><OperationsEmptyState icon="clinical_notes" title="Select a medical request" description="The consultation controls will appear here." /></div> : <>
        <header className={`border-b p-5 sm:p-6 ${selected.urgency !== "routine" ? "border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/20" : "border-slate-200 dark:border-slate-800"}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge tone={selected.urgency === "critical" ? "danger" : selected.urgency === "urgent" ? "warning" : "info"}>{selected.urgency} · {statusLabel(selected.status)}</StatusBadge><span className="text-xs text-slate-500">Private member ref {selected.memberId.slice(0, 8)}</span></div><h2 className="mt-3 text-xl font-extrabold">{selected.specialty}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{selected.memberSummary || "No preparation summary was shared."}</p><p className="mt-2 text-xs text-slate-500">Preferred language: {selected.preferredLanguage}</p></div><div className="flex shrink-0 flex-wrap gap-2">{selected.status === "requested" && <><button type="button" disabled={Boolean(busy)} onClick={() => void transition("booked")} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white">Accept</button><button type="button" disabled={Boolean(busy)} onClick={() => void transition("declined")} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold dark:border-slate-700">Decline</button></>}{selected.status === "booked" && <button type="button" disabled={Boolean(busy)} onClick={() => void transition("in_consultation")} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white">Start consultation</button>}{selected.status === "in_consultation" && <button type="button" disabled={Boolean(busy)} onClick={() => void transition("completed")} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold dark:border-slate-700">Complete</button>}</div></div></header>
        {["booked", "in_consultation", "completed"].includes(selected.status) && <div className="grid min-h-[520px] lg:grid-cols-[1fr_350px]">
          <div className="flex min-w-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-800"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h3 className="font-extrabold">Private consultation</h3><p className="mt-1 text-xs text-slate-500">Only this member and the assigned doctor can access these messages.</p></div><div aria-live="polite" className="min-h-64 flex-1 space-y-3 overflow-y-auto p-5 lg:max-h-[520px]">{messages.map((item) => <div key={item.id} className={`flex ${item.senderRole === "doctor" ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.senderRole === "doctor" ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800"}`}><p className="whitespace-pre-wrap break-words">{item.text}</p><p className={`mt-1 text-[10px] ${item.senderRole === "doctor" ? "text-white/70" : "text-slate-400"}`}>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div></div>)}{!messages.length && <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-900">No consultation messages yet.</p>}</div>{selected.status !== "completed" && <form onSubmit={sendMessage} className="border-t border-slate-200 p-4 dark:border-slate-800"><label className="sr-only" htmlFor="doctor-message">Private message</label><div className="flex gap-2"><textarea id="doctor-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={2} placeholder="Ask a clinical question" className="min-w-0 flex-1 resize-none rounded-xl border-slate-300 text-base dark:border-slate-700 dark:bg-slate-900" /><button type="submit" disabled={!message.trim() || busy === "message"} className="min-h-12 self-end rounded-xl bg-primary px-4 font-bold text-white disabled:opacity-50">Send</button></div></form>}</div>
          <aside className="p-5"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100"><strong>Clinical responsibility:</strong> assess the complaint and check allergies, current medicines, pregnancy possibility, interactions, contraindications and follow-up needs.</div><h3 className="mt-5 font-extrabold">Issue prescription</h3><p className="mt-1 text-xs leading-5 text-slate-500">Enabled only while this assigned consultation is in progress.</p><form onSubmit={prescribe} className="mt-4 space-y-3">{(["medicineName", "strength", "dose", "route", "frequency", "duration", "quantity"] as const).map((key) => <label key={key} className="block text-xs font-bold capitalize">{key.replace(/([A-Z])/g, " $1")}<input required value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} disabled={selected.status !== "in_consultation"} maxLength={160} className="mt-1 min-h-11 w-full rounded-xl border-slate-300 text-base disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900" /></label>)}<label className="block text-xs font-bold">Instructions<textarea value={draft.instructions} onChange={(event) => setDraft((current) => ({ ...current, instructions: event.target.value }))} disabled={selected.status !== "in_consultation"} maxLength={1000} rows={3} className="mt-1 w-full resize-none rounded-xl border-slate-300 text-base disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900" /></label><label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-xs leading-5 dark:border-slate-700"><input type="checkbox" checked={draft.clinicalAttestation} onChange={(event) => setDraft((current) => ({ ...current, clinicalAttestation: event.target.checked }))} disabled={selected.status !== "in_consultation"} className="mt-1" /><span>I assessed this member and checked relevant history, allergies, current medicines, interactions, contraindications and follow-up needs.</span></label><button type="submit" disabled={selected.status !== "in_consultation" || !draft.clinicalAttestation || busy === "prescription"} className="min-h-12 w-full rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-50">{busy === "prescription" ? "Issuing securely…" : "Issue prescription"}</button></form></aside>
        </div>}
      </>}</section>
    </div>
  </DoctorShell>;
}
