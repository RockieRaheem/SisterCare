"use client";

import React from "react";
import Image from "next/image";
import { Counsellor, CounsellorStatus } from "@/types";

interface CounsellorCardProps {
  counsellor: Counsellor;
  onWhatsAppClick: (counsellor: Counsellor) => void;
  onCallClick: (counsellor: Counsellor) => void;
}

const statusConfig: Record<CounsellorStatus, { label: string; color: string; bgColor: string; dotColor: string }> = {
  available: {
    label: "Available",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    dotColor: "bg-green-500",
  },
  busy: {
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

export default function CounsellorCard({ counsellor, onWhatsAppClick, onCallClick }: CounsellorCardProps) {
  const status = statusConfig[counsellor.status];
  const isAvailable = counsellor.status === "available";

  return (
    <div className="bg-white dark:bg-bg-dark rounded-2xl shadow-lg border border-border-light dark:border-border-dark overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
      {/* Header with gradient */}
      <div className="relative h-24 bg-gradient-to-r from-primary via-purple-500 to-pink-500">
        {/* Verified badge */}
        {counsellor.verified && (
          <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800/90 rounded-full px-2 py-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-blue-500 text-sm">verified</span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Verified</span>
          </div>
        )}
        
        {/* Profile image */}
        <div className="absolute -bottom-12 left-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-bg-dark overflow-hidden bg-gray-200">
              <Image
                src={counsellor.photoURL}
                alt={counsellor.name}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            </div>
            {/* Status indicator */}
            <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-3 border-white dark:border-bg-dark ${status.dotColor} animate-pulse`} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-14 px-6 pb-6">
        {/* Name and title */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-text-primary dark:text-white">
            {counsellor.name}
          </h3>
          <p className="text-sm text-text-secondary">{counsellor.title}</p>
        </div>

        {/* Status badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
            <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
            {status.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-yellow-500 text-lg">star</span>
            <span className="font-semibold text-text-primary dark:text-white">{counsellor.rating}</span>
            <span className="text-text-secondary">({counsellor.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 text-text-secondary">
            <span className="material-symbols-outlined text-lg">work_history</span>
            <span>{counsellor.yearsExperience}+ yrs</span>
          </div>
          <div className="flex items-center gap-1 text-text-secondary">
            <span className="material-symbols-outlined text-lg">group</span>
            <span>{counsellor.sessionCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Bio */}
        <p className="text-sm text-text-secondary mb-4 line-clamp-3">
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
        <div className="flex items-center gap-2 mb-4 text-sm text-text-secondary">
          <span className="material-symbols-outlined text-lg">translate</span>
          <span>{counsellor.languages.join(", ")}</span>
        </div>

        {/* Available hours */}
        <div className="flex items-center gap-2 mb-5 text-sm text-text-secondary">
          <span className="material-symbols-outlined text-lg">schedule</span>
          <span>
            {counsellor.availableHours.start} - {counsellor.availableHours.end}
            <span className="text-xs ml-1">
              ({counsellor.availableHours.days.length === 7 ? "Every day" : 
                counsellor.availableHours.days.length === 5 ? "Weekdays" :
                counsellor.availableHours.days.slice(0, 2).map(d => d.slice(0, 3)).join(", ") + "..."})
            </span>
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onWhatsAppClick(counsellor)}
            disabled={!isAvailable}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
              isAvailable
                ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/25"
                : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </button>
          
          <button
            onClick={() => onCallClick(counsellor)}
            disabled={!isAvailable}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
              isAvailable
                ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25"
                : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            <span className="material-symbols-outlined">call</span>
            Call
          </button>
        </div>

        {/* Busy/Offline message */}
        {!isAvailable && (
          <p className="text-center text-xs text-text-secondary mt-3">
            {counsellor.status === "busy" 
              ? "Currently in a session. Please try again later." 
              : "Counsellor is offline. Check availability hours."}
          </p>
        )}
      </div>
    </div>
  );
}
