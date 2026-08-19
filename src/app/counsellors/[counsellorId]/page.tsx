"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { requestSession } from "@/lib/sessionsClient";
import { Counsellor } from "@/types";

export default function CounsellorProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ counsellorId: string }>();
  const [counsellor, setCounsellor] = useState<Counsellor | null>(null);
  const [profileState, setProfileState] = useState<"loading" | "ready" | "not_found" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const canContact = counsellor?.status === "available";

  useEffect(() => {
    let cancelled = false;

    const loadDirectoryProfile = async () => {
      setProfileState("loading");
      setCounsellor(null);
      try {
        const response = await authenticatedFetch("/api/counsellors", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) throw new Error("Profile request failed");
        const found = result.data.counsellors?.find((item: Counsellor) => item.id === params.counsellorId);
        if (cancelled) return;
        if (!found) {
          setProfileState("not_found");
          return;
        }
        setCounsellor({ ...found, createdAt: new Date(found.createdAt), credentialExpiresAt: found.credentialExpiresAt ? new Date(found.credentialExpiresAt) : undefined });
        setProfileState("ready");
      } catch {
        if (!cancelled) setProfileState("error");
      }
    };
    if (user && params.counsellorId) loadDirectoryProfile();
    return () => {
      cancelled = true;
    };
  }, [params.counsellorId, reloadKey, user]);

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

  if (loading || !user || profileState === "loading") {
    return <CounsellorProfileSkeleton />;
  }

  if (profileState === "error") {
    return (
      <ProfileStateMessage
        icon="wifi_off"
        title="We couldn't load this profile"
        message="Your connection may have been interrupted. Your counsellor request has not been changed."
        actionLabel="Try again"
        onAction={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  if (profileState === "not_found" || !counsellor) {
    return (
      <ProfileStateMessage
        icon="person_off"
        title="Counsellor not found"
        message="The verified profile you opened is no longer available in the directory."
      />
    );
  }

  return (
    <div className="app-page overflow-x-clip">
      <Header variant="app" />

      <main className="main-content page-container min-w-0 pb-36 pt-5 sm:py-7 md:pb-8">
        <div className="mb-4 sm:mb-6">
          <Link
            href="/counsellors"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline sm:text-base"
          >
            <span className="material-symbols-outlined text-lg">
              arrow_back
            </span>
            Back to all counsellors
          </Link>
        </div>

        <section className="overflow-hidden rounded-3xl bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark shadow-lg">
          <div className="relative h-28 bg-gradient-to-r from-primary via-fuchsia-500 to-pink-500 sm:h-52">
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-pink-500/20 blur-3xl" />
          </div>

          <div className="relative -mt-12 px-4 pb-6 sm:-mt-20 sm:px-7 sm:pb-8">
            <div className="flex flex-col md:flex-row gap-5 sm:gap-6 items-start">
              <div className="relative shrink-0">
                <div className="h-24 w-24 overflow-hidden rounded-3xl border-4 border-white bg-gray-200 shadow-xl dark:border-gray-900 sm:h-36 sm:w-36">
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-primary-sm">
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

                <h1 className="break-words text-2xl font-bold text-text-primary dark:text-white sm:text-3xl md:text-4xl">
                  {counsellor.name}
                </h1>
                <p className="mt-1 text-base sm:text-lg text-text-secondary">
                  {counsellor.title}
                </p>

                <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.04] p-3 sm:p-4 md:flex md:items-center md:justify-between md:gap-5">
                  <div>
                    <p className="text-sm font-bold text-text-primary dark:text-white">Private support with {counsellor.name}</p>
                    <p className="mt-1 text-xs leading-5 text-text-secondary sm:text-sm">Message privately, then start an anonymous audio call when you are both ready.</p>
                  </div>
                  <div className="mt-3 hidden w-full max-w-xs shrink-0 md:block">
                    {canContact ? (
                      <RequestCounsellorButton
                        requesting={requesting}
                        onRequest={() => void requestPrivateSession()}
                      />
                    ) : (
                      <AvailabilityNotice status={counsellor.status} />
                    )}
                    {requestError && <RequestError message={requestError} />}
                  </div>
                </div>

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

            <Link href={`/report?type=counsellor&targetId=${encodeURIComponent(counsellor.id)}`} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">report</span>
              Report a concern about this counsellor
            </Link>

          </aside>
        </section>
      </main>

      <div className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.5rem)] z-40 rounded-2xl border border-primary/15 bg-white/95 p-2 shadow-2xl shadow-black/15 backdrop-blur-xl dark:border-primary/25 dark:bg-gray-900/95 md:hidden">
        {canContact ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0 px-2">
              <p className="truncate text-xs font-bold text-text-primary dark:text-white">{counsellor.name}</p>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-green-700 dark:text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Available now
              </p>
            </div>
            <RequestCounsellorButton
              compact
              requesting={requesting}
              onRequest={() => void requestPrivateSession()}
            />
          </div>
        ) : (
          <AvailabilityNotice status={counsellor.status} />
        )}
        {requestError && <RequestError message={requestError} />}
      </div>
    </div>
  );
}

