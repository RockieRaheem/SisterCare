import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getClinicalRuntimeIssues } from "@/lib/clinicalGovernance";
import { Doctor, DoctorAppointment, DoctorAppointmentStatus, DoctorPrescription } from "@/types";

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

/** PostgreSQL date credentials remain valid through their stated UTC day. */
function credentialIsCurrent(value: unknown, now: Date): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const expiry = new Date(`${value}T23:59:59.999Z`);
  return !Number.isNaN(expiry.getTime()) && expiry.getTime() >= now.getTime();
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
      credentialIsCurrent(row.credential_expires_at, now),
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

const DOCTOR_TRANSITIONS: Record<DoctorAppointmentStatus, DoctorAppointmentStatus[]> = {
  requested: ["booked", "declined", "cancelled"],
  booked: ["in_consultation", "declined", "cancelled"],
  in_consultation: ["completed"],
  completed: [],
  declined: [],
  cancelled: [],
};

export function assertDoctorAppointmentTransition(
  from: DoctorAppointmentStatus,
  to: DoctorAppointmentStatus,
) {
  if (!DOCTOR_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid doctor appointment transition: ${from} to ${to}`);
  }
}

export async function updateDoctorPresence(
  doctorId: string,
  status: "available" | "offline",
): Promise<"available" | "busy" | "offline"> {
  const db = getSupabaseAdmin();
  const { data: doctor, error } = await db
    .from("doctors")
    .select("verification_status,credential_expires_at")
    .eq("id", doctorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!doctor || doctor.verification_status !== "verified") {
    throw new Error("Verified doctor access required");
  }
  if (new Date(`${doctor.credential_expires_at}T23:59:59.999Z`).getTime() < Date.now()) {
    throw new Error("Doctor credential has expired");
  }
  const { count, error: countError } = await db
    .from("doctor_appointments")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", doctorId)
    .eq("status", "in_consultation");
  if (countError) throw new Error(countError.message);
  const effective = status === "offline" ? "offline" : count ? "busy" : "available";
  const { error: updateError } = await db.from("doctors").update({
    status: effective,
    accepting_appointments: status === "available",
    last_heartbeat_at: status === "available" ? new Date().toISOString() : null,
  }).eq("id", doctorId);
  if (updateError) throw new Error(updateError.message);
  return effective;
}

export async function getDoctorPresence(
  doctorId: string,
): Promise<"available" | "busy" | "offline"> {
  const now = new Date();
  const { data, error } = await getSupabaseAdmin()
    .from("doctors")
    .select("verification_status,credential_expires_at,status,accepting_appointments,last_heartbeat_at")
    .eq("id", doctorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.verification_status !== "verified") return "offline";
  const heartbeat = asDate(data.last_heartbeat_at);
  if (!credentialIsCurrent(data.credential_expires_at, now) || !heartbeat || now.getTime() - heartbeat.getTime() > DOCTOR_PRESENCE_TTL_SECONDS * 1000) {
    return "offline";
  }
  if (data.status === "busy") return "busy";
  return doctorIsAvailable(data as Row, now) ? "available" : "offline";
}

export async function listDoctorAppointments(
  doctorId: string,
): Promise<DoctorAppointment[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("doctor_appointments")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("requested_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => appointment(row as Row));
}

export async function transitionDoctorAppointment(params: {
  doctorId: string;
  appointmentId: string;
  to: "booked" | "in_consultation" | "completed" | "declined";
}): Promise<DoctorAppointment> {
  const db = getSupabaseAdmin();
  const { data: current, error } = await db
    .from("doctor_appointments")
    .select("*")
    .eq("id", params.appointmentId)
    .eq("doctor_id", params.doctorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!current) throw new Error("Doctor appointment not found");
  assertDoctorAppointmentTransition(
    current.status as DoctorAppointmentStatus,
    params.to,
  );
  const now = new Date().toISOString();
  const timestamps = params.to === "booked"
    ? { responded_at: now, scheduled_for: now }
    : params.to === "in_consultation"
      ? { consultation_started_at: now }
      : params.to === "completed"
        ? { completed_at: now }
        : { responded_at: now };
  const { data, error: updateError } = await db
    .from("doctor_appointments")
    .update({ status: params.to, ...timestamps })
    .eq("id", params.appointmentId)
    .eq("doctor_id", params.doctorId)
    .eq("status", current.status)
    .select("*")
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!data) throw new Error("Appointment changed before this action; refresh and retry");
  if (["in_consultation", "completed"].includes(params.to)) {
    await db.from("doctors").update({
      status: params.to === "in_consultation" ? "busy" : "available",
      last_heartbeat_at: now,
    }).eq("id", params.doctorId).eq("verification_status", "verified");
  }
  return appointment(data as Row);
}

export interface PrescriptionDraft {
  medicineName: string;
  strength: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
  clinicalAttestation: boolean;
}

export function validatePrescriptionDraft(
  input: Partial<PrescriptionDraft>,
): { valid: true; value: PrescriptionDraft } | { valid: false; error: string } {
  const required: Array<keyof Omit<PrescriptionDraft, "instructions" | "clinicalAttestation">> = [
    "medicineName", "strength", "dose", "route", "frequency", "duration", "quantity",
  ];
  for (const key of required) {
    if (typeof input[key] !== "string" || !input[key]!.trim()) {
      return { valid: false, error: `${key} is required` };
    }
  }
  if (input.clinicalAttestation !== true) {
    return { valid: false, error: "Clinical assessment attestation is required" };
  }
  return { valid: true, value: {
    medicineName: input.medicineName!.trim().slice(0, 160),
    strength: input.strength!.trim().slice(0, 80),
    dose: input.dose!.trim().slice(0, 120),
    route: input.route!.trim().slice(0, 80),
    frequency: input.frequency!.trim().slice(0, 120),
    duration: input.duration!.trim().slice(0, 120),
    quantity: input.quantity!.trim().slice(0, 80),
    instructions: typeof input.instructions === "string" ? input.instructions.trim().slice(0, 1000) : "",
    clinicalAttestation: true,
  } };
}

function prescription(row: Row): DoctorPrescription {
  const doctor = row.doctors && typeof row.doctors === "object" ? row.doctors as Row : null;
  return {
    id: String(row.id), appointmentId: String(row.appointment_id), memberId: String(row.member_id), doctorId: String(row.doctor_id),
    doctorName: doctor ? String(doctor.professional_name || "SisterCare doctor") : undefined,
    medicineName: String(row.medicine_name), strength: String(row.strength), dose: String(row.dose), route: String(row.route),
    frequency: String(row.frequency), duration: String(row.duration), quantity: String(row.quantity), instructions: String(row.instructions || ""),
    status: row.status as DoctorPrescription["status"], issuedAt: asDate(row.issued_at) || new Date(),
    voidedAt: asDate(row.voided_at), voidReason: row.void_reason ? String(row.void_reason) : undefined,
  };
}

export async function issueDoctorPrescription(params: {
  doctorId: string;
  appointmentId: string;
  draft: PrescriptionDraft;
}): Promise<DoctorPrescription> {
  if (getClinicalRuntimeIssues().length > 0) {
    throw new Error("Prescription issuance is paused until the clinical release review is complete");
  }
  const db = getSupabaseAdmin();
  const { data: visit, error } = await db.from("doctor_appointments").select("member_id,status").eq("id", params.appointmentId).eq("doctor_id", params.doctorId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!visit || !["in_consultation", "completed"].includes(visit.status)) {
    throw new Error("A doctor may prescribe only after starting the assigned consultation");
  }
  const { data, error: insertError } = await db.from("doctor_prescriptions").insert({
    appointment_id: params.appointmentId, member_id: visit.member_id, doctor_id: params.doctorId,
    medicine_name: params.draft.medicineName, strength: params.draft.strength, dose: params.draft.dose,
    route: params.draft.route, frequency: params.draft.frequency, duration: params.draft.duration,
    quantity: params.draft.quantity, instructions: params.draft.instructions, clinical_attestation: true,
  }).select("*,doctors(professional_name)").single();
  if (insertError) throw new Error(insertError.message);
  return prescription(data as Row);
}

export async function listPrescriptions(params: { memberId?: string; doctorId?: string }): Promise<DoctorPrescription[]> {
  let query = getSupabaseAdmin().from("doctor_prescriptions").select("*,doctors(professional_name)").order("issued_at", { ascending: false }).limit(100);
  if (params.memberId) query = query.eq("member_id", params.memberId);
  if (params.doctorId) query = query.eq("doctor_id", params.doctorId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => prescription(row as Row));
}

export async function voidDoctorPrescription(params: {
  doctorId: string;
  prescriptionId: string;
  reason: string;
}): Promise<DoctorPrescription> {
  const reason = params.reason.trim();
  if (reason.length < 10 || reason.length > 500) {
    throw new Error("Record a clear withdrawal reason between 10 and 500 characters");
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("doctor_prescriptions")
    .update({
      status: "voided",
      voided_at: new Date().toISOString(),
      voided_by: params.doctorId,
      void_reason: reason,
    })
    .eq("id", params.prescriptionId)
    .eq("doctor_id", params.doctorId)
    .eq("status", "issued")
    .select("*,doctors(professional_name)")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only your currently issued prescription can be withdrawn");
  await db.from("audit_events").insert({
    event_type: "doctor.prescription_voided",
    actor_id: params.doctorId,
    subject_id: params.prescriptionId,
    metadata: { appointmentId: data.appointment_id, reasonRecorded: true },
  });
  return prescription(data as Row);
}

export interface DoctorMessage {
  id: string;
  appointmentId: string;
  senderId: string;
  senderRole: "member" | "doctor";
  text: string;
  createdAt: Date;
}

async function doctorAppointmentParticipant(appointmentId: string, uid: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("doctor_appointments")
    .select("id,member_id,doctor_id,status")
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || (data.member_id !== uid && data.doctor_id !== uid)) {
    throw new Error("Doctor appointment not found");
  }
  return {
    ...data,
    role: data.doctor_id === uid ? "doctor" as const : "member" as const,
  };
}

export async function listDoctorMessages(
  appointmentId: string,
  uid: string,
): Promise<DoctorMessage[]> {
  await doctorAppointmentParticipant(appointmentId, uid);
  const { data, error } = await getSupabaseAdmin()
    .from("doctor_messages")
    .select("id,appointment_id,sender_id,sender_role,text,created_at")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    appointmentId: row.appointment_id,
    senderId: row.sender_id,
    senderRole: row.sender_role as "member" | "doctor",
    text: row.text,
    createdAt: new Date(row.created_at),
  }));
}

export async function sendDoctorMessage(params: {
  appointmentId: string;
  uid: string;
  text: string;
  clientMessageId: string;
}): Promise<DoctorMessage> {
  const participant = await doctorAppointmentParticipant(
    params.appointmentId,
    params.uid,
  );
  if (!["booked", "in_consultation"].includes(participant.status)) {
    throw new Error("Messaging opens after the doctor accepts the request");
  }
  const text = params.text.trim().slice(0, 2000);
  if (!text) throw new Error("Message text is required");
  const { data, error } = await getSupabaseAdmin()
    .from("doctor_messages")
    .upsert({
      appointment_id: params.appointmentId,
      sender_id: params.uid,
      sender_role: participant.role,
      text,
      client_message_id: params.clientMessageId.slice(0, 120),
    }, { onConflict: "appointment_id,sender_id,client_message_id" })
    .select("id,appointment_id,sender_id,sender_role,text,created_at")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    appointmentId: data.appointment_id,
    senderId: data.sender_id,
    senderRole: data.sender_role as "member" | "doctor",
    text: data.text,
    createdAt: new Date(data.created_at),
  };
}
