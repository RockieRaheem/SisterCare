"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Header from "@/components/layout/Header";
import CounsellorCard from "@/components/features/CounsellorCard";
import { Counsellor, CounsellorSpecialty, CounsellorStatus } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import {
  COUNSELLOR_SPECIALTIES,
  COUNSELLOR_STATUS_FILTERS,
} from "@/lib/counsellors";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { AppShellSkeleton } from "@/components/ui/Skeleton";

export default function CounsellorsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<
    CounsellorSpecialty | "all"
  >("all");
  const [selectedStatus, setSelectedStatus] = useState<
    CounsellorStatus | "all"
  >("all");
  const [sortBy, setSortBy] = useState<"rating" | "experience" | "sessions">(
    "rating",
  );
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loadingCounsellors, setLoadingCounsellors] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const selectedCounsellorId = searchParams.get("counsellorId");

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  // Server-derived availability: no directory fallback and no client-side
  // schedule inference can make a counsellor appear available.
  const loadCounsellors = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingCounsellors(true);
    try {
      const response = await authenticatedFetch("/api/counsellors", {
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.error || "Counsellor availability could not be refreshed");
      }
      setCounsellors((result.data.counsellors || []).map((counsellor: Counsellor) => ({
        ...counsellor,
        createdAt: new Date(counsellor.createdAt),
        credentialExpiresAt: counsellor.credentialExpiresAt ? new Date(counsellor.credentialExpiresAt) : undefined,
      })));
      setRefreshedAt(result.data.refreshedAt ? new Date(result.data.refreshedAt) : new Date());
      setDirectoryError(null);
    } catch (error) {
      setDirectoryError(error instanceof Error ? error.message : "Counsellor availability could not be refreshed");
    } finally {
      setLoadingCounsellors(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadCounsellors(true);
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadCounsellors();
    }, 15_000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void loadCounsellors();
    };
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.clearInterval(refresh);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [loadCounsellors, user]);

  // Filter and sort counsellors
  const filteredCounsellors = useMemo(() => {
    let result = [...counsellors];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.title.toLowerCase().includes(query) ||
          c.bio.toLowerCase().includes(query) ||
          c.specializations.some((s) => s.toLowerCase().includes(query)),
      );
    }

    // Specialty filter
    if (selectedSpecialty !== "all") {
      result = result.filter((c) =>
        c.specializations.includes(selectedSpecialty),
      );
    }

    // Status filter
    if (selectedStatus !== "all") {
      result = result.filter((c) => c.status === selectedStatus);
    }

    // Sort
    switch (sortBy) {
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "experience":
        result.sort((a, b) => b.yearsExperience - a.yearsExperience);
        break;
      case "sessions":
        result.sort((a, b) => b.sessionCount - a.sessionCount);
        break;
    }

    return result;
  }, [counsellors, searchQuery, selectedSpecialty, selectedStatus, sortBy]);

  // Count available counsellors
  const availableCount = counsellors.filter(
    (c) => c.status === "available",
  ).length;

  useEffect(() => {
    if (!selectedCounsellorId) return;

    const selectedElement = profileRefs.current[selectedCounsellorId];
    if (selectedElement) {
      selectedElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedCounsellorId, filteredCounsellors]);

  if (loading || (user && loadingCounsellors && counsellors.length === 0)) {
    return <AppShellSkeleton variant="list" />;
  }

  return (
    <div className="app-page overflow-x-clip">
      <Header variant="app" />

      <main className="main-content page-container py-5 sm:py-7">
        {/* Hero Section */}
        <section className="relative mb-5 overflow-hidden rounded-[22px] bg-primary p-5 text-white shadow-primary-sm sm:mb-6 sm:p-8">
          <div className="absolute -top-20 -right-20 w-40 sm:w-64 h-40 sm:h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-40 sm:w-64 h-40 sm:h-64 bg-pink-500/20 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <div className="mb-3 flex items-start gap-3 sm:mb-4 sm:items-center">
              <span className="material-symbols-outlined mt-0.5 text-2xl sm:mt-0 sm:text-3xl md:text-4xl">
                support_agent
              </span>
              <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
                Human support, when you need it
              </h1>
            </div>
            <p className="mb-5 max-w-2xl text-sm leading-6 text-white/90 sm:mb-6 sm:text-base">
              Find a verified professional by specialty, language and current
              availability. Messages, calls and personal details stay inside
              SisterCare.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:gap-4 sm:text-base">
              <div className="flex min-w-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400 animate-pulse"></div>
                <span className="font-semibold">
                  {availableCount} Available Now
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <span className="material-symbols-outlined text-lg sm:text-xl">
                  verified
                </span>
                <span>
                  {counsellors.filter((c) => c.verified).length} Verified
                  Professionals
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <span className="material-symbols-outlined text-lg sm:text-xl">
                  lock
                </span>
                <span>Private session requests</span>
              </div>
            </div>
          </div>
        </section>

        {directoryError && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <p>
              <strong>Live status is temporarily unavailable.</strong>{" "}
              {directoryError}
            </p>
            <button
              type="button"
              onClick={() => void loadCounsellors(true)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 font-bold text-white dark:bg-amber-200 dark:text-amber-950"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Try again
            </button>
          </div>
        )}

        {/* Search and Filter Bar */}
        <section className="surface mb-5 p-3 sm:mb-6 sm:p-4" aria-label="Find a counsellor">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-text-secondary text-xl sm:text-2xl">
                search
              </span>
              <input
                type="text"
                placeholder="Search by name, specialty, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-border-light bg-bg-light py-3 pl-10 pr-4 text-base text-text-primary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-bg-dark dark:text-white sm:pl-12"
              />
            </div>

            {/* Filter toggle (mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="touch-target flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-light bg-bg-light px-4 py-3 text-base font-semibold text-text-primary dark:border-border-dark dark:bg-bg-dark dark:text-white lg:hidden"
            >
              <span className="material-symbols-outlined">tune</span>
              Filters
              {(selectedSpecialty !== "all" || selectedStatus !== "all") && (
                <span className="w-2 h-2 rounded-full bg-primary"></span>
              )}
            </button>

            {/* Desktop filters */}
            <div className="hidden lg:flex gap-3">
              {/* Status filter */}
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as CounsellorStatus | "all")
                }
                className="px-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {COUNSELLOR_STATUS_FILTERS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              {/* Specialty filter */}
              <select
                value={selectedSpecialty}
                onChange={(e) =>
                  setSelectedSpecialty(
                    e.target.value as CounsellorSpecialty | "all",
                  )
                }
                className="px-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Specialties</option>
                {COUNSELLOR_SPECIALTIES.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as "rating" | "experience" | "sessions",
                  )
                }
                className="px-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="rating">Top Rated</option>
                <option value="experience">Most Experienced</option>
                <option value="sessions">Most Sessions</option>
              </select>
            </div>
          </div>

          {/* Mobile filters (collapsible) */}
          {showFilters && (
            <div className="lg:hidden mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border-light dark:border-border-dark space-y-3">
              <div>
                <label className="text-xs sm:text-sm font-medium text-text-secondary mb-2 block">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {COUNSELLOR_STATUS_FILTERS.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => setSelectedStatus(status.value)}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all touch-target ${
                        selectedStatus === status.value
                          ? "bg-primary text-white"
                          : "bg-bg-light dark:bg-bg-dark text-text-primary dark:text-white border border-border-light dark:border-border-dark active:bg-primary/10"
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-text-secondary mb-2 block">
                  Specialty
                </label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) =>
                    setSelectedSpecialty(
                      e.target.value as CounsellorSpecialty | "all",
                    )
                  }
                  className="touch-target w-full rounded-xl border border-border-light bg-bg-light px-3 py-3 text-base text-text-primary dark:border-border-dark dark:bg-bg-dark dark:text-white sm:px-4"
                >
                  <option value="all">All Specialties</option>
                  {COUNSELLOR_SPECIALTIES.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-text-secondary mb-2 block">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as "rating" | "experience" | "sessions",
                    )
                  }
                  className="touch-target w-full rounded-xl border border-border-light bg-bg-light px-3 py-3 text-base text-text-primary dark:border-border-dark dark:bg-bg-dark dark:text-white sm:px-4"
                >
                  <option value="rating">Top Rated</option>
                  <option value="experience">Most Experienced</option>
                  <option value="sessions">Most Sessions</option>
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Results count */}
        <div className="mb-4 flex min-w-0 flex-wrap items-end justify-between gap-3 sm:mb-5 md:mb-6">
          <div className="min-w-0">
            <p className="text-text-secondary text-sm">
              Showing{" "}
              <span className="font-semibold text-text-primary dark:text-white">
                {filteredCounsellors.length}
              </span>{" "}
              counsellor{filteredCounsellors.length !== 1 ? "s" : ""}
            </p>
            {refreshedAt && (
              <p className="mt-1 text-[11px] text-text-secondary">
                Live status updated {refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          {(selectedSpecialty !== "all" ||
            selectedStatus !== "all" ||
            searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedSpecialty("all");
                setSelectedStatus("all");
              }}
              className="text-primary text-xs sm:text-sm font-medium hover:underline flex items-center gap-1 active:opacity-70"
            >
              <span className="material-symbols-outlined text-xs sm:text-sm">
                close
              </span>
              Clear filters
            </button>
          )}
        </div>

        {/* Counsellors Grid */}
        {filteredCounsellors.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
            {filteredCounsellors.map((counsellor) => (
              <div
                key={counsellor.id}
                ref={(element) => {
                  profileRefs.current[counsellor.id] = element;
                }}
                className={
                  selectedCounsellorId === counsellor.id
                    ? "min-w-0 scroll-mt-24 rounded-2xl ring-4 ring-primary ring-offset-2 ring-offset-bg-light dark:ring-offset-bg-dark"
                    : "min-w-0 scroll-mt-24"
                }
              >
                <CounsellorCard counsellor={counsellor} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-8 sm:p-10 md:p-12 text-center border border-border-light dark:border-border-dark">
            <span className="material-symbols-outlined text-5xl sm:text-6xl text-text-secondary mb-3 sm:mb-4">
              person_search
            </span>
            <h3 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white mb-2">
              No counsellors found
            </h3>
            <p className="text-text-secondary text-sm mb-5 sm:mb-6">
              Try adjusting your search or filters to find available
              counsellors.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedSpecialty("all");
                setSelectedStatus("all");
              }}
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-semibold hover:bg-primary/90 transition-colors text-sm sm:text-base touch-target"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10 sm:mt-10 sm:p-5 md:mt-12 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-primary text-xl sm:text-2xl">
                  help
                </span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-bold text-text-primary dark:text-white mb-0.5 sm:mb-1">
                Need Immediate Help?
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm">
                If you&apos;re in crisis or need emergency support, please
                contact emergency services or a crisis hotline immediately.
              </p>
            </div>
            <a
              href="tel:116"
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-500 text-white rounded-lg sm:rounded-xl font-semibold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25 text-sm sm:text-base w-full md:w-auto touch-target"
            >
              <span className="material-symbols-outlined text-lg sm:text-xl">
                emergency
              </span>
              Emergency: 116
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-6 sm:mt-7 md:mt-8 mb-6 sm:mb-7 md:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary dark:text-white mb-4 sm:mb-5 md:mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl sm:text-2xl">
              quiz
            </span>
            Frequently Asked Questions
          </h2>

          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-border-light dark:border-border-dark">
              <h3 className="font-semibold text-text-primary dark:text-white mb-1.5 sm:mb-2 text-sm sm:text-base">
                Are consultations confidential?
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm">
                Session access is restricted to the people involved and
                authorized operations staff. Counsellors follow SisterCare
                privacy and professional conduct requirements.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-border-light dark:border-border-dark">
              <h3 className="font-semibold text-text-primary dark:text-white mb-1.5 sm:mb-2 text-sm sm:text-base">
                How do I know if a counsellor is available?
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm">
                Each counsellor card shows their current status: Available
                (green), In Session (amber), or Offline (gray). You can only
                request counsellors who are currently available. Status
                refreshes automatically while this page is open.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-border-light dark:border-border-dark">
              <h3 className="font-semibold text-text-primary dark:text-white mb-1.5 sm:mb-2 text-sm sm:text-base">
                What does &quot;Verified&quot; mean?
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm">
                Verified counsellors have had their professional credentials,
                qualifications, and identity verified by our team.
              </p>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
