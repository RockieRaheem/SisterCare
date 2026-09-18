import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { Doctor, DoctorAppointment } from "@/types";

export const DOCTOR_PRESENCE_TTL_SECONDS = 120;
const ACTIVE_APPOINTMENT_STATES = [
  "requested",
  "booked",
  "in_consultation",
] as const;
type Row = Record<string, unknown>;

function asDate(value: unknown): Date | undefined {
  return value ? new Date(String(value)) : undefined;
}

export function doctorIsAvailable(
  row: Row,
  now = new Date(),
): boolean {
  const heartbeat = asDate(row.last_heartbeat_at);
  return Boolean(
    row.verification_status === "verified" &&
      row.accepting_appointments === true &&
      row.status === "available" &&
      heartbeat &&
      now.getTime() - heartbeat.getTime() <=
        DOCTOR_PRESENCE_TTL_SECONDS * 1000 &&
      asDate(row.credential_expires_at) &&
      asDate(row.credential_expires_at)!.getTime() >= now.getTime(),
  );
}

function publicDoctor(row: Row, now = new Date()): Doctor {
  return {
    id: String(row.id),
    professionalName: String(row.professional_name || "SisterCare doctor"),
    title: String(row.title || "Doctor"),
    bio: String(row.bio || ""),
    specializations: Array.isArray(row.specializations)
      ? row.specializations.map(String)
      : [],
    languages: Array.isArray(row.languages)
      ? row.languages.map(String)
      : ["English"],
    yearsExperience:
      typeof row.years_experience === "number" ? row.years_experience : 0,
    photoURL: "",
    status: doctorIsAvailable(row, now) ? "available" : "offline",
    acceptingAppointments:
      row.accepting_appointments === true &&
      row.verification_status === "verified",
    verificationStatus: row.verification_status as Doctor["verificationStatus"],
  };
}

function appointment(row: Row): DoctorAppointment {
  const doctor = row.doctors && typeof row.doctors === "object"
    ? (row.doctors as Row)
    : null;
  return {
    id: String(row.id),
    memberId: String(row.member_id),
    doctorId: row.doctor_id ? String(row.doctor_id) : null,
    doctorName: doctor
      ? String(doctor.professional_name || "SisterCare doctor")
      : undefined,
    status: row.status as DoctorAppointment["status"],
    urgency: row.urgency as DoctorAppointment["urgency"],
    specialty: String(row.specialty),
    memberSummary: String(row.member_summary || ""),
    preferredLanguage: String(row.preferred_language || "English"),
    scheduledFor: asDate(row.scheduled_for),
    requestedAt: asDate(row.requested_at) || new Date(),
    respondedAt: asDate(row.responded_at),
    consultationStartedAt: asDate(row.consultation_started_at),
    completedAt: asDate(row.completed_at),
  };
}

export function rankDoctors(
  doctors: Doctor[],
  specialty: string,
  language: string,
): Doctor[] {
  const requestedSpecialty = specialty.trim().toLowerCase();
  const requestedLanguage = language.trim().toLowerCase();
  return [...doctors].sort((left, right) => {
    const score = (doctor: Doctor) =>
      (doctor.status === "available" ? 100 : 0) +
      (doctor.specializations.some(
        (item) => item.toLowerCase() === requestedSpecialty,
      )
        ? 30
        : 0) +
      (doctor.languages.some(
        (item) => item.toLowerCase() === requestedLanguage,
      )
        ? 10
        : 0) +
      Math.min(doctor.yearsExperience, 20);
    return score(right) - score(left);
  });
}

export async function listVerifiedDoctors(): Promise<Doctor[]> {
  const now = new Date();
  const { data, error } = await getSupabaseAdmin()
    .from("doctors")
    .select(
      "id,professional_name,title,bio,specializations,languages,years_experience,verification_status,status,accepting_appointments,last_heartbeat_at,credential_expires_at",
    )
    .eq("verification_status", "verified")
    .gte("credential_expires_at", now.toISOString().slice(0, 10))
    .order("professional_name");
  if (error) throw new Error(error.message);
  return (data || []).map((row) => publicDoctor(row as Row, now));
}

export async function listMemberDoctorAppointments(
  memberId: string,
): Promise<DoctorAppointment[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("doctor_appointments")
    .select("*,doctors(professional_name)")
    .eq("member_id", memberId)
    .order("requested_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => appointment(row as Row));
}

export async function requestDoctorAppointment(params: {
  memberId: string;
  specialty: string;
  summary: string;
  preferredLanguage: string;
  preferredDoctorId?: string;
  urgency?: "routine" | "urgent" | "critical";
}): Promise<DoctorAppointment> {
  const db = getSupabaseAdmin();
  const { data: existing, error: existingError } = await db
    .from("doctor_appointments")
    .select("id")
    .eq("member_id", params.memberId)
    .in("status", [...ACTIVE_APPOINTMENT_STATES])
    .limit(1);
  if (existingError) throw new Error(existingError.message);
  if (existing?.length) {
    throw new Error("An active doctor request already exists");
  }

  const doctors = rankDoctors(
    await listVerifiedDoctors(),
    params.specialty,
    params.preferredLanguage,
  );
  const selected = params.preferredDoctorId
    ? doctors.find((doctor) => doctor.id === params.preferredDoctorId)
    : doctors.find((doctor) => doctor.status === "available") || doctors[0];
  if (params.preferredDoctorId && !selected) {
    throw new Error("The selected doctor is not currently verified");
  }

  const { data, error } = await db
    .from("doctor_appointments")
    .insert({
      member_id: params.memberId,
      doctor_id: selected?.id || null,
      status: "requested",
      urgency: params.urgency || "routine",
      specialty: params.specialty.trim().slice(0, 100),
      member_summary: params.summary.trim().slice(0, 500),
      preferred_language: params.preferredLanguage.trim().slice(0, 80),
    })
    .select("*,doctors(professional_name)")
    .single();
  if (error) throw new Error(error.message);
  return appointment(data as Row);
}

export async function cancelDoctorAppointment(
  memberId: string,
  appointmentId: string,
): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from("doctor_appointments")
    .update({ status: "cancelled", cancellation_reason: "Cancelled by member" })
    .eq("id", appointmentId)
    .eq("member_id", memberId)
    .in("status", ["requested", "booked"])
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only a pending appointment can be cancelled");
}
