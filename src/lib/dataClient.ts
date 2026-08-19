/** Supabase-backed client data access. */
import {
  AgentEvent,
  ChatConversation,
  ChatMessage,
  Counsellor,
  CounsellorSpecialty,
  CounsellorStatus,
  CycleData,
  CycleHistory,
  PregnancyData,
  Reminder,
  SymptomLog,
  TriageSeverity,
  UserPreferences,
  UserProfile,
} from "@/types";
import { calculateNextPeriod, getCurrentPhase } from "./cycle";
import {
  DEFAULT_PRIVACY_PREFERENCES,
  normalizeMemberAgeBand,
  normalizePrivacyPreferences,
  normalizeSupportAlias,
} from "./privacyPreferences";
import { getSupabaseBrowserClient } from "./supabase";

export { calculateNextPeriod, getCycleInfo, getCurrentPhase } from "./cycle";

const DEFAULT_PREFERENCES: UserPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  reminderDaysBefore: 3,
  theme: "system",
  language: "en",
};

type JsonRecord = Record<string, unknown>;
const client = () => getSupabaseBrowserClient();
const asDate = (value: unknown, fallback = new Date()) =>
  value ? new Date(value as string) : fallback;
const dateValue = (value: Date | undefined) => value?.toISOString();

function fail(error: { message?: string } | null) {
  if (error) throw new Error(error.message);
}
function required<T>(value: T | null, context: string): T {
  if (value === null) throw new Error(`Supabase returned no ${context}.`);
  return value;
}

function reviveCycle(raw: JsonRecord | null): CycleData | null {
  if (!raw) return null;
  return {
    ...(raw as unknown as CycleData),
    lastPeriodDate: asDate(raw.lastPeriodDate),
    nextPeriodDate: asDate(raw.nextPeriodDate),
  };
}

