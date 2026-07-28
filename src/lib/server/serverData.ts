/**
 * Server-side data layer — SERVER ONLY. Never import from client components.
 *
 * Why this exists: API routes used to call src/lib/firestore.ts (the CLIENT
 * SDK), which has no authenticated user on the server, so security rules
 * silently denied every write the agent made. This module provides Admin-SDK
 * implementations of every function the server calls. Admin access bypasses
 * rules, so callers MUST only pass identities proven by authenticateRequest().
 *
 * Each function falls back to the client-SDK implementation when the Admin
 * SDK isn't configured (dev checkouts without a service account) — same
 * behavior as before, with the startup warning from firebaseAdmin.ts.
 *
 * Pure logic (cycle math, counsellor scoring/ranking) is shared with the
 * client layer via src/lib/cycle.ts and src/lib/counsellorMatching.ts —
 * only the I/O differs here.
 */

import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { calculateNextPeriod, getCurrentPhase } from "../cycle";
import {
  rankCounsellors,
} from "../counsellorMatching";
import * as clientData from "../firestore";
import { evaluateCounsellorEligibility } from "../counsellorOperations";
import {
  AgentEvent,
  Counsellor,
  CounsellorSpecialty,
  CounsellorStatus,
  CycleData,
  PregnancyData,
  Reminder,
  SymptomLog,
  TriageSeverity,
  UserProfile,
} from "@/types";

// ============================================
// USER HEALTH DATA
// ============================================

