import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  UserProfile,
  CycleData,
  PregnancyData,
  UserPreferences,
  ChatMessage,
  ChatConversation,
  Reminder,
  SymptomLog,
  CycleHistory,
  Counsellor,
  CounsellorStatus,
  CounsellorSpecialty,
  AgentEvent,
  TriageSeverity,
} from "@/types";

// ============================================
// USER PROFILE OPERATIONS
// ============================================

const DEFAULT_PREFERENCES: UserPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  reminderDaysBefore: 3,
  theme: "system",
  language: "en",
};

/**
 * Create a new user profile in Firestore
 */
export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string | null = null,
  photoURL: string | null = null,
): Promise<UserProfile> {
  const userProfile: UserProfile = {
    uid,
    email,
    displayName,
    photoURL,
    createdAt: new Date(),
    updatedAt: new Date(),
    onboardingCompleted: false,
    cycleData: null,
    pregnancyData: null,
    preferences: DEFAULT_PREFERENCES,
  };

  await setDoc(doc(db, "users", uid), {
    ...userProfile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return userProfile;
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      cycleData: data.cycleData
        ? {
            ...data.cycleData,
            lastPeriodDate: data.cycleData.lastPeriodDate?.toDate(),
            nextPeriodDate: data.cycleData.nextPeriodDate?.toDate(),
          }
        : null,
      pregnancyData: data.pregnancyData
        ? {
            ...data.pregnancyData,
            estimatedDueDate: data.pregnancyData.estimatedDueDate?.toDate(),
            lastMenstrualPeriodDate: data.pregnancyData.lastMenstrualPeriodDate?.toDate(),
            conceptionDate: data.pregnancyData.conceptionDate?.toDate(),
            birthDate: data.pregnancyData.birthDate?.toDate(),
            createdAt: data.pregnancyData.createdAt?.toDate(),
            updatedAt: data.pregnancyData.updatedAt?.toDate(),
          }
        : null,
    } as UserProfile;
  }

  return null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>,
): Promise<void> {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  uid: string,
  preferences: Partial<UserPreferences>,
): Promise<void> {
  const docRef = doc(db, "users", uid);
  const userDoc = await getDoc(docRef);

  if (userDoc.exists()) {
    const currentPrefs = userDoc.data().preferences || DEFAULT_PREFERENCES;
    await updateDoc(docRef, {
      preferences: { ...currentPrefs, ...preferences },
      updatedAt: serverTimestamp(),
    });
  }
}

// ============================================
// CYCLE DATA OPERATIONS
// ============================================

/**
 * Calculate the next period date based on last period and cycle length
 * This function returns the NEXT UPCOMING period date, accounting for
 * multiple cycles that may have passed since the last logged period.
 */
export function calculateNextPeriod(
  lastPeriodDate: Date,
  cycleLength: number,
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  const lastPeriod = new Date(lastPeriodDate);
  lastPeriod.setHours(0, 0, 0, 0);

  // Calculate days since last period
  const daysSinceLast = Math.floor(
    (today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24),
  );

  // How many complete cycles have passed?
  const cyclesPassed = Math.floor(daysSinceLast / cycleLength);

  // Calculate the most recent period start (estimated)
  const currentCycleStart = new Date(lastPeriod);
  currentCycleStart.setDate(
    currentCycleStart.getDate() + cyclesPassed * cycleLength,
  );

  // Next period is one cycle after the current cycle start
  const nextPeriod = new Date(currentCycleStart);
  nextPeriod.setDate(nextPeriod.getDate() + cycleLength);

  return nextPeriod;
}

/**
 * Get comprehensive cycle information including current state
 */
