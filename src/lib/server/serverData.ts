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
  evaluateTimeAvailability,
  selectCandidates,
  rankCounsellors,
} from "../counsellorMatching";
import * as clientData from "../firestore";
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
  if (!snap.exists) return;

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

  let candidates: Counsellor[] = [];
  try {
    candidates = specialty
      ? await getCounsellorsBySpecialty(specialty)
      : await getCounsellors();
  } catch (error) {
    console.warn("Admin counsellor fetch failed, using static:", error);
  }

  candidates = selectCandidates(candidates, { specialty, preferredLanguage });
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
    const counsellors = await getCounsellors();
    for (const counsellor of counsellors) {
      try {
        const { isAvailableNow } = evaluateTimeAvailability(counsellor);
        const correctStatus: CounsellorStatus = isAvailableNow
          ? "available"
          : "offline";
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
