"use client";

import React, { useState, useEffect, useMemo } from "react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import CounsellorCard from "@/components/features/CounsellorCard";
import { Counsellor, CounsellorSpecialty, CounsellorStatus } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// Mock counsellors data - In production, this would come from Firestore
const mockCounsellors: Counsellor[] = [
  {
    id: "1",
    name: "Dr. Sarah Namugga",
    title: "Clinical Psychologist",
    bio: "Passionate about women's mental health with over 10 years of experience helping women navigate life's challenges. I specialize in anxiety, depression, and reproductive mental health.",
    specializations: [
      "Mental Health",
      "Reproductive Health",
      "Pregnancy & Postpartum",
    ],
    photoURL:
      "https://media.istockphoto.com/id/1061001352/photo/portrait-of-confident-senior-female-doctor-in-scrubs.webp?a=1&b=1&s=612x612&w=0&k=20&c=u3Lor1FUwqXc73oKPS6ncsOPPwA1QFlimqjT4PSvO6U=",
    status: "available",
    rating: 4.9,
    reviewCount: 127,
    yearsExperience: 10,
    languages: ["English", "Luganda", "Swahili"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "08:00",
      end: "18:00",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    sessionCount: 1240,
    verified: true,
    createdAt: new Date("2020-01-15"),
  },
  {
    id: "2",
    name: "Ms. Grace Achieng",
    title: "Reproductive Health Specialist",
    bio: "Dedicated to empowering women with knowledge about their bodies. I provide compassionate guidance on menstrual health, fertility, and family planning.",
    specializations: [
      "Menstrual Health",
      "Reproductive Health",
      "Sexual Health",
    ],
    photoURL:
      "https://media.istockphoto.com/id/1323303738/photo/medical-doctor-indoors-portraits.webp?a=1&b=1&s=612x612&w=0&k=20&c=yZa7CUM8vn95un_1M-8rf86elGYB6oBrBP4GVIZZ2C0=",
    status: "busy",
    rating: 4.8,
    reviewCount: 98,
    yearsExperience: 8,
    languages: ["English", "Luo"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "09:00",
      end: "17:00",
      days: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
    sessionCount: 856,
    verified: true,
    createdAt: new Date("2021-03-20"),
  },
  {
    id: "3",
    name: "Dr. Faith Nakamya",
    title: "Nutritionist & Wellness Coach",
    bio: "Helping women optimize their health through nutrition. I focus on hormone balance, menstrual cycle nutrition, and overall wellness.",
    specializations: [
      "Nutrition & Wellness",
      "Menstrual Health",
      "Adolescent Health",
    ],
    photoURL:
      "https://media.istockphoto.com/id/2193298581/photo/smiling-doctor-looking-out-the-window-in-her-office.webp?a=1&b=1&s=612x612&w=0&k=20&c=ZYOOoyIWh6NFRK96Kgwp__gGHRf_7luFbfdpc4cf3YA=",
    status: "available",
    rating: 4.7,
    reviewCount: 76,
    yearsExperience: 6,
    languages: ["English", "Luganda"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "10:00",
      end: "19:00",
      days: ["Monday", "Wednesday", "Friday", "Saturday"],
    },
    sessionCount: 543,
    verified: true,
    createdAt: new Date("2022-06-10"),
  },
  {
    id: "4",
    name: "Ms. Mercy Atim",
    title: "Adolescent Health Counsellor",
    bio: "Specialized in supporting young women through puberty and adolescence. Creating a safe space for teens to discuss their health concerns.",
    specializations: ["Adolescent Health", "Mental Health", "Menstrual Health"],
    photoURL:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face",
    status: "offline",
    rating: 4.9,
    reviewCount: 84,
    yearsExperience: 7,
    languages: ["English", "Ateso", "Luganda"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "08:00",
      end: "16:00",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    sessionCount: 672,
    verified: true,
    createdAt: new Date("2021-09-01"),
  },
  {
    id: "5",
    name: "Dr. Patience Nabirye",
    title: "Pregnancy & Postpartum Specialist",
    bio: "Supporting mothers through their pregnancy journey and beyond. I provide emotional support, guidance on postpartum recovery, and maternal mental health care.",
    specializations: [
      "Pregnancy & Postpartum",
      "Mental Health",
      "Reproductive Health",
    ],
    photoURL:
      "https://plus.unsplash.com/premium_photo-1661740529633-ab79e4c1d5cb?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YWZyaWNhbiUyMGZlbWFsZSUyMGRvY3RvcnxlbnwwfHwwfHx8MA%3D%3D",
    status: "available",
    rating: 5.0,
    reviewCount: 156,
    yearsExperience: 12,
    languages: ["English", "Lusoga", "Luganda"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "07:00",
      end: "15:00",
      days: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },
    sessionCount: 1890,
    verified: true,
    createdAt: new Date("2019-02-14"),
  },
  {
    id: "6",
    name: "Ms. Joy Nabwire",
    title: "Relationship Counsellor",
    bio: "Helping women build healthy relationships and navigate challenges in their personal lives. I offer a compassionate, non-judgmental space for healing.",
    specializations: [
      "Relationship Counselling",
      "Mental Health",
      "Sexual Health",
    ],
    photoURL:
      "https://images.unsplash.com/photo-1655720357761-f18ea9e5e7e6?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fGFmcmljYW4lMjBmZW1hbGUlMjBkb2N0b3J8ZW58MHx8MHx8fDA%3D",
    status: "busy",
    rating: 4.6,
    reviewCount: 62,
    yearsExperience: 5,
    languages: ["English", "Luganda"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "11:00",
      end: "20:00",
      days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    },
    sessionCount: 398,
    verified: false,
    createdAt: new Date("2023-01-10"),
  },
];

const specialties: CounsellorSpecialty[] = [
  "Mental Health",
  "Menstrual Health",
  "Reproductive Health",
  "Nutrition & Wellness",
  "Pregnancy & Postpartum",
  "Sexual Health",
  "Adolescent Health",
  "Relationship Counselling",
];

const statusFilters: { value: CounsellorStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available Now" },
  { value: "busy", label: "In Session" },
  { value: "offline", label: "Offline" },
];

export default function CounsellorsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
  const [counsellors, setCounsellors] = useState<Counsellor[]>(mockCounsellors);
  const [showFilters, setShowFilters] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

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

  const handleWhatsAppClick = (counsellor: Counsellor) => {
    const message = encodeURIComponent(
      `Hi ${counsellor.name}, I found you on SisterCare and would like to schedule a consultation.`,
    );
    window.open(
      `https://wa.me/${counsellor.whatsappNumber.replace("+", "")}?text=${message}`,
      "_blank",
    );
  };

  const handleCallClick = (counsellor: Counsellor) => {
    window.open(`tel:${counsellor.phoneNumber}`, "_self");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center safe-top safe-bottom">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <Header variant="app" />

      <main className="main-content max-w-7xl mx-auto px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6 pb-24">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary via-purple-600 to-pink-500 p-5 sm:p-6 md:p-8 mb-5 sm:mb-6 md:mb-8 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute -top-20 -right-20 w-40 sm:w-64 h-40 sm:h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-40 sm:w-64 h-40 sm:h-64 bg-pink-500/20 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <span className="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl">
                support_agent
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                Talk to a Counsellor
              </h1>
            </div>
            <p className="text-white/90 max-w-2xl mb-4 sm:mb-6 text-sm sm:text-base">
              Connect with our verified health professionals for personalized
              guidance and support. All conversations are confidential and
              judgment-free.
            </p>

            {/* Stats */}
            <div className="flex flex-col xs:flex-row flex-wrap gap-3 sm:gap-4 md:gap-6 text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400 animate-pulse"></div>
                <span className="font-semibold">
                  {availableCount} Available Now
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg sm:text-xl">
                  verified
                </span>
                <span>
                  {counsellors.filter((c) => c.verified).length} Verified
                  Professionals
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg sm:text-xl">
                  lock
                </span>
                <span>100% Confidential</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-sm border border-border-light dark:border-border-dark p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6">
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
                className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-primary dark:text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filter toggle (mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-primary dark:text-white text-sm sm:text-base touch-target"
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
                {statusFilters.map((status) => (
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
                {specialties.map((specialty) => (
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
                  {statusFilters.map((status) => (
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
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-primary dark:text-white text-sm touch-target"
                >
                  <option value="all">All Specialties</option>
                  {specialties.map((specialty) => (
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
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-primary dark:text-white text-sm touch-target"
                >
                  <option value="rating">Top Rated</option>
                  <option value="experience">Most Experienced</option>
                  <option value="sessions">Most Sessions</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
          <p className="text-text-secondary text-sm">
            Showing{" "}
            <span className="font-semibold text-text-primary dark:text-white">
              {filteredCounsellors.length}
            </span>{" "}
            counsellor{filteredCounsellors.length !== 1 ? "s" : ""}
          </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {filteredCounsellors.map((counsellor) => (
              <CounsellorCard
                key={counsellor.id}
                counsellor={counsellor}
                onWhatsAppClick={handleWhatsAppClick}
                onCallClick={handleCallClick}
              />
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
        <div className="mt-8 sm:mt-10 md:mt-12 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-purple-200 dark:border-purple-800">
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
                Yes, all conversations with our counsellors are 100%
                confidential. Your privacy is our top priority.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-border-light dark:border-border-dark">
              <h3 className="font-semibold text-text-primary dark:text-white mb-1.5 sm:mb-2 text-sm sm:text-base">
                How do I know if a counsellor is available?
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm">
                Each counsellor card shows their current status: Available
                (green), In Session (amber), or Offline (gray). You can only
                contact counsellors who are currently available.
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

      <BottomNav />
    </div>
  );
}