export function getCycleInfo(
  lastPeriodDate: Date,
  cycleLength: number,
  periodLength: number,
): {
  phase: string;
  dayInCycle: number;
  daysUntilNextPeriod: number;
  nextPeriodDate: Date;
  currentCycleStart: Date;
  isInPeriod: boolean;
  isPeriodLate: boolean;
  daysLate: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastPeriod = new Date(lastPeriodDate);
  lastPeriod.setHours(0, 0, 0, 0);

  // Calculate days since last logged period
  const daysSinceLast = Math.floor(
    (today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24),
  );

  // How many complete cycles have theoretically passed?
  const cyclesPassed = Math.floor(daysSinceLast / cycleLength);

  // Calculate the estimated current cycle start date
  const currentCycleStart = new Date(lastPeriod);
  currentCycleStart.setDate(
    currentCycleStart.getDate() + cyclesPassed * cycleLength,
  );

  // Day in current cycle (1-indexed)
  const daysSinceCurrentCycleStart = Math.floor(
    (today.getTime() - currentCycleStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dayInCycle = daysSinceCurrentCycleStart + 1;

  // Next period date
  const nextPeriodDate = new Date(currentCycleStart);
  nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength);

  // Days until next period
  const daysUntilNextPeriod = Math.floor(
    (nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Is user currently in period phase?
  const isInPeriod = dayInCycle <= periodLength;

  // Check if period is "late" (more than cycle length since last logged period
  // and user hasn't logged a new period)
  // We consider it "late" if we're past the first expected period and no update
  const firstExpectedPeriod = new Date(lastPeriod);
  firstExpectedPeriod.setDate(firstExpectedPeriod.getDate() + cycleLength);
  const isPeriodLate = cyclesPassed >= 1 && today > firstExpectedPeriod;
  const daysLate = isPeriodLate ? daysSinceLast - cycleLength : 0;

  // Determine phase
  let phase: string;
  if (dayInCycle <= periodLength) {
    phase = "menstrual";
  } else if (dayInCycle <= Math.floor(cycleLength * 0.45)) {
    phase = "follicular";
  } else if (dayInCycle <= Math.floor(cycleLength * 0.55)) {
    phase = "ovulation";
  } else {
    phase = "luteal";
  }

  return {
    phase,
    dayInCycle,
    daysUntilNextPeriod,
    nextPeriodDate,
    currentCycleStart,
    isInPeriod,
    isPeriodLate,
    daysLate,
  };
}

/**
 * Determine current cycle phase (simplified version for backward compatibility)
 */
export function getCurrentPhase(
  lastPeriodDate: Date,
  cycleLength: number,
  periodLength: number,
): { phase: string; dayInCycle: number; daysUntilNextPeriod: number } {
  const info = getCycleInfo(lastPeriodDate, cycleLength, periodLength);
  return {
    phase: info.phase,
    dayInCycle: info.dayInCycle,
    daysUntilNextPeriod: info.daysUntilNextPeriod,
  };
}

/**
 * Save or update cycle data for a user
 */
export async function saveCycleData(
  uid: string,
  cycleData: Partial<CycleData>,
): Promise<void> {
  const docRef = doc(db, "users", uid);
  const userDoc = await getDoc(docRef);

  if (userDoc.exists()) {
    const currentData = userDoc.data().cycleData || {};
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

    await updateDoc(docRef, {
      cycleData: updatedCycleData,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Complete onboarding with initial cycle data
 */
export async function completeOnboarding(
  uid: string,
  lastPeriodDate: Date,
  cycleLength: number,
  periodLength: number,
): Promise<void> {
  const nextPeriodDate = calculateNextPeriod(lastPeriodDate, cycleLength);
  const { phase } = getCurrentPhase(lastPeriodDate, cycleLength, periodLength);

  const cycleData: CycleData = {
    lastPeriodDate,
    cycleLength,
    periodLength,
    nextPeriodDate,
    currentPhase: phase as CycleData["currentPhase"],
    symptoms: [],
    history: [],
  };

  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, {
    cycleData: {
      ...cycleData,
      lastPeriodDate: Timestamp.fromDate(lastPeriodDate),
      nextPeriodDate: Timestamp.fromDate(nextPeriodDate),
    },
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// PREGNANCY DATA OPERATIONS
// ============================================

/**
 * Save or update pregnancy data for a user
 */
export async function savePregnancyData(
  uid: string,
  pregnancyData: Partial<PregnancyData>,
): Promise<void> {
  const docRef = doc(db, "users", uid);
  const userDoc = await getDoc(docRef);

  if (userDoc.exists()) {
    const currentPreg = userDoc.data().pregnancyData || {};
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

    await updateDoc(docRef, {
      pregnancyData: updatedPregnancyData,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Clear pregnancy data and resume normal cycle tracking after birth
 */
export async function clearPregnancyData(uid: string): Promise<void> {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, {
    pregnancyData: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Resume cycle tracking after birth by setting the birth date as last period start
 */
export async function updateCycleAfterBirth(
  uid: string,
  birthDate: Date,
  cycleLength: number = 28,
  periodLength: number = 5,
): Promise<void> {
  const nextPeriodDate = calculateNextPeriod(birthDate, cycleLength);
  const { phase } = getCurrentPhase(birthDate, cycleLength, periodLength);

  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, {
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
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// SYMPTOM LOGGING OPERATIONS
// ============================================

/**
 * Log symptoms for a specific date
 */
export async function logSymptoms(
  uid: string,
  symptomLog: Omit<SymptomLog, "id">,
): Promise<string> {
  const symptomsRef = collection(db, "users", uid, "symptoms");
  const docRef = await addDoc(symptomsRef, {
    ...symptomLog,
    date: Timestamp.fromDate(symptomLog.date),
  });
  return docRef.id;
}

/**
 * Get symptoms for a date range
 */
export async function getSymptoms(
  uid: string,
  startDate: Date,
  endDate: Date,
): Promise<SymptomLog[]> {
  const symptomsRef = collection(db, "users", uid, "symptoms");
  const q = query(
    symptomsRef,
    where("date", ">=", Timestamp.fromDate(startDate)),
    where("date", "<=", Timestamp.fromDate(endDate)),
    orderBy("date", "desc"),
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
  })) as SymptomLog[];
}

// ============================================
// CHAT OPERATIONS
// ============================================

/**
 * Create a new chat conversation
 */
export async function createConversation(
  uid: string,
  type: "ai_support" | "counsellor" = "ai_support",
): Promise<string> {
  const conversationsRef = collection(db, "conversations");
  const docRef = await addDoc(conversationsRef, {
    userId: uid,
    type,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get or create active conversation for user
 */
export async function getOrCreateConversation(
  uid: string,
  type: "ai_support" | "counsellor" = "ai_support",
): Promise<string> {
  const conversationsRef = collection(db, "conversations");
  // Simplified query to avoid composite index requirement
  const q = query(conversationsRef, where("userId", "==", uid));

  const querySnapshot = await getDocs(q);

  // Filter locally for type and status
  const activeConversation = querySnapshot.docs.find((doc) => {
    const data = doc.data();
    return data.type === type && data.status === "active";
  });

  if (activeConversation) {
    return activeConversation.id;
  }

  return createConversation(uid, type);
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  message: Omit<ChatMessage, "id" | "timestamp" | "read">,
): Promise<string> {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages",
  );
  const docRef = await addDoc(messagesRef, {
    ...message,
    timestamp: serverTimestamp(),
    read: false,
  });

  // Update conversation's updatedAt
  await updateDoc(doc(db, "conversations", conversationId), {
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  limit: number = 50,
): Promise<ChatMessage[]> {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages",
  );
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date(),
  })) as ChatMessage[];
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  uid: string,
): Promise<ChatConversation[]> {
  const conversationsRef = collection(db, "conversations");
  const q = query(conversationsRef, where("userId", "==", uid));

  const querySnapshot = await getDocs(q);
  const conversations = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as ChatConversation[];

  // Sort by updatedAt descending (most recent first)
  return conversations.sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
}

/**
 * Create a new chat conversation with a title
 */
export async function createNewChat(
  uid: string,
  title: string = "New Chat",
): Promise<string> {
  const conversationsRef = collection(db, "conversations");
  const docRef = await addDoc(conversationsRef, {
    userId: uid,
    title,
    type: "ai_support",
    status: "active",
    lastMessage: "",
    messageCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string,
): Promise<void> {
  const docRef = doc(db, "conversations", conversationId);
  await updateDoc(docRef, {
    title,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  // Delete all messages in the conversation
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages",
  );
  const messagesSnapshot = await getDocs(messagesRef);

  for (const messageDoc of messagesSnapshot.docs) {
    await deleteDoc(messageDoc.ref);
  }

  // Delete the conversation document
  await deleteDoc(doc(db, "conversations", conversationId));
}

/**
 * Update conversation's last message preview
 */
export async function updateConversationPreview(
  conversationId: string,
  lastMessage: string,
): Promise<void> {
  const docRef = doc(db, "conversations", conversationId);
  const conversationDoc = await getDoc(docRef);

  if (conversationDoc.exists()) {
    const currentCount = conversationDoc.data().messageCount || 0;
    await updateDoc(docRef, {
      lastMessage: lastMessage.substring(0, 100),
      messageCount: currentCount + 1,
      updatedAt: serverTimestamp(),
    });
  }
}

// ============================================
// REMINDER OPERATIONS
// ============================================

/**
 * Create a reminder
 */
export async function createReminder(
  uid: string,
  reminder: Omit<Reminder, "id" | "sent" | "read">,
): Promise<string> {
  const remindersRef = collection(db, "users", uid, "reminders");
  const docRef = await addDoc(remindersRef, {
    ...reminder,
    scheduledFor: Timestamp.fromDate(reminder.scheduledFor),
    sent: false,
    read: false,
  });
  return docRef.id;
}

/**
 * Get pending reminders for a user
 */
export async function getPendingReminders(uid: string): Promise<Reminder[]> {
  const remindersRef = collection(db, "users", uid, "reminders");
  // Simple query without composite index requirement
  const q = query(remindersRef, where("sent", "==", false));

  const querySnapshot = await getDocs(q);
  const reminders = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    scheduledFor: doc.data().scheduledFor?.toDate() || new Date(),
  })) as Reminder[];

  // Sort locally by scheduledFor
  return reminders.sort(
    (a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime(),
  );
}

/**
 * Schedule period reminders based on cycle data
 */
export async function schedulePeriodReminders(
  uid: string,
  nextPeriodDate: Date,
  reminderDaysBefore: number = 3,
): Promise<void> {
  // Clear existing period reminders
  const remindersRef = collection(db, "users", uid, "reminders");
  const existingQuery = query(
    remindersRef,
    where("type", "==", "period_coming"),
    where("sent", "==", false),
  );
  const existingReminders = await getDocs(existingQuery);

  for (const reminder of existingReminders.docs) {
    await deleteDoc(reminder.ref);
  }

  // Create new reminder
  const reminderDate = new Date(nextPeriodDate);
  reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);

  if (reminderDate > new Date()) {
    await createReminder(uid, {
      userId: uid,
      type: "period_coming",
      title: "Period Coming Soon",
      message: `Your period is expected in ${reminderDaysBefore} days. Time to prepare!`,
      scheduledFor: reminderDate,
    });
  }
}

/**
 * Mark reminder as sent
 */
export async function markReminderSent(
  uid: string,
  reminderId: string,
): Promise<void> {
  const reminderRef = doc(db, "users", uid, "reminders", reminderId);
  await updateDoc(reminderRef, {
    sent: true,
    sentAt: serverTimestamp(),
  });
}

/**
 * Mark reminder as read
 */
export async function markReminderRead(
  uid: string,
  reminderId: string,
): Promise<void> {
  const reminderRef = doc(db, "users", uid, "reminders", reminderId);
  await updateDoc(reminderRef, {
    read: true,
  });
}

// ============================================
// CYCLE HISTORY OPERATIONS
// ============================================

/**
 * Log a completed cycle
 */
export async function logCycleHistory(
  uid: string,
  cycle: Omit<CycleHistory, "id">,
): Promise<string> {
  const historyRef = collection(db, "users", uid, "cycleHistory");
  const docRef = await addDoc(historyRef, {
    ...cycle,
    startDate: Timestamp.fromDate(cycle.startDate),
    endDate: cycle.endDate ? Timestamp.fromDate(cycle.endDate) : null,
  });
  return docRef.id;
}

/**
 * Get cycle history
 */
export async function getCycleHistory(
  uid: string,
  limit: number = 12,
): Promise<CycleHistory[]> {
  const historyRef = collection(db, "users", uid, "cycleHistory");
  const q = query(historyRef, orderBy("startDate", "desc"));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.slice(0, limit).map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startDate: doc.data().startDate.toDate(),
    endDate: doc.data().endDate?.toDate() || null,
  })) as CycleHistory[];
}

// ============================================
// COUNSELLOR OPERATIONS
// ============================================

/**
 * Get all counsellors
 */
export async function getCounsellors(): Promise<Counsellor[]> {
  const counsellorsRef = collection(db, "counsellors");
  const q = query(counsellorsRef, orderBy("rating", "desc"));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Counsellor[];
}

/**
 * Get counsellors by status
 */
export async function getCounsellorsByStatus(
  status: CounsellorStatus,
): Promise<Counsellor[]> {
  const counsellorsRef = collection(db, "counsellors");
  const q = query(
    counsellorsRef,
    where("status", "==", status),
    orderBy("rating", "desc"),
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Counsellor[];
}

/**
 * Get counsellors by specialty
 */
export async function getCounsellorsBySpecialty(
  specialty: CounsellorSpecialty,
): Promise<Counsellor[]> {
  const counsellorsRef = collection(db, "counsellors");
  const q = query(
    counsellorsRef,
    where("specializations", "array-contains", specialty),
    orderBy("rating", "desc"),
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Counsellor[];
}

/**
 * Get a single counsellor by ID
 */
export async function getCounsellor(
  counsellorId: string,
): Promise<Counsellor | null> {
  const counsellorRef = doc(db, "counsellors", counsellorId);
  const counsellorDoc = await getDoc(counsellorRef);

  if (!counsellorDoc.exists()) {
    return null;
  }

  return {
    id: counsellorDoc.id,
    ...counsellorDoc.data(),
    createdAt: counsellorDoc.data().createdAt?.toDate() || new Date(),
  } as Counsellor;
}

/**
 * Update counsellor status
 */
export async function updateCounsellorStatus(
  counsellorId: string,
  status: CounsellorStatus,
): Promise<void> {
  const counsellorRef = doc(db, "counsellors", counsellorId);
  await updateDoc(counsellorRef, { status });
}

/**
 * Create a new counsellor (admin function)
 */
export async function createCounsellor(
  counsellor: Omit<Counsellor, "id" | "createdAt">,
): Promise<string> {
  const counsellorsRef = collection(db, "counsellors");
  const docRef = await addDoc(counsellorsRef, {
    ...counsellor,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Seed sample counsellors for demo purposes
 */
export async function seedCounsellors(): Promise<void> {
  const sampleCounsellors: Omit<Counsellor, "id" | "createdAt">[] = [
    {
      name: "Dr. Sarah Nakamya",
      title: "Licensed Clinical Psychologist",
      bio: "With over 10 years of experience in women's mental health, I specialize in helping women navigate life transitions, anxiety, and emotional wellness. My approach is warm, non-judgmental, and rooted in evidence-based practices.",
      specializations: [
        "Mental Health",
        "Reproductive Health",
        "Relationship Counselling",
      ],
      photoURL:
        "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face",
      status: "available",
      rating: 4.9,
      reviewCount: 156,
      yearsExperience: 10,
      languages: ["English", "Luganda", "Swahili"],
      phoneNumber: "+256700123456",
      whatsappNumber: "+256700123456",
      availableHours: {
        start: "09:00",
        end: "17:00",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      },
      sessionCount: 1240,
      verified: true,
    },
    {
      name: "Dr. Grace Achieng",
      title: "Reproductive Health Specialist",
      bio: "I am passionate about empowering women with knowledge about their bodies. Whether you're dealing with menstrual health issues, fertility concerns, or need guidance during pregnancy, I'm here to support you every step of the way.",
      specializations: [
        "Menstrual Health",
        "Reproductive Health",
        "Pregnancy & Postpartum",
      ],
      photoURL:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
      status: "busy",
      rating: 4.8,
      reviewCount: 203,
      yearsExperience: 12,
      languages: ["English", "Luo", "Swahili"],
      phoneNumber: "+256700234567",
      whatsappNumber: "+256700234567",
      availableHours: {
        start: "08:00",
        end: "16:00",
        days: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
      },
      sessionCount: 1890,
      verified: true,
    },
    {
      name: "Counsellor Mary Atim",
      title: "Adolescent Health Counsellor",
      bio: "I believe every young woman deserves access to accurate health information and a safe space to discuss her concerns. I specialize in helping teens and young adults understand their bodies and build healthy habits.",
      specializations: [
        "Adolescent Health",
        "Menstrual Health",
        "Sexual Health",
      ],
      photoURL:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face",
      status: "available",
      rating: 4.7,
      reviewCount: 89,
      yearsExperience: 6,
      languages: ["English", "Luganda", "Acholi"],
      phoneNumber: "+256700345678",
      whatsappNumber: "+256700345678",
      availableHours: {
        start: "10:00",
        end: "18:00",
        days: ["Monday", "Tuesday", "Wednesday", "Friday"],
      },
      sessionCount: 567,
      verified: true,
    },
    {
      name: "Dr. Elizabeth Mugisha",
      title: "Nutrition & Wellness Expert",
      bio: "Proper nutrition is the foundation of good health. I help women understand how diet affects their menstrual cycles, energy levels, and overall well-being. Let me help you create a personalized wellness plan.",
      specializations: [
        "Nutrition & Wellness",
        "Menstrual Health",
        "Reproductive Health",
      ],
      photoURL:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
      status: "offline",
      rating: 4.9,
      reviewCount: 134,
      yearsExperience: 8,
      languages: ["English", "Runyankole", "Swahili"],
      phoneNumber: "+256700456789",
      whatsappNumber: "+256700456789",
      availableHours: {
        start: "09:00",
        end: "15:00",
        days: ["Tuesday", "Wednesday", "Thursday", "Saturday"],
      },
      sessionCount: 892,
      verified: true,
    },
    {
      name: "Counsellor Janet Nakabugo",
      title: "Pregnancy & Postpartum Specialist",
      bio: "Becoming a mother is a beautiful journey, but it can also be overwhelming. I provide compassionate support for women during pregnancy, childbirth, and the postpartum period, including guidance on postpartum mental health.",
      specializations: [
        "Pregnancy & Postpartum",
        "Mental Health",
        "Reproductive Health",
      ],
      photoURL:
        "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&h=400&fit=crop&crop=face",
      status: "available",
      rating: 4.8,
      reviewCount: 178,
      yearsExperience: 14,
      languages: ["English", "Luganda"],
      phoneNumber: "+256700567890",
      whatsappNumber: "+256700567890",
      availableHours: {
        start: "08:00",
        end: "14:00",
        days: ["Monday", "Wednesday", "Friday", "Saturday"],
      },
      sessionCount: 2100,
      verified: true,
    },
    {
      name: "Dr. Patience Akello",
      title: "Sexual Health Counsellor",
      bio: "Sexual health is an important part of overall wellness. I create a safe, confidential space where you can discuss any concerns about your sexual health without judgment. Education and empowerment are at the heart of what I do.",
      specializations: [
        "Sexual Health",
        "Reproductive Health",
        "Relationship Counselling",
      ],
      photoURL:
        "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&h=400&fit=crop&crop=face",
      status: "busy",
      rating: 4.6,
      reviewCount: 95,
      yearsExperience: 7,
      languages: ["English", "Luo", "Ateso"],
      phoneNumber: "+256700678901",
      whatsappNumber: "+256700678901",
      availableHours: {
        start: "11:00",
        end: "19:00",
        days: ["Monday", "Tuesday", "Thursday", "Friday"],
      },
      sessionCount: 634,
      verified: true,
    },
  ];

  // Check if counsellors already exist
  const existing = await getCounsellors();
  if (existing.length > 0) {
    console.log("Counsellors already seeded");
    return;
  }

  // Add each counsellor
  for (const counsellor of sampleCounsellors) {
    await createCounsellor(counsellor);
  }

  console.log("Sample counsellors seeded successfully");
}

// ============================================
// AGENTIC WORKFLOW OPERATIONS
// ============================================

/**
 * Days of the week in order (consistent with Counsellor.availableHours.days)
 */
const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Evaluate whether a counsellor is currently available based on their
 * availableHours schedule and current time. Returns both immediate
 * availability and the next available time slot.
 */
function evaluateTimeAvailability(counsellor: Counsellor): {
  isAvailableNow: boolean;
  nextAvailableTime: string | null;
} {
  const now = new Date();
  const currentDay = DAYS_OF_WEEK[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const { availableHours } = counsellor;
  const todayInSchedule = availableHours.days.some(
    (d) => d.toLowerCase() === currentDay.toLowerCase(),
  );

  if (!todayInSchedule) {
    // Find the next available day
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (now.getDay() + i) % 7;
      const nextDay = DAYS_OF_WEEK[nextDayIndex];
      if (
        availableHours.days.some(
          (d) => d.toLowerCase() === nextDay.toLowerCase(),
        )
      ) {
        return {
          isAvailableNow: false,
          nextAvailableTime: `${nextDay} at ${availableHours.start}`,
        };
      }
    }
    return { isAvailableNow: false, nextAvailableTime: null };
  }

  const [startH, startM] = availableHours.start.split(":").map(Number);
  const [endH, endM] = availableHours.end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const isAvailableNow =
    currentMinutes >= startMinutes && currentMinutes < endMinutes;

  if (!isAvailableNow) {
    if (currentMinutes < startMinutes) {
      return {
        isAvailableNow: false,
        nextAvailableTime: `Today at ${availableHours.start}`,
      };
    }
    // Find next available day
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (now.getDay() + i) % 7;
      const nextDay = DAYS_OF_WEEK[nextDayIndex];
      if (
        availableHours.days.some(
          (d) => d.toLowerCase() === nextDay.toLowerCase(),
        )
      ) {
        return {
          isAvailableNow: false,
          nextAvailableTime: `${nextDay} at ${availableHours.start}`,
        };
      }
    }
  }

  return { isAvailableNow, nextAvailableTime: null };
}

/**
 * Count active conversations per counsellor for load-balancing.
 * Returns a Map of counsellorId → active conversation count.
 */
async function getCounsellorLoads(): Promise<Map<string, number>> {
  const loadMap = new Map<string, number>();
  try {
    const conversationsRef = collection(db, "conversations");
    const q = query(
      conversationsRef,
      where("type", "==", "counsellor"),
      where("status", "==", "active"),
    );
    const snapshot = await getDocs(q);
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

/**
 * Score a counsellor for a given assignment request.
 * Returns a score from 0-100 where higher is better.
 */
function calculateCounsellorScore(
  counsellor: Counsellor,
  params: {
    specialty?: CounsellorSpecialty;
    preferredLanguage?: string;
  },
  availability: { isAvailableNow: boolean; nextAvailableTime: string | null },
  activeLoad: number,
): number {
  let score = 0;

  // 1. Time-based availability (35 points)
  if (availability.isAvailableNow && counsellor.status === "available") {
    score += 35;
  } else if (availability.isAvailableNow) {
    score += 20; // Available time-wise but marked busy/offline
  } else if (counsellor.status === "available") {
    score += 10; // Marked available but outside hours
  }

  // 2. Language match (30 points)
  if (params.preferredLanguage) {
    const exactLangMatch = counsellor.languages.some(
      (l) => l.toLowerCase() === params.preferredLanguage!.toLowerCase(),
    );
    if (exactLangMatch) {
      score += 30;
    } else {
      // Partial match — check if any language starts with same root
      const partialMatch = counsellor.languages.some((l) =>
        params
          .preferredLanguage!.toLowerCase()
          .startsWith(l.substring(0, 3).toLowerCase()),
      );
      if (partialMatch) score += 10;
    }
  } else {
    score += 15; // No preference — neutral
  }

  // 3. Specialty match (20 points)
  if (params.specialty) {
    if (
      counsellor.specializations.includes(params.specialty)
    ) {
      score += 20;
    } else {
      // Check if any overlapping coverage
      const hasRelated = counsellor.specializations.some((s) => {
        if (params.specialty === "Mental Health")
          return true; // Mental Health is universal
        if (params.specialty === "Menstrual Health")
          return ["Reproductive Health", "Pregnancy & Postpartum"].includes(s);
        if (params.specialty === "Reproductive Health")
          return ["Menstrual Health", "Pregnancy & Postpartum", "Sexual Health"].includes(s);
        if (params.specialty === "Pregnancy & Postpartum")
          return ["Reproductive Health", "Menstrual Health"].includes(s);
        if (params.specialty === "Sexual Health")
          return ["Reproductive Health", "Adolescent Health"].includes(s);
        if (params.specialty === "Adolescent Health")
          return ["Mental Health", "Menstrual Health"].includes(s);
        if (params.specialty === "Relationship Counselling")
          return ["Mental Health"].includes(s);
        if (params.specialty === "Nutrition & Wellness")
          return ["Menstrual Health", "Adolescent Health"].includes(s);
        return false;
      });
      if (hasRelated) score += 8;
    }
  } else {
    score += 10; // No preference — neutral
  }

  // 4. Load balancing (10 points) — fewer active conversations = better
  if (activeLoad === 0) {
    score += 10;
  } else if (activeLoad === 1) {
    score += 7;
  } else if (activeLoad === 2) {
    score += 4;
  } else if (activeLoad >= 5) {
    score -= 5; // Penalty for overloaded
  }

  // 5. Rating bonus (5 points)
  score += Math.min(5, counsellor.rating);

  return score;
}

/**
 * Auto-update counsellor statuses based on time availability.
 * This batch updates all counsellors whose scheduled availability
 * does not match their current status.
 */
export async function batchUpdateCounsellorAvailability(): Promise<{
  updated: number;
  errors: number;
}> {
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

/**
 * Auto-update a single counsellor's status based on time availability.
 * Lightweight — meant to be called during routing for the selected counsellor.
 */
export async function autoUpdateCounsellorStatus(
  counsellorId: string,
): Promise<CounsellorStatus | null> {
  try {
    const counsellor = await getCounsellor(counsellorId);
    if (!counsellor) return null;

    const { isAvailableNow } = evaluateTimeAvailability(counsellor);
    const correctStatus: CounsellorStatus = isAvailableNow
      ? "available"
      : "offline";

    if (counsellor.status !== correctStatus) {
      await updateCounsellorStatus(counsellorId, correctStatus);
    }
    return correctStatus;
  } catch {
    return null;
  }
}

/**
 * Assign the best counsellor for a user using intelligent scoring.
 *
 * Algorithm:
 * 1. Fetch counsellors from Firestore (by specialty if given, otherwise all)
 * 2. Fall back to static counsellors if Firestore is empty
 * 3. Evaluate time-based availability for each counsellor
 * 4. Count active conversation loads for load balancing
 * 5. Score each counsellor on: availability, language match, specialty,
 *    load balance, and rating
 * 6. Return the highest-scoring counsellor
 */
export async function assignCounsellor(params: {
  specialty?: CounsellorSpecialty;
  preferredLanguage?: string;
  userId?: string;
}): Promise<Counsellor | null> {
  const { specialty, preferredLanguage } = params;

  // 1. Fetch candidate counsellors
  let candidates: Counsellor[] = [];
  try {
    if (specialty) {
      candidates = await getCounsellorsBySpecialty(specialty);
    } else {
      candidates = await getCounsellors();
    }
  } catch (error) {
    console.warn("Firestore counsellor fetch failed, using static:", error);
  }

  if (candidates.length === 0) {
    candidates = specialty
      ? STATIC_COUNSELLORS.filter((c) =>
          c.specializations.includes(specialty as CounsellorSpecialty),
        )
      : STATIC_COUNSELLORS;
    if (candidates.length === 0) candidates = STATIC_COUNSELLORS;
  }

  // 2. If language filter is strict, try static fallback
  if (preferredLanguage) {
    const hasAnyLang = candidates.some((c) =>
      c.languages.some((l) => l.toLowerCase() === preferredLanguage.toLowerCase()),
    );
    if (!hasAnyLang) {
      const staticLangs = STATIC_COUNSELLORS.filter((c) =>
        c.languages.some((l) => l.toLowerCase() === preferredLanguage.toLowerCase()),
      );
      if (staticLangs.length > 0) candidates = staticLangs;
    }
  }

  // 3. Evaluate availability and loads
  const availabilityCache = new Map<string, {
    isAvailableNow: boolean;
    nextAvailableTime: string | null;
  }>();
  for (const c of candidates) {
    availabilityCache.set(c.id, evaluateTimeAvailability(c));
  }

  const loadMap = await getCounsellorLoads();

  // 4. Score and rank
  const scored = candidates.map((c) => ({
    counsellor: c,
    score: calculateCounsellorScore(
      c,
      { specialty, preferredLanguage },
      availabilityCache.get(c.id)!,
      loadMap.get(c.id) || 0,
    ),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.length > 0 ? scored[0].counsellor : null;
}

/**
 * Pick the best counsellor for a user based on availability, language, and specialty.
 * Uses low-cost local ranking after minimal query fetch.
 */
// Static counsellor fallback used when Firestore collection is empty
const STATIC_COUNSELLORS: Counsellor[] = [
  {
    id: "1",
    name: "Dr. Sarah Namugga",
    title: "Clinical Psychologist",
    bio: "Passionate about women's mental health with over 10 years of experience helping women navigate life's challenges.",
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
    bio: "Dedicated to empowering women with knowledge about their bodies.",
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
    bio: "Helping women optimize their health through nutrition and hormone balance.",
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
    bio: "Specialized in supporting young women through puberty and adolescence.",
    specializations: ["Adolescent Health", "Mental Health", "Menstrual Health"],
    photoURL:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face",
    status: "available",
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
    bio: "Supporting mothers through their pregnancy journey and beyond.",
    specializations: [
      "Pregnancy & Postpartum",
      "Mental Health",
      "Reproductive Health",
    ],
    photoURL:
      "https://plus.unsplash.com/premium_photo-1661740529633-ab79e4c1d5cb?w=600&auto=format&fit=crop&q=60",
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
    bio: "Helping women build healthy relationships and navigate emotional challenges.",
    specializations: [
      "Relationship Counselling",
      "Mental Health",
      "Sexual Health",
    ],
    photoURL:
      "https://images.unsplash.com/photo-1655720357761-f18ea9e5e7e6?w=600&auto=format&fit=crop&q=60",
    status: "available",
    rating: 4.6,
    reviewCount: 62,
    yearsExperience: 5,
    languages: ["English", "Runyankole", "Luganda"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "11:00",
      end: "20:00",
      days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    },
    sessionCount: 398,
    verified: true,
    createdAt: new Date("2023-01-10"),
  },
];

export async function routeCounsellor(params: {
  specialty?: CounsellorSpecialty;
  preferredLanguage?: string;
}): Promise<Counsellor | null> {
  return assignCounsellor(params);
}

/**
 * Create or reuse an active counsellor conversation and attach metadata.
 */
export async function connectUserToCounsellor(params: {
  userId: string;
  counsellorId: string;
  reason: "user_request" | "risk_detected";
  summary: string;
}): Promise<string> {
  const { userId, counsellorId, reason, summary } = params;
  const conversationId = await getOrCreateConversation(userId, "counsellor");

  await updateDoc(doc(db, "conversations", conversationId), {
    title: "Counsellor Support",
    counsellorId,
    handoffReason: reason,
    handoffSummary: summary.substring(0, 500),
    status: "active",
    updatedAt: serverTimestamp(),
  });

  return conversationId;
}

/**
 * Update conversation with active counsellor metadata for context preservation
 */
export async function setActiveCounsellorOnConversation(params: {
  conversationId: string;
  counsellor: Counsellor;
}): Promise<void> {
  const { conversationId, counsellor } = params;
  await updateDoc(doc(db, "conversations", conversationId), {
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
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get active counsellor for a conversation (if one exists)
 */
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
  try {
    const docRef = doc(db, "conversations", conversationId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.activeCounsellor || null;
    }
  } catch (err) {
    console.warn("Failed to get active counsellor from conversation:", err);
  }
  return null;
}

/**
 * Log agent events for observability and evaluation metrics.
 */
export async function logAgentEvent(params: {
  userId: string;
  type: AgentEvent["type"];
  severity?: TriageSeverity;
  conversationId?: string;
  success?: boolean;
}): Promise<string> {
  const { userId, type, severity, conversationId, success } = params;
  const ref = collection(db, "users", userId, "agentEvents");
  const payload: Record<string, unknown> = {
    userId,
    type,
    success: success ?? true,
    createdAt: serverTimestamp(),
  };

  if (severity !== undefined) payload.severity = severity;
  if (conversationId !== undefined) payload.conversationId = conversationId;

  const docRef = await addDoc(ref, payload);
  return docRef.id;
}

/**
 * Fetch agent evaluation events for a period in days.
 */
export async function getAgentEvents(
  userId: string,
  days: number = 30,
): Promise<AgentEvent[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - Math.max(1, days));

  const ref = collection(db, "users", userId, "agentEvents");
  const q = query(
    ref,
    where("createdAt", ">=", Timestamp.fromDate(startDate)),
    where("createdAt", "<=", Timestamp.fromDate(endDate)),
    orderBy("createdAt", "desc"),
    firestoreLimit(500),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
  })) as AgentEvent[];
}
