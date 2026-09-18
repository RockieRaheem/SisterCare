"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { AppShellSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { Doctor, DoctorAppointment } from "@/types";

const SPECIALTIES = [
  "General Practice",
  "Obstetrics & Gynaecology",
  "Sexual & Reproductive Health",
  "Psychiatry",
  "Internal Medicine",
] as const;

function statusLabel(status: DoctorAppointment["status"]) {
  return {
    requested: "Awaiting doctor response",
    booked: "Appointment booked",
    in_consultation: "Consultation in progress",
    completed: "Consultation completed",
    declined: "Doctor unavailable",
    cancelled: "Cancelled",
  }[status];
}

export default function DoctorsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [specialty, setSpecialty] = useState<(typeof SPECIALTIES)[number]>(
    "General Practice",
  );
  const [language, setLanguage] = useState("English");
  const [summary, setSummary] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login?next=/doctors");
  }, [loading, router, user]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [directoryResponse, appointmentsResponse] = await Promise.all([
        authenticatedFetch("/api/doctors", { cache: "no-store" }),
        authenticatedFetch("/api/doctor-appointments", { cache: "no-store" }),
      ]);
      const [directoryResult, appointmentsResult] = await Promise.all([
        directoryResponse.json().catch(() => ({})),
        appointmentsResponse.json().catch(() => ({})),
      ]);
      if (!directoryResponse.ok) {
        throw new Error(directoryResult.error || "Doctors could not be loaded");
      }
      if (!appointmentsResponse.ok) {
        throw new Error(
          appointmentsResult.error || "Appointments could not be loaded",
        );
      }
      setDoctors(directoryResult.data?.doctors || []);
      setAppointments(
        (appointmentsResult.data?.appointments || []).map(
          (item: DoctorAppointment & { requestedAt: string }) => ({
            ...item,
            requestedAt: new Date(item.requestedAt),
            scheduledFor: item.scheduledFor
              ? new Date(item.scheduledFor)
              : undefined,
          }),
        ),
      );
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Medical care could not be loaded",
      );
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const availableDoctors = useMemo(
    () => doctors.filter((doctor) => doctor.status === "available"),
    [doctors],
  );
  const activeAppointment = appointments.find((appointment) =>
    ["requested", "booked", "in_consultation"].includes(appointment.status),
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch("/api/doctor-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialty,
          preferredLanguage: language,
          summary,
          preferredDoctorId: selectedDoctorId || undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Request failed");
      setNotice(
        result.data?.appointment?.doctorName
          ? `Your request was sent to ${result.data.appointment.doctorName}.`
          : "Your request is in the verified doctor booking queue.",
      );
      setSummary("");
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The appointment could not be requested",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (appointmentId: string) => {
    setError("");
    const response = await authenticatedFetch(
      `/api/doctor-appointments?id=${encodeURIComponent(appointmentId)}`,
      { method: "DELETE" },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "The appointment could not be cancelled");
      return;
    }
    setNotice("The doctor request was cancelled.");
    await load();
  };

  if (loading || (user && loadingData)) return <AppShellSkeleton variant="list" />;

  return (
    <div className="app-page overflow-x-clip">
      <Header variant="app" />
      <main className="main-content page-container py-5 sm:py-7">
        <section className="relative overflow-hidden rounded-[24px] bg-primary p-5 text-white shadow-primary-lg sm:p-8">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/15 blur-3xl" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-base">medical_services</span>
              Verified medical care
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Speak to a doctor, not an AI, about treatment
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">
              Sister can help you organise a request, but only a verified doctor
              can assess you and decide whether a prescription is appropriate.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
              <span className="rounded-xl bg-white/15 px-3 py-2">
                {availableDoctors.length} available now
              </span>
              <span className="rounded-xl bg-white/15 px-3 py-2">
                {doctors.length} credential-current doctors
              </span>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-red-600" aria-hidden="true">emergency</span>
            <div>
              <h2 className="font-bold">Do not wait for an online booking in an emergency</h2>
              <p className="mt-1 text-sm leading-6">
                Severe bleeding, fainting, breathing difficulty, poisoning,
                severe rapidly worsening pain, or immediate danger needs urgent
                in-person care now.
              </p>
              <Link href="/help" className="mt-2 inline-flex font-bold underline underline-offset-4">
                View urgent support options
              </Link>
            </div>
          </div>
        </section>

        {(error || notice) && (
          <div
            role="status"
            className={`mt-5 rounded-2xl border p-4 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || notice}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <section aria-labelledby="doctor-directory-heading">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Choose with confidence</span>
                <h2 id="doctor-directory-heading" className="mt-1 text-2xl font-black">
                  Verified doctors
                </h2>
              </div>
              <button type="button" onClick={() => void load()} className="touch-target rounded-xl border border-border-light px-3 py-2 text-sm font-bold hover:border-primary hover:text-primary dark:border-border-dark">
                Refresh
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {doctors.map((doctor) => {
                const selected = selectedDoctorId === doctor.id;
                return (
                  <article key={doctor.id} className={`rounded-2xl border bg-white p-5 shadow-soft transition dark:bg-card-dark ${selected ? "border-primary ring-2 ring-primary/15" : "border-border-light dark:border-border-dark"}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-black text-primary">
                        {doctor.professionalName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold">{doctor.professionalName}</h3>
                          <span className="material-symbols-outlined text-lg text-primary" title="Verified doctor">verified</span>
                        </div>
                        <p className="text-sm text-text-secondary dark:text-gray-300">{doctor.title}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${doctor.status === "available" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                        {doctor.status === "available" ? "Available" : "Booking only"}
                      </span>
                    </div>
                    {doctor.bio && <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-secondary dark:text-gray-300">{doctor.bio}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {doctor.specializations.slice(0, 3).map((item) => (
                        <span key={item} className="rounded-lg bg-primary/5 px-2 py-1 text-xs font-semibold text-primary-dark dark:text-primary-light">{item}</span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-text-secondary dark:text-gray-400">
                      {doctor.languages.join(" · ")} · {doctor.yearsExperience} years experience
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDoctorId(selected ? "" : doctor.id);
                        if (doctor.specializations[0] && SPECIALTIES.includes(doctor.specializations[0] as (typeof SPECIALTIES)[number])) {
                          setSpecialty(doctor.specializations[0] as (typeof SPECIALTIES)[number]);
                        }
                      }}
                      className={`mt-4 min-h-11 w-full rounded-xl px-4 text-sm font-bold transition ${selected ? "bg-primary/10 text-primary" : "bg-primary text-white hover:bg-primary-dark"}`}
                    >
                      {selected ? "Selected" : doctor.status === "available" ? "Request this doctor" : "Request a booking"}
                    </button>
                  </article>
                );
              })}
              {!doctors.length && !error && (
                <div className="col-span-full rounded-2xl border border-dashed border-border-light p-8 text-center dark:border-border-dark">
                  <span className="material-symbols-outlined text-4xl text-text-secondary">medical_services</span>
                  <h3 className="mt-2 font-bold">No verified doctors are listed yet</h3>
                  <p className="mt-1 text-sm text-text-secondary dark:text-gray-300">SisterCare will not show unverified medical professionals.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="sticky top-24 rounded-2xl border border-primary/15 bg-white p-5 shadow-soft dark:border-primary/25 dark:bg-card-dark">
              <span className="eyebrow">Private medical request</span>
              <h2 className="mt-1 text-xl font-black">Request a consultation</h2>
              {activeAppointment ? (
                <div className="mt-4 rounded-xl bg-primary/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Current request</p>
                  <p className="mt-1 font-bold">{statusLabel(activeAppointment.status)}</p>
                  <p className="mt-1 text-sm text-text-secondary dark:text-gray-300">
                    {activeAppointment.doctorName || "Verified doctor matching"} · {activeAppointment.specialty}
                  </p>
                  {["requested", "booked"].includes(activeAppointment.status) && (
                    <button type="button" onClick={() => void cancel(activeAppointment.id)} className="mt-3 text-sm font-bold text-red-700 underline underline-offset-4 dark:text-red-300">
                      Cancel request
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={submit} className="mt-4 space-y-4">
                  <label className="block text-sm font-bold">
                    Type of care
                    <select value={specialty} onChange={(event) => setSpecialty(event.target.value as (typeof SPECIALTIES)[number])} className="mt-2 min-h-12 w-full rounded-xl border-border-light bg-background-light text-base dark:border-border-dark dark:bg-background-dark">
                      {SPECIALTIES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    Preferred language
                    <input value={language} onChange={(event) => setLanguage(event.target.value)} maxLength={80} className="mt-2 min-h-12 w-full rounded-xl border-border-light bg-background-light text-base dark:border-border-dark dark:bg-background-dark" />
                  </label>
                  <label className="block text-sm font-bold">
                    What do you need help with?
                    <textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={500} rows={4} placeholder="Share only what the doctor needs to prepare. Do not include passwords or payment details." className="mt-2 w-full resize-none rounded-xl border-border-light bg-background-light text-base dark:border-border-dark dark:bg-background-dark" />
                    <span className="mt-1 block text-right text-xs font-normal text-text-secondary">{summary.length}/500</span>
                  </label>
                  <button disabled={submitting} className="min-h-12 w-full rounded-xl bg-primary px-4 font-extrabold text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60">
                    {submitting ? "Sending securely…" : selectedDoctorId ? "Send to selected doctor" : "Match me with a doctor"}
                  </button>
                </form>
              )}
              <div className="mt-4 border-t border-border-light pt-4 text-xs leading-5 text-text-secondary dark:border-border-dark dark:text-gray-300">
                A request is not a diagnosis or prescription. A verified doctor
                must assess you before deciding on treatment.
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
