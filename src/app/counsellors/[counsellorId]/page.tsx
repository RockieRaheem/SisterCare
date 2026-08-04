"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { requestSession } from "@/lib/sessionsClient";
import { Counsellor } from "@/types";

export default function CounsellorProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ counsellorId: string }>();
  const [counsellor, setCounsellor] = useState<Counsellor | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const canContact = counsellor?.status === "available";

  useEffect(() => {
    const loadDirectoryProfile = async () => {
      try {
        const response = await authenticatedFetch("/api/counsellors", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) return;
        const found = result.data.counsellors?.find((item: Counsellor) => item.id === params.counsellorId);
        if (found) setCounsellor({ ...found, createdAt: new Date(found.createdAt), credentialExpiresAt: found.credentialExpiresAt ? new Date(found.credentialExpiresAt) : undefined });
      } catch {
        setCounsellor(null);
      }
    };
    if (user && params.counsellorId) loadDirectoryProfile();
  }, [params.counsellorId, user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, router, user]);

  const requestPrivateSession = async () => {
    if (!counsellor || counsellor.status !== "available") return;
    setRequesting(true);
    setRequestError(null);
    try {
      const session = await requestSession({
        preferredCounsellorId: counsellor.id,
        preferredLanguage: counsellor.languages[0],
        summary: "Member requested this counsellor from the verified directory",
        shareSummary: false,
      });
      router.push(`/sessions/${session.id}`);
    } catch (error) {
      const status = (error as { status?: number }).status;
      setRequestError(
        status === 409
          ? "This counsellor was just assigned to someone else. Choose another available counsellor."
          : "Your private request could not be started. Please refresh and try again.",
      );
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!counsellor) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <Header variant="app" />
        <main className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 border border-border-light dark:border-border-dark text-center shadow-sm">
            <p className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white">
              Counsellor not found
            </p>
            <p className="mt-2 text-sm sm:text-base text-text-secondary">
              The profile you opened is not available right now.
            </p>
            <Link
              href="/counsellors"
              className="inline-flex items-center justify-center mt-5 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold"
            >
              Back to counsellors
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-page">
      <Header variant="app" />

      <main className="main-content page-container py-5 sm:py-7">
        <div className="mb-4 sm:mb-6">
          <Link
            href="/counsellors"
            className="inline-flex items-center gap-2 text-sm sm:text-base text-primary font-medium hover:underline"
          >
            <span className="material-symbols-outlined text-lg">
              arrow_back
            </span>
            Back to all counsellors
          </Link>
        </div>

        <section className="overflow-hidden rounded-3xl bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark shadow-lg">
          <div className="relative h-40 sm:h-52 bg-gradient-to-r from-primary via-fuchsia-500 to-pink-500">
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-pink-500/20 blur-3xl" />
          </div>

          <div className="px-5 sm:px-7 pb-6 sm:pb-8 -mt-16 sm:-mt-20 relative">
            <div className="flex flex-col md:flex-row gap-5 sm:gap-6 items-start">
              <div className="relative shrink-0">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-4 border-white dark:border-gray-900 shadow-xl bg-gray-200">
                  <Image
                    src={
                      counsellor.photoURL || "/icons/sistercare-pink-v3.svg"
                    }
                    alt={counsellor.name}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div
                  className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${counsellor.status === "available" ? "bg-green-500" : counsellor.status === "in_session" ? "bg-amber-500" : "bg-gray-400"}`}
                />
              </div>

              <div className="flex-1 min-w-0 pt-2 sm:pt-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-sm">
                      verified
                    </span>
                    {counsellor.verified
                      ? "Verified professional"
                      : "Professional"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-text-secondary">
                    {counsellor.status === "available"
                      ? "Available now"
                      : counsellor.status === "in_session"
                        ? "In session"
                        : "Offline"}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary dark:text-white">
                  {counsellor.name}
                </h1>
                <p className="mt-1 text-base sm:text-lg text-text-secondary">
                  {counsellor.title}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm sm:text-base text-text-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-yellow-500 text-lg">
                      star
                    </span>
                    <span className="font-semibold text-text-primary dark:text-white">
                      {counsellor.rating}
                    </span>
                    <span>({counsellor.reviewCount})</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg">
                      group
                    </span>
                    <span>
                      {counsellor.sessionCount.toLocaleString()} sessions
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg">
                      schedule
                    </span>
                    <span>
                      {counsellor.availableHours.start} -{" "}
                      {counsellor.availableHours.end}
                    </span>
                  </span>
                </div>

                <p className="mt-5 text-sm sm:text-base leading-7 text-text-secondary max-w-3xl">
                  {counsellor.bio}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {counsellor.languages.map((language) => (
                    <span
                      key={language}
                      className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-text-primary dark:text-gray-200"
                    >
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 sm:mt-6 grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-5 sm:gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border-light dark:border-border-dark p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white mb-4">
              Specialties
            </h2>
            <div className="flex flex-wrap gap-2">
              {counsellor.specializations.map((specialty) => (
                <span
                  key={specialty}
                  className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                >
                  {specialty}
                </span>
              ))}
            </div>

            <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4">
                <p className="text-text-secondary text-xs uppercase tracking-wide font-semibold">
                  Availability
                </p>
                <p className="mt-1 text-text-primary dark:text-white font-semibold">
                  {counsellor.availableHours.days.length === 7
                    ? "Every day"
                    : counsellor.availableHours.days.join(", ")}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4">
                <p className="text-text-secondary text-xs uppercase tracking-wide font-semibold">
                  Experience
                </p>
                <p className="mt-1 text-text-primary dark:text-white font-semibold">
                  {counsellor.yearsExperience}+ years
                </p>
              </div>
            </div>
          </div>

          <aside className="bg-gradient-to-br from-primary-dark to-fuchsia-700 text-white rounded-2xl p-5 sm:p-6 shadow-lg">
            <h2 className="text-lg sm:text-xl font-bold">Private support</h2>
            <p className="mt-2 text-sm sm:text-base text-white/90 leading-6">
              Request a confidential SisterCare room. Your phone number and
              identity are not shared with the counsellor.
            </p>

            <div className="mt-5 rounded-xl bg-white/10 p-4 text-sm leading-6 text-white/90">
              <p className="font-semibold text-white">Inside your care room</p>
              <ul className="mt-2 space-y-2">
                <li className="flex gap-2">
                  <span className="material-symbols-outlined text-lg">chat</span>
                  Private in-app messages
                </li>
                <li className="flex gap-2">
                  <span className="material-symbols-outlined text-lg">call</span>
                  Anonymous audio when both sides connect
                </li>
                <li className="flex gap-2">
                  <span className="material-symbols-outlined text-lg">shield</span>
                  Only you and the assigned counsellor can enter
                </li>
              </ul>
            </div>

            {canContact ? (
              <button
                type="button"
                onClick={() => void requestPrivateSession()}
                disabled={requesting}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-primary-dark shadow-sm transition hover:bg-fuchsia-50 disabled:cursor-wait disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-lg">
                  {requesting ? "progress_activity" : "lock_open"}
                </span>
                {requesting ? "Creating private room…" : "Request this counsellor"}
              </button>
            ) : (
              <div className="mt-5 rounded-xl border border-white/20 bg-black/10 p-3 text-sm text-white/90">
                {counsellor.status === "in_session"
                  ? "This counsellor is helping someone now and cannot receive another request."
                  : "This counsellor is offline and cannot receive a request yet."}
              </div>
            )}
            {requestError && (
              <p role="alert" className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-red-700">
                {requestError}
              </p>
            )}
          </aside>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