export async function saveCycleData(
  uid: string,
  cycleData: Partial<CycleData>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return clientData.saveCycleData(uid, cycleData);

  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Cannot update cycle data because the user profile is missing");
  }

  const currentData = snap.data()?.cycleData || {};
  const updatedCycleData = {
    ...currentData,
    ...cycleData,
    lastPeriodDate: cycleData.lastPeriodDate
      ? Timestamp.fromDate(cycleData.lastPeriodDate)
      : currentData.lastPeriodDate,
    nextPeriodDate: cycleData.nextPeriodDate
      ? Timestamp.fromDate(cycleData.nextPeriodDate)
      : currentData.nextPeriodDate,
  };

  await ref.update({
    cycleData: updatedCycleData,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getConversationMemory(
  uid: string,
  conversationId: string,
  maximumMessages: number = 50,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const db = getAdminDb();
  if (!db) return [];

  const conversation = await db.collection("conversations").doc(conversationId).get();
  if (!conversation.exists || conversation.data()?.userId !== uid) {
    return [];
  }

  const snapshot = await db
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("timestamp", "desc")
    .limit(Math.min(Math.max(maximumMessages, 1), 50))
    .get();

  return snapshot.docs
    .reverse()
    .map((message) => {
      const data = message.data();
      if (typeof data.content !== "string" || !data.content.trim()) return null;
      return {
        role: data.sender === "user" ? "user" : "assistant",
        content: data.content.trim().slice(0, 4000),
      };
    })
    .filter(
      (message): message is { role: "user" | "assistant"; content: string } =>
        message !== null,
    );
}

export async function savePregnancyData(
  uid: string,
  pregnancyData: Partial<PregnancyData>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return clientData.savePregnancyData(uid, pregnancyData);

  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return;

  const currentPreg = snap.data()?.pregnancyData || {};
  const timestamp = new Date();
  const updatedPregnancyData = {
    ...currentPreg,
    ...pregnancyData,
    updatedAt: timestamp,
    isPregnant: pregnancyData.isPregnant ?? currentPreg.isPregnant ?? false,
    gaveBirth: pregnancyData.gaveBirth ?? currentPreg.gaveBirth ?? false,
    estimatedDueDate: pregnancyData.estimatedDueDate
      ? Timestamp.fromDate(pregnancyData.estimatedDueDate)
      : currentPreg.estimatedDueDate,
    lastMenstrualPeriodDate: pregnancyData.lastMenstrualPeriodDate
      ? Timestamp.fromDate(pregnancyData.lastMenstrualPeriodDate)
      : currentPreg.lastMenstrualPeriodDate,
    conceptionDate: pregnancyData.conceptionDate
      ? Timestamp.fromDate(pregnancyData.conceptionDate)
      : currentPreg.conceptionDate,
    birthDate: pregnancyData.birthDate
      ? Timestamp.fromDate(pregnancyData.birthDate)
      : currentPreg.birthDate,
    createdAt: currentPreg.createdAt || Timestamp.fromDate(timestamp),
  };

  await ref.update({
    pregnancyData: updatedPregnancyData,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function clearPregnancyData(uid: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return clientData.clearPregnancyData(uid);

  await db.collection("users").doc(uid).update({
    pregnancyData: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updateCycleAfterBirth(
  uid: string,
  birthDate: Date,
  cycleLength: number = 28,
  periodLength: number = 5,
): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    return clientData.updateCycleAfterBirth(
      uid,
      birthDate,
      cycleLength,
      periodLength,
    );
  }

  const nextPeriodDate = calculateNextPeriod(birthDate, cycleLength);
  const { phase } = getCurrentPhase(birthDate, cycleLength, periodLength);

  await db
    .collection("users")
    .doc(uid)
    .update({
      cycleData: {
        lastPeriodDate: Timestamp.fromDate(birthDate),
        cycleLength,
        periodLength,
        nextPeriodDate: Timestamp.fromDate(nextPeriodDate),
        currentPhase: phase,
        symptoms: [],
        history: [],
      },
      pregnancyData: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function logSymptoms(
  uid: string,
  symptomLog: Omit<SymptomLog, "id">,
): Promise<string> {
  const db = getAdminDb();
  if (!db) return clientData.logSymptoms(uid, symptomLog);

  const ref = await db
    .collection("users")
    .doc(uid)
    .collection("symptoms")
    .add({
      ...symptomLog,
      date: Timestamp.fromDate(symptomLog.date),
    });
  return ref.id;
}

export async function getSymptoms(
  uid: string,
  startDate: Date,
  endDate: Date,
): Promise<SymptomLog[]> {
  const db = getAdminDb();
  if (!db) return clientData.getSymptoms(uid, startDate, endDate);

  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("symptoms")
    .where("date", ">=", Timestamp.fromDate(startDate))
    .where("date", "<=", Timestamp.fromDate(endDate))
    .orderBy("date", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
  })) as SymptomLog[];
}

export async function createReminder(
  uid: string,
  reminder: Omit<Reminder, "id" | "sent" | "read">,
): Promise<string> {
  const db = getAdminDb();
  if (!db) return clientData.createReminder(uid, reminder);

  const ref = await db
    .collection("users")
    .doc(uid)
    .collection("reminders")
    .add({
      ...reminder,
      scheduledFor: Timestamp.fromDate(reminder.scheduledFor),
      sent: false,
      read: false,
    });
  return ref.id;
}

/** Mark unsent menstrual reminders inactive when a user enters pregnancy mode. */
export async function pausePeriodReminders(uid: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  const reminders = await db
    .collection("users")
    .doc(uid)
    .collection("reminders")
    .where("sent", "==", false)
    .get();
  const periodReminders = reminders.docs.filter(
    (reminder) =>
      reminder.data().type === "period_coming" ||
      reminder.data().type === "period_start",
  );
  for (let index = 0; index < periodReminders.length; index += 450) {
    const batch = db.batch();
    periodReminders.slice(index, index + 450).forEach((reminder) => {
      batch.update(reminder.ref, {
        sent: true,
        read: true,
        cancelledAt: FieldValue.serverTimestamp(),
        cancellationReason: "pregnancy_mode",
      });
    });
    await batch.commit();
  }
}

// ============================================
// AGENT OBSERVABILITY
// ============================================

export async function logAgentEvent(params: {
  userId: string;
  type: AgentEvent["type"];
  severity?: TriageSeverity;
  conversationId?: string;
  success?: boolean;
}): Promise<string> {
  const db = getAdminDb();
  if (!db) return clientData.logAgentEvent(params);

  const { userId, type, severity, conversationId, success } = params;
  const payload: Record<string, unknown> = {
    userId,
    type,
    success: success ?? true,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (severity !== undefined) payload.severity = severity;
  if (conversationId !== undefined) payload.conversationId = conversationId;

  const ref = await db
    .collection("users")
    .doc(userId)
    .collection("agentEvents")
    .add(payload);
  return ref.id;
}

// ============================================
// CONVERSATIONS & COUNSELLOR HANDOFF
// ============================================

async function getOrCreateConversation(
  uid: string,
  type: "ai_support" | "counsellor",
): Promise<string> {
  const db = getAdminDb();
  if (!db) return clientData.getOrCreateConversation(uid, type);

  const snapshot = await db
    .collection("conversations")
    .where("userId", "==", uid)
    .get();

  const active = snapshot.docs.find((doc) => {
    const data = doc.data();
    return data.type === type && data.status === "active";
  });
  if (active) return active.id;

  const ref = await db.collection("conversations").add({
    userId: uid,
    type,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function connectUserToCounsellor(params: {
  userId: string;
  counsellorId: string;
  reason: "user_request" | "risk_detected";
  summary: string;
}): Promise<string> {
  const db = getAdminDb();
  if (!db) return clientData.connectUserToCounsellor(params);

  const { userId, counsellorId, reason, summary } = params;
  const conversationId = await getOrCreateConversation(userId, "counsellor");

  await db.collection("conversations").doc(conversationId).update({
    title: "Counsellor Support",
    counsellorId,
    handoffReason: reason,
    handoffSummary: summary.substring(0, 500),
    status: "active",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return conversationId;
}

export async function setActiveCounsellorOnConversation(params: {
  conversationId: string;
  counsellor: Counsellor;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return clientData.setActiveCounsellorOnConversation(params);

  const { conversationId, counsellor } = params;
  await db
    .collection("conversations")
    .doc(conversationId)
    .update({
      activeCounsellorId: counsellor.id,
      activeCounsellor: {
        id: counsellor.id,
        name: counsellor.name,
        title: counsellor.title,
        languages: counsellor.languages,
        specializations: counsellor.specializations,
        phoneNumber: counsellor.phoneNumber,
        whatsappNumber: counsellor.whatsappNumber,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function getActiveCounsellorForConversation(
  conversationId: string,
): Promise<{
  id: string;
  name: string;
  title: string;
  languages: string[];
  specializations: string[];
  phoneNumber: string;
  whatsappNumber: string;
} | null> {
  const db = getAdminDb();
  if (!db) return clientData.getActiveCounsellorForConversation(conversationId);

  try {
    const snap = await db.collection("conversations").doc(conversationId).get();
    if (snap.exists) {
      return snap.data()?.activeCounsellor || null;
    }
  } catch (err) {
    console.warn("Failed to get active counsellor from conversation:", err);
  }
  return null;
}

// ============================================
// COUNSELLOR DIRECTORY & ROUTING
// ============================================

export async function getCounsellors(): Promise<Counsellor[]> {
  const db = getAdminDb();
  if (!db) return clientData.getCounsellors();

  const snapshot = await db
    .collection("counsellors")
    .orderBy("rating", "desc")
    .get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Counsellor[];
}

/**
 * Public directory state is calculated on the server from a verified profile,
 * a fresh sign-in heartbeat, and live assignments. Stored `status` is only a
 * cache for administration; it is never trusted for matching or display.
 */
export async function getLiveCounsellors(): Promise<Counsellor[]> {
  const db = getAdminDb();
  if (!db) return [];
  const cutoff = Date.now() - 120_000;
  const [profiles, presence, liveSessions] = await Promise.all([
    getCounsellors(),
    db.collection("presence").get(),
    db.collection("sessions").where("state", "in", ["matched", "accepted", "active"]).get(),
  ]);
  const presenceById = new Map(presence.docs.map((doc) => [doc.id, doc.data()]));
  const assigned = new Set(
    liveSessions.docs
      .map((doc) => doc.data().counsellorId)
      .filter((id): id is string => typeof id === "string" && Boolean(id)),
  );

  return profiles.map((profile) => {
    const heartbeat = presenceById.get(profile.id)?.lastHeartbeat;
    const isFresh = heartbeat instanceof Timestamp && heartbeat.toMillis() >= cutoff;
    const normalizedProfile = {
      ...profile,
      createdAt: profile.createdAt instanceof Timestamp ? profile.createdAt.toDate() : profile.createdAt,
      credentialExpiresAt: profile.credentialExpiresAt instanceof Timestamp ? profile.credentialExpiresAt.toDate() : profile.credentialExpiresAt,
    } as Counsellor;
    const operational = evaluateCounsellorEligibility(normalizedProfile, {
      activeLoad: assigned.has(profile.id) ? 1 : 0,
      priority: "normal",
    }).eligible;
    const status: CounsellorStatus =
      assigned.has(profile.id) ? "in_session" : operational && isFresh && presenceById.get(profile.id)?.status === "available" ? "available" : "offline";
    return { ...normalizedProfile, status };
  });
}

async function getCounsellorsBySpecialty(
  specialty: CounsellorSpecialty,
): Promise<Counsellor[]> {
  const db = getAdminDb();
  if (!db) return clientData.getCounsellorsBySpecialty(specialty);

  const snapshot = await db
    .collection("counsellors")
    .where("specializations", "array-contains", specialty)
    .orderBy("rating", "desc")
    .get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Counsellor[];
}

async function updateCounsellorStatus(
  counsellorId: string,
  status: CounsellorStatus,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return clientData.updateCounsellorStatus(counsellorId, status);

  await db.collection("counsellors").doc(counsellorId).update({ status });
}

async function getCounsellorLoads(): Promise<Map<string, number>> {
  const db = getAdminDb();
  const loadMap = new Map<string, number>();
  if (!db) return loadMap; // client path computes its own inside assignCounsellor

  try {
    const snapshot = await db
      .collection("conversations")
      .where("type", "==", "counsellor")
      .where("status", "==", "active")
      .get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const counsellorId = data.activeCounsellorId || data.counsellorId;
      if (counsellorId) {
        loadMap.set(counsellorId, (loadMap.get(counsellorId) || 0) + 1);
      }
    }
  } catch (err) {
    console.warn("Failed to count counsellor loads:", err);
  }
  return loadMap;
}

export async function routeCounsellor(params: {
  specialty?: CounsellorSpecialty;
  preferredLanguage?: string;
}): Promise<Counsellor | null> {
  const db = getAdminDb();
  if (!db) return clientData.routeCounsellor(params);

  const { specialty, preferredLanguage } = params;

  // Human handoff must never fall back to sample staff. Only a verified,
  // freshly signed-in counsellor who has no assignment can be selected.
  let candidates = (await getLiveCounsellors()).filter(
    (counsellor) =>
      counsellor.status === "available" &&
      (!specialty || counsellor.specializations.includes(specialty)),
  );
  if (preferredLanguage) {
    const languageMatches = candidates.filter((counsellor) =>
      counsellor.languages.some(
        (language) => language.toLowerCase() === preferredLanguage.toLowerCase(),
      ),
    );
    if (languageMatches.length > 0) candidates = languageMatches;
  }
  const loadMap = await getCounsellorLoads();
  return rankCounsellors(candidates, { specialty, preferredLanguage }, loadMap);
}

export async function batchUpdateCounsellorAvailability(): Promise<{
  updated: number;
  errors: number;
}> {
  const db = getAdminDb();
  if (!db) return clientData.batchUpdateCounsellorAvailability();

  let updated = 0;
  let errors = 0;

  try {
    const counsellors = await getLiveCounsellors();
    for (const counsellor of counsellors) {
      try {
        const correctStatus = counsellor.status;
        if (counsellor.status !== correctStatus) {
          await updateCounsellorStatus(counsellor.id, correctStatus);
          updated++;
        }
      } catch {
        errors++;
      }
    }
  } catch (err) {
    console.error("Failed to batch update counsellor availability:", err);
    errors++;
  }

  return { updated, errors };
}

export async function updateAgentManagedProfile(
  uid: string,
  input: {
    displayName?: string;
    language?: "en" | "lg";
    reminderDaysBefore?: number;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    theme?: "light" | "dark" | "system";
  },
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Profile updates require the Admin SDK");
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.displayName !== undefined) {
    const name = input.displayName.trim().slice(0, 80);
    if (!name) throw new Error("Display name cannot be empty");
    updates.displayName = name;
  }
  if (input.language !== undefined)
    updates["preferences.language"] = input.language;
  if (input.reminderDaysBefore !== undefined) {
    const days = Math.round(input.reminderDaysBefore);
    if (days < 0 || days > 14) {
      throw new Error("Reminder days must be between 0 and 14");
    }
    updates["preferences.reminderDaysBefore"] = days;
  }
  if (input.emailNotifications !== undefined)
    updates["preferences.emailNotifications"] = input.emailNotifications;
  if (input.pushNotifications !== undefined)
    updates["preferences.pushNotifications"] = input.pushNotifications;
  if (input.theme !== undefined)
    updates["preferences.theme"] = input.theme;
  await db.collection("users").doc(uid).update(updates);
}

export async function getAgentSystemOverview(uid: string): Promise<{
  profile: UserProfile | null;
  activeSessions: number;
  recentSymptoms: number;
}> {
  const db = getAdminDb();
  if (!db) throw new Error("System overview requires the Admin SDK");
  const [profileSnapshot, sessionSnapshot, symptomSnapshot] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db
      .collection("sessions")
      .where("userId", "==", uid)
      .where("state", "in", ["requested", "matched", "accepted", "active"])
      .get(),
    db.collection("users").doc(uid).collection("symptoms").limit(30).get(),
  ]);
  const normalizeValue = (value: unknown): unknown => {
    if (value instanceof Timestamp) return value.toDate();
    if (Array.isArray(value)) return value.map(normalizeValue);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, child]) => [
          key,
          normalizeValue(child),
        ]),
      );
    }
    return value;
  };
  const profileData = profileSnapshot.data();
  return {
    profile: profileData
      ? (normalizeValue({
          uid,
          ...profileData,
        }) as UserProfile)
      : null,
    activeSessions: sessionSnapshot.size,
    recentSymptoms: symptomSnapshot.size,
  };
}
