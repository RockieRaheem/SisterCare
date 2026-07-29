import {
  Counsellor,
  CounsellorSpecialty,
  CounsellorStatus,
} from "@/types";

type Json = Record<string, unknown>;

function validDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const result = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(result.getTime()) ? undefined : result;
}

/** Normalize untrusted JSON storage into the domain type used by matching. */
export function counsellorFromDatabaseRow(
  row: Json,
): Counsellor & { lastHeartbeat?: Date } {
  const profile =
    row.profile && typeof row.profile === "object" ? (row.profile as Json) : {};
  const hours =
    profile.availableHours && typeof profile.availableHours === "object"
      ? (profile.availableHours as Json)
      : {};
  const days = Array.isArray(hours.days) ? hours.days.map(String) : [];
  return {
    ...profile,
    id: String(row.id),
    name:
      typeof profile.name === "string" ? profile.name : "Unnamed counsellor",
    title: typeof profile.title === "string" ? profile.title : "Counsellor",
    bio: typeof profile.bio === "string" ? profile.bio : "",
    photoURL: typeof profile.photoURL === "string" ? profile.photoURL : "",
    specializations: Array.isArray(profile.specializations)
      ? (profile.specializations as CounsellorSpecialty[])
      : [],
    languages: Array.isArray(profile.languages)
      ? profile.languages.map(String)
      : [],
    phoneNumber:
      typeof profile.phoneNumber === "string" ? profile.phoneNumber : "",
    whatsappNumber:
      typeof profile.whatsappNumber === "string"
        ? profile.whatsappNumber
        : typeof profile.phoneNumber === "string"
          ? profile.phoneNumber
          : "",
    rating: typeof profile.rating === "number" ? profile.rating : 0,
    reviewCount:
      typeof profile.reviewCount === "number" ? profile.reviewCount : 0,
    yearsExperience:
      typeof profile.yearsExperience === "number"
        ? profile.yearsExperience
        : 0,
    sessionCount:
      typeof profile.sessionCount === "number" ? profile.sessionCount : 0,
    availableHours: {
      start: typeof hours.start === "string" ? hours.start : "08:00",
      end: typeof hours.end === "string" ? hours.end : "17:00",
      days,
    },
    credentialExpiresAt: validDate(profile.credentialExpiresAt),
    crisisTrained: profile.crisisTrained === true,
    supervisorId:
      typeof profile.supervisorId === "string" ? profile.supervisorId : "",
    status: (row.status as CounsellorStatus) || "offline",
    verified: row.verification_status === "verified",
    verificationStatus:
      (row.verification_status as Counsellor["verificationStatus"]) || "pending",
    acceptingNewSessions: row.accepting_new_sessions === true,
    maxConcurrentSessions:
      typeof row.max_concurrent_sessions === "number"
        ? row.max_concurrent_sessions
        : 1,
    createdAt: validDate(row.created_at) || new Date(),
    lastHeartbeat: validDate(row.last_heartbeat),
  } as Counsellor & { lastHeartbeat?: Date };
}