function revivePregnancy(raw: JsonRecord | null): PregnancyData | null {
  if (!raw) return null;
  const value = raw as unknown as PregnancyData;
  return {
    ...value,
    estimatedDueDate: dateValue(value.estimatedDueDate) ? asDate(raw.estimatedDueDate) : undefined,
    lastMenstrualPeriodDate: dateValue(value.lastMenstrualPeriodDate) ? asDate(raw.lastMenstrualPeriodDate) : undefined,
    conceptionDate: dateValue(value.conceptionDate) ? asDate(raw.conceptionDate) : undefined,
    birthDate: dateValue(value.birthDate) ? asDate(raw.birthDate) : undefined,
    createdAt: raw.createdAt ? asDate(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? asDate(raw.updatedAt) : undefined,
  };
}

function serialiseCycle(data: Partial<CycleData>): JsonRecord {
  return {
    ...data,
    lastPeriodDate: dateValue(data.lastPeriodDate),
    nextPeriodDate: dateValue(data.nextPeriodDate),
  };
}

function serialisePregnancy(data: Partial<PregnancyData>): JsonRecord {
  return {
    ...data,
    estimatedDueDate: dateValue(data.estimatedDueDate),
    lastMenstrualPeriodDate: dateValue(data.lastMenstrualPeriodDate),
    conceptionDate: dateValue(data.conceptionDate),
    birthDate: dateValue(data.birthDate),
    createdAt: dateValue(data.createdAt),
    updatedAt: new Date().toISOString(),
  };
}

function profileFromRow(row: JsonRecord): UserProfile {
  return {
    uid: row.id as string,
    email: (row.email as string) || "",
    displayName: (row.display_name as string | null) || null,
    supportAlias: normalizeSupportAlias(row.support_alias),
    ageBand: normalizeMemberAgeBand(row.age_band),
    photoURL: (row.photo_url as string | null) || null,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
    onboardingCompleted: Boolean(row.onboarding_completed),
    preferences: { ...DEFAULT_PREFERENCES, ...((row.preferences as JsonRecord) || {}) },
    privacyPreferences: normalizePrivacyPreferences(
      row.privacy_preferences || DEFAULT_PRIVACY_PREFERENCES,
    ),
    cycleData: reviveCycle((row.cycle_data as JsonRecord | null) || null),
    pregnancyData: revivePregnancy((row.pregnancy_data as JsonRecord | null) || null),
    registrationIntent: row.registration_intent === "counsellor" ? "counsellor" : "member",
    role: row.role as UserProfile["role"],
    adultConfirmed: row.adult_confirmed === true,
    pilotConsentVersion: (row.pilot_consent_version as string | null) || null,
    pilotConsentAt: row.pilot_consent_at ? asDate(row.pilot_consent_at) : null,
  };
}

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string | null = null,
  photoURL: string | null = null,
  registrationIntent: "member" | "counsellor" = "member",
): Promise<UserProfile> {
  const { data, error } = await client().from("profiles").upsert({
    id: uid,
    email,
    display_name: displayName,
    photo_url: photoURL,
    registration_intent: registrationIntent,
  }).select().single();
  fail(error);
  return profileFromRow(data as JsonRecord);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await client().from("profiles").select("*").eq("id", uid).maybeSingle();
  fail(error);
  return data ? profileFromRow(data as JsonRecord) : null;
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const payload: JsonRecord = {};
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.displayName !== undefined) payload.display_name = updates.displayName;
  if (updates.supportAlias !== undefined) {
    payload.support_alias = normalizeSupportAlias(updates.supportAlias);
  }
  if (updates.ageBand !== undefined) payload.age_band = updates.ageBand;
  if (updates.photoURL !== undefined) payload.photo_url = updates.photoURL;
  if (updates.onboardingCompleted !== undefined) payload.onboarding_completed = updates.onboardingCompleted;
  if (updates.preferences !== undefined) payload.preferences = updates.preferences;
  if (updates.privacyPreferences !== undefined) {
    payload.privacy_preferences = normalizePrivacyPreferences(
      updates.privacyPreferences,
    );
  }
  if (updates.cycleData !== undefined) payload.cycle_data = updates.cycleData ? serialiseCycle(updates.cycleData) : null;
  if (updates.pregnancyData !== undefined) payload.pregnancy_data = updates.pregnancyData ? serialisePregnancy(updates.pregnancyData) : null;
  if (updates.registrationIntent !== undefined) payload.registration_intent = updates.registrationIntent;
  const { error } = await client().from("profiles").update(payload).eq("id", uid);
  fail(error);
}

export async function updateUserPreferences(uid: string, preferences: Partial<UserPreferences>): Promise<void> {
  const existing = await getUserProfile(uid);
  await updateUserProfile(uid, { preferences: { ...DEFAULT_PREFERENCES, ...existing?.preferences, ...preferences } });
}

export async function saveCycleData(uid: string, cycleData: Partial<CycleData>): Promise<void> {
  const existing = await getUserProfile(uid);
  await updateUserProfile(uid, { cycleData: { ...existing?.cycleData, ...cycleData } as CycleData });
}

export async function completeOnboarding(uid: string, lastPeriodDate: Date, cycleLength: number, periodLength: number): Promise<void> {
  const nextPeriodDate = calculateNextPeriod(lastPeriodDate, cycleLength);
  const { phase } = getCurrentPhase(lastPeriodDate, cycleLength, periodLength);
  await updateUserProfile(uid, {
    onboardingCompleted: true,
    cycleData: { lastPeriodDate, cycleLength, periodLength, nextPeriodDate, currentPhase: phase as CycleData["currentPhase"], symptoms: [], history: [] },
  });
}

export async function savePregnancyData(uid: string, pregnancyData: Partial<PregnancyData>): Promise<void> {
  const existing = await getUserProfile(uid);
  await updateUserProfile(uid, {
    pregnancyData: {
      ...existing?.pregnancyData,
      ...pregnancyData,
      isPregnant: pregnancyData.isPregnant ?? existing?.pregnancyData?.isPregnant ?? false,
      gaveBirth: pregnancyData.gaveBirth ?? existing?.pregnancyData?.gaveBirth ?? false,
    },
  });
}