function RequestCounsellorButton({
  requesting,
  onRequest,
  compact = false,
}: {
  requesting: boolean;
  onRequest: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={requesting}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-70 ${compact ? "w-auto whitespace-nowrap" : "w-full"}`}
    >
      <span className="material-symbols-outlined text-xl" aria-hidden="true">
        {requesting ? "progress_activity" : "lock_open"}
      </span>
      {requesting ? "Opening support…" : "Chat or call privately"}
    </button>
  );
}

function AvailabilityNotice({
  status,
}: {
  status: Counsellor["status"];
}) {
  return (
    <div className="rounded-xl border border-border-light bg-background-light p-3 text-sm text-text-secondary dark:border-border-dark dark:bg-background-dark">
      {status === "in_session"
        ? "This counsellor is helping someone now and cannot receive another request."
        : "This counsellor is offline and cannot receive a request yet."}
    </div>
  );
}

function RequestError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-3 rounded-xl border border-red-200 bg-white p-3 text-sm font-semibold text-red-700"
    >
      {message}
    </p>
  );
}

function CounsellorProfileSkeleton() {
  return (
    <div className="app-page" aria-busy="true" aria-label="Loading counsellor profile">
      <Header variant="app" />
      <main className="main-content page-container py-5 sm:py-7">
        <Skeleton className="mb-5 h-6 w-44 rounded-lg" />
        <section className="overflow-hidden rounded-3xl border border-border-light bg-white shadow-lg dark:border-border-dark dark:bg-gray-900">
          <Skeleton className="h-28 w-full rounded-none sm:h-52" />
          <div className="relative -mt-12 flex flex-col gap-5 px-4 pb-7 sm:-mt-20 sm:flex-row sm:px-7">
            <Skeleton className="h-24 w-24 shrink-0 rounded-3xl sm:h-36 sm:w-36" />
            <div className="w-full space-y-3 pt-2 sm:pt-20 md:pt-4">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-9 w-2/3 rounded-lg" />
              <Skeleton className="h-5 w-1/3 rounded-lg" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ProfileStateMessage({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <Header variant="app" />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="rounded-2xl border border-border-light bg-white p-6 text-center shadow-sm dark:border-border-dark dark:bg-gray-900 sm:p-8">
          <span className="material-symbols-outlined text-4xl text-primary" aria-hidden="true">{icon}</span>
          <h1 className="mt-2 text-lg font-semibold text-text-primary dark:text-white sm:text-xl">{title}</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-text-secondary sm:text-base">{message}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {onAction && actionLabel && (
              <button type="button" onClick={onAction} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 font-semibold text-white">
                {actionLabel}
              </button>
            )}
            <Link href="/counsellors" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/20 px-4 py-2.5 font-semibold text-primary">
              Back to counsellors
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
