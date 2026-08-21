"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Counsellor, CounsellorStatus } from "@/types";

interface CounsellorCardProps {
  counsellor: Counsellor;
}

const statusConfig: Record<
  CounsellorStatus,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  available: {
    label: "Available",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    dotColor: "bg-green-500",
  },
  in_session: {
    label: "In Session",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    dotColor: "bg-amber-500",
  },
  offline: {
    label: "Offline",
    color: "text-gray-500 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    dotColor: "bg-gray-400",
  },
};

export default function CounsellorCard({
  counsellor,
}: CounsellorCardProps) {
  const status = statusConfig[counsellor.status];
  const isAvailable = counsellor.status === "available";

  return (
    <article className="min-w-0 overflow-hidden rounded-[22px] border border-border-light bg-white shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft-lg active:scale-[0.99] dark:border-border-dark dark:bg-card-dark">
      {/* Header with gradient */}
      <div className="relative h-20 bg-gradient-to-r from-primary/15 via-primary/10 to-pink-100 dark:to-pink-950/20 sm:h-24">
        {/* Verified badge */}
        {counsellor.verified && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-white shadow-primary-sm sm:right-3 sm:top-3">
            <span className="material-symbols-outlined text-xs text-white sm:text-sm">
              verified
            </span>
            <span className="text-[10px] font-bold text-white sm:text-xs">
              Verified
            </span>
          </div>
        )}
        {/* Profile image */}
        <div className="absolute -bottom-10 sm:-bottom-12 left-4 sm:left-6">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-3 sm:border-4 border-white dark:border-bg-dark overflow-hidden bg-gray-200">
              <Image
                src={counsellor.photoURL || "/icons/sistercare-pink-v3.svg"}
                alt={counsellor.name}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            </div>
            {/* Status indicator */}
            <div
              className={`absolute bottom-0.5 sm:bottom-1 right-0.5 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 sm:border-3 border-white dark:border-bg-dark ${status.dotColor} animate-pulse`}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-12 sm:pt-14 px-4 sm:px-6 pb-4 sm:pb-6">
        {/* Name and title */}
        <div className="mb-2 sm:mb-3">
          <h3 className="break-words text-lg font-bold text-text-primary dark:text-white">
            {counsellor.name}
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary">
            {counsellor.title}
          </p>
        </div>

        {/* Status badge */}
        <div className="mb-3 sm:mb-4">
          <span
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${status.bgColor} ${status.color}`}
          >
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${status.dotColor}`}
            />
            {status.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <span className="material-symbols-outlined text-yellow-500 text-base sm:text-lg">
              star
            </span>
            {counsellor.reviewCount > 0 ? (
              <span className="text-text-secondary">
                <span className="font-semibold text-text-primary dark:text-white">{counsellor.rating}</span>{" "}
                from {counsellor.reviewCount} member {counsellor.reviewCount === 1 ? "review" : "reviews"}
              </span>
            ) : (
              <span className="text-text-secondary">No member reviews yet</span>
            )}
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 text-text-secondary">
            <span className="material-symbols-outlined text-base sm:text-lg">
              work_history
            </span>
            <span>{counsellor.yearsExperience > 0 ? `${counsellor.yearsExperience} years experience` : "Experience not listed"}</span>
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-3">
          {counsellor.bio}
        </p>

        {/* Specializations */}
        <div className="flex flex-wrap gap-2 mb-4">
          {counsellor.specializations.slice(0, 3).map((spec) => (
            <span
              key={spec}
              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium"
            >
              {spec}
            </span>
          ))}
          {counsellor.specializations.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-text-secondary text-xs rounded-full">
              +{counsellor.specializations.length - 3} more
            </span>
          )}
        </div>

        {/* Languages */}
        <div className="mb-4 flex min-w-0 items-start gap-2 text-sm text-text-secondary">
          <span className="material-symbols-outlined text-lg">translate</span>
          <span className="min-w-0 break-words">{counsellor.languages.join(", ")}</span>
        </div>

        {/* Available hours */}
        <div className="mb-5 flex min-w-0 items-start gap-2 text-sm text-text-secondary">
          <span className="material-symbols-outlined text-lg">schedule</span>
          <span>
            {counsellor.availableHours.start} - {counsellor.availableHours.end}
            <span className="text-xs ml-1">
              (
              {counsellor.availableHours.days.length === 7
                ? "Every day"
                : counsellor.availableHours.days.length === 5
                  ? "Weekdays"
                  : counsellor.availableHours.days
                      .slice(0, 2)
                      .map((d) => d.slice(0, 3))
                      .join(", ") + "..."}
              )
            </span>
          </span>
        </div>

        <Link
          href={`/counsellors/${counsellor.id}`}
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
            isAvailable
              ? "bg-primary-dark text-white shadow-primary-sm hover:bg-primary-dark/90"
              : "border border-border-light bg-white text-text-primary hover:border-primary/40 dark:border-border-dark dark:bg-card-dark dark:text-white"
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {isAvailable ? "lock_open" : "person"}
          </span>
          {isAvailable ? "View and request privately" : "View profile"}
        </Link>

        {/* Busy/Offline message */}
        {!isAvailable && (
          <p className="text-center text-[10px] sm:text-xs text-text-secondary mt-2 sm:mt-3">
            {counsellor.status === "in_session"
              ? "Helping someone now. New requests are paused."
              : "Not signed in right now. You can still review this profile."}
          </p>
        )}
      </div>
    </article>
  );
}