export async function clearPregnancyData(uid: string): Promise<void> { await updateUserProfile(uid, { pregnancyData: null }); }

export async function updateCycleAfterBirth(uid: string, birthDate: Date, cycleLength = 28, periodLength = 5): Promise<void> {
  const nextPeriodDate = calculateNextPeriod(birthDate, cycleLength);
  const { phase } = getCurrentPhase(birthDate, cycleLength, periodLength);
  await updateUserProfile(uid, { pregnancyData: null, cycleData: { lastPeriodDate: birthDate, cycleLength, periodLength, nextPeriodDate, currentPhase: phase as CycleData["currentPhase"], symptoms: [], history: [] } });
}

async function addRecord(uid: string, recordType: string, payload: JsonRecord): Promise<string> {
  const { data, error } = await client().from("user_records").insert({ user_id: uid, record_type: recordType, payload }).select("id").single();
  fail(error); return required(data, "record").id;
}
async function records(uid: string, recordType: string) {
  const { data, error } = await client().from("user_records").select("*").eq("user_id", uid).eq("record_type", recordType).order("created_at", { ascending: false });
  fail(error); return (data || []) as Array<JsonRecord>;
}

export async function logSymptoms(uid: string, symptomLog: Omit<SymptomLog, "id">): Promise<string> {
  return addRecord(uid, "symptom", { ...symptomLog, date: symptomLog.date.toISOString() });
}
export async function getSymptoms(uid: string, startDate: Date, endDate: Date): Promise<SymptomLog[]> {
  return (await records(uid, "symptom")).map((row) => ({ id: row.id as string, ...(row.payload as JsonRecord), date: asDate((row.payload as JsonRecord).date) } as SymptomLog)).filter((item) => item.date >= startDate && item.date <= endDate);
}
export async function logCycleHistory(uid: string, cycle: Omit<CycleHistory, "id">): Promise<string> {
  return addRecord(uid, "cycle_history", { ...cycle, startDate: cycle.startDate.toISOString(), endDate: dateValue(cycle.endDate || undefined) });
}
export async function getCycleHistory(uid: string, count = 12): Promise<CycleHistory[]> {
  return (await records(uid, "cycle_history")).slice(0, count).map((row) => ({ id: row.id as string, ...(row.payload as JsonRecord), startDate: asDate((row.payload as JsonRecord).startDate), endDate: (row.payload as JsonRecord).endDate ? asDate((row.payload as JsonRecord).endDate) : null } as CycleHistory));
}

export async function createConversation(uid: string, type: "ai_support" | "counsellor" = "ai_support"): Promise<string> {
  const { data, error } = await client().from("conversations").insert({ user_id: uid, type }).select("id").single(); fail(error); return required(data, "conversation").id;
}
export async function getOrCreateConversation(uid: string, type: "ai_support" | "counsellor" = "ai_support"): Promise<string> {
  const { data, error } = await client().from("conversations").select("id").eq("user_id", uid).eq("type", type).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle(); fail(error); return data?.id || createConversation(uid, type);
}
export async function addMessage(conversationId: string, message: Omit<ChatMessage, "id" | "timestamp" | "read">): Promise<string> {
  const { data, error } = await client().from("messages").insert({ conversation_id: conversationId, sender: message.sender, content: message.content, metadata: message.metadata || null }).select("id").single(); fail(error); return required(data, "message").id;
}
export async function getMessages(conversationId: string, count = 50): Promise<ChatMessage[]> {
  const { data, error } = await client().from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(count); fail(error); return (data || []).map((row) => ({ id: row.id, conversationId: row.conversation_id, sender: row.sender, content: row.content, metadata: row.metadata || undefined, read: row.read, timestamp: asDate(row.created_at) } as ChatMessage));
}
export async function getUserConversations(uid: string): Promise<ChatConversation[]> {
  const { data, error } = await client().from("conversations").select("*").eq("user_id", uid).order("updated_at", { ascending: false }); fail(error); return (data || []).map((row) => ({ id: row.id, userId: row.user_id, title: row.title, type: row.type, status: row.status, retentionMode: row.retention_mode === "session" ? "session" : "account", lastMessage: row.last_message || undefined, messageCount: row.message_count, activeCounsellorId: row.active_counsellor_id || undefined, createdAt: asDate(row.created_at), updatedAt: asDate(row.updated_at) } as ChatConversation));
}
export async function createNewChat(uid: string, title = "New Chat"): Promise<string> { const { data, error } = await client().from("conversations").insert({ user_id: uid, title, type: "ai_support" }).select("id").single(); fail(error); return required(data, "conversation").id; }
export async function updateConversationTitle(id: string, title: string): Promise<void> { const { error } = await client().from("conversations").update({ title }).eq("id", id); fail(error); }
export async function deleteConversation(id: string): Promise<void> { const { error } = await client().from("conversations").delete().eq("id", id); fail(error); }
export async function updateConversationPreview(id: string, lastMessage: string): Promise<void> { const { data, error } = await client().from("conversations").select("message_count").eq("id", id).single(); fail(error); const result = await client().from("conversations").update({ last_message: lastMessage.slice(0, 100), message_count: (required(data, "conversation").message_count || 0) + 1 }).eq("id", id); fail(result.error); }

