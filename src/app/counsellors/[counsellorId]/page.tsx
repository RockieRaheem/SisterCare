"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/context/AuthContext";
import { getCounsellorById } from "@/lib/counsellors";

export default function CounsellorProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ counsellorId: string }>();

  const counsellor = getCounsellorById(params.counsellorId);
  const canContact = Boolean(counsellor);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, router, user]);

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
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <Header variant="app" />

      <main className="max-w-5xl mx-auto px-4 sm:px-5 md:px-6 py-4 sm:py-6 pb-24">
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
          <div className="relative h-40 sm:h-52 bg-gradient-to-r from-primary via-purple-600 to-pink-500">
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-pink-500/20 blur-3xl" />
          </div>

          <div className="px-5 sm:px-7 pb-6 sm:pb-8 -mt-16 sm:-mt-20 relative">
            <div className="flex flex-col md:flex-row gap-5 sm:gap-6 items-start">
              <div className="relative shrink-0">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-4 border-white dark:border-gray-900 shadow-xl bg-gray-200">
                  <Image
                    src={counsellor.photoURL}
                    alt={counsellor.name}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div
                  className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${counsellor.status === "available" ? "bg-green-500" : counsellor.status === "busy" ? "bg-amber-500" : "bg-gray-400"}`}
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
                      : counsellor.status === "busy"
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

          <aside className="bg-gradient-to-br from-primary to-purple-600 text-white rounded-2xl p-5 sm:p-6 shadow-lg">
            <h2 className="text-lg sm:text-xl font-bold">Contact options</h2>
            <p className="mt-2 text-sm sm:text-base text-white/90 leading-6">
              Review the profile, then choose the best way to connect.
            </p>

            <div className="mt-5 space-y-3">
              <a
                href={`tel:${counsellor.phoneNumber.replace(/[^+\d]/g, "")}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-primary font-semibold shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">call</span>
                Call counsellor
              </a>
              <a
                href={`https://wa.me/${counsellor.whatsappNumber.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white font-semibold"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                WhatsApp counsellor
              </a>
            </div>

            <div className="mt-5 rounded-xl bg-white/10 p-4 text-sm leading-6 text-white/90">
              <p className="font-semibold text-white">Direct details</p>
              <p className="mt-2">Phone: {counsellor.phoneNumber}</p>
              <p>WhatsApp: {counsellor.whatsappNumber}</p>
            </div>

            {canContact && (
              <p className="mt-4 text-xs text-white/80">
                Sister matched you to this counsellor based on your request and
                language preference.
              </p>
            )}
          </aside>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