export async function createReminder(uid: string, reminder: Omit<Reminder, "id" | "sent" | "read">): Promise<string> { return addRecord(uid, "reminder", { ...reminder, scheduledFor: reminder.scheduledFor.toISOString(), sent: false, read: false }); }
export async function getPendingReminders(uid: string): Promise<Reminder[]> { return (await records(uid, "reminder")).map((row) => ({ id: row.id as string, ...(row.payload as JsonRecord), scheduledFor: asDate((row.payload as JsonRecord).scheduledFor) } as Reminder)).filter((item) => !item.sent).sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime()); }
export async function schedulePeriodReminders(uid: string, nextPeriodDate: Date, reminderDaysBefore = 3): Promise<void> { const date = new Date(nextPeriodDate); date.setDate(date.getDate() - reminderDaysBefore); if (date > new Date()) await createReminder(uid, { userId: uid, type: "period_coming", title: "Period Coming Soon", message: `Your period is expected in ${reminderDaysBefore} days. Time to prepare!`, scheduledFor: date }); }
export async function markReminderSent(uid: string, id: string): Promise<void> { const { data, error } = await client().from("user_records").select("payload").eq("id", id).eq("user_id", uid).single(); fail(error); const result = await client().from("user_records").update({ payload: { ...(required(data, "reminder").payload as JsonRecord), sent: true, sentAt: new Date().toISOString() } }).eq("id", id); fail(result.error); }
export async function markReminderRead(uid: string, id: string): Promise<void> { const { data, error } = await client().from("user_records").select("payload").eq("id", id).eq("user_id", uid).single(); fail(error); const result = await client().from("user_records").update({ payload: { ...(required(data, "reminder").payload as JsonRecord), read: true } }).eq("id", id); fail(result.error); }

function counsellorFromRow(row: JsonRecord): Counsellor { return { ...(row.profile as JsonRecord), id: row.id as string, status: row.status as CounsellorStatus, verificationStatus: row.verification_status as Counsellor["verificationStatus"], acceptingNewSessions: row.accepting_new_sessions as boolean, maxConcurrentSessions: row.max_concurrent_sessions as number, verified: row.verification_status === "verified", createdAt: asDate(row.created_at) } as Counsellor; }
export async function getCounsellors(): Promise<Counsellor[]> { const { data, error } = await client().from("counsellors").select("*"); fail(error); return (data || []).map((row) => counsellorFromRow(row as JsonRecord)).sort((a, b) => b.rating - a.rating); }
export async function getCounsellorsByStatus(status: CounsellorStatus): Promise<Counsellor[]> { return (await getCounsellors()).filter((item) => item.status === status); }
export async function getCounsellorsBySpecialty(specialty: CounsellorSpecialty): Promise<Counsellor[]> { return (await getCounsellors()).filter((item) => item.specializations.includes(specialty)); }
export async function getCounsellor(id: string): Promise<Counsellor | null> { const { data, error } = await client().from("counsellors").select("*").eq("id", id).maybeSingle(); fail(error); return data ? counsellorFromRow(data as JsonRecord) : null; }
export async function updateCounsellorStatus(id: string, status: CounsellorStatus): Promise<void> { const { error } = await client().from("counsellors").update({ status }).eq("id", id); fail(error); }
export async function createCounsellor(counsellor: Omit<Counsellor, "id" | "createdAt">): Promise<string> { const { data, error } = await client().from("counsellors").insert({ profile: counsellor, status: counsellor.status, verification_status: counsellor.verified ? "verified" : "pending" }).select("id").single(); fail(error); return required(data, "counsellor").id; }
export async function seedCounsellors(): Promise<void> { throw new Error("Sample counsellors are intentionally disabled. Register and verify real professionals through the KYC workflow."); }

export async function batchUpdateCounsellorAvailability(): Promise<{ updated: number; errors: number }> { return { updated: 0, errors: 0 }; }
export async function autoUpdateCounsellorStatus(id: string): Promise<CounsellorStatus | null> { return (await getCounsellor(id))?.status || null; }
export async function assignCounsellor(params: { specialty?: CounsellorSpecialty; preferredLanguage?: string }): Promise<Counsellor | null> { return (await getCounsellors()).filter((item) => item.status === "available" && item.verified && item.acceptingNewSessions && (!params.specialty || item.specializations.includes(params.specialty)) && (!params.preferredLanguage || item.languages.some((language) => language.toLowerCase() === params.preferredLanguage?.toLowerCase()))).sort((a, b) => b.rating - a.rating)[0] || null; }
export async function routeCounsellor(params: { specialty?: CounsellorSpecialty; preferredLanguage?: string }): Promise<Counsellor | null> { return assignCounsellor(params); }
export async function connectUserToCounsellor(params: { userId: string; counsellorId: string; reason: "user_request" | "risk_detected"; summary: string }): Promise<string> { const id = await getOrCreateConversation(params.userId, "counsellor"); await updateConversationTitle(id, "Counsellor Support"); await client().from("conversations").update({ active_counsellor_id: params.counsellorId }).eq("id", id); return id; }
export async function setActiveCounsellorOnConversation(params: { conversationId: string; counsellor: Counsellor }): Promise<void> { const { error } = await client().from("conversations").update({ active_counsellor_id: params.counsellor.id }).eq("id", params.conversationId); fail(error); }
export async function getActiveCounsellorForConversation(id: string): Promise<{ id: string; name: string; title: string; languages: string[]; specializations: string[]; phoneNumber: string; whatsappNumber: string } | null> { const { data, error } = await client().from("conversations").select("active_counsellor_id").eq("id", id).single(); fail(error); const counsellor = data?.active_counsellor_id ? await getCounsellor(data.active_counsellor_id) : null; return counsellor ? { id: counsellor.id, name: counsellor.name, title: counsellor.title, languages: counsellor.languages, specializations: counsellor.specializations, phoneNumber: counsellor.phoneNumber, whatsappNumber: counsellor.whatsappNumber } : null; }

export async function logAgentEvent(params: { userId: string; type: AgentEvent["type"]; severity?: TriageSeverity; conversationId?: string; success?: boolean }): Promise<string> { return addRecord(params.userId, "agent_event", { ...params, success: params.success ?? true }); }
export async function getAgentEvents(uid: string, days = 30): Promise<AgentEvent[]> { const cutoff = Date.now() - Math.max(1, days) * 86400000; return (await records(uid, "agent_event")).filter((row) => new Date(row.created_at as string).getTime() >= cutoff).map((row) => ({ id: row.id as string, ...(row.payload as JsonRecord), createdAt: asDate(row.created_at) } as AgentEvent)); }
