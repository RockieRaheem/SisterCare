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
} from "firebase/firestore";
import { db } from "./firebase";
import {
  UserProfile,
  CycleData,
  UserPreferences,
  ChatMessage,
  ChatConversation,
  Reminder,
  SymptomLog,
  CycleHistory,
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
    (today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // How many complete cycles have passed?
  const cyclesPassed = Math.floor(daysSinceLast / cycleLength);
  
  // Calculate the most recent period start (estimated)
  const currentCycleStart = new Date(lastPeriod);
  currentCycleStart.setDate(currentCycleStart.getDate() + (cyclesPassed * cycleLength));
  
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
    (today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // How many complete cycles have theoretically passed?
  const cyclesPassed = Math.floor(daysSinceLast / cycleLength);
  
  // Calculate the estimated current cycle start date
  const currentCycleStart = new Date(lastPeriod);
  currentCycleStart.setDate(currentCycleStart.getDate() + (cyclesPassed * cycleLength));
  
  // Day in current cycle (1-indexed)
  const daysSinceCurrentCycleStart = Math.floor(
    (today.getTime() - currentCycleStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const dayInCycle = daysSinceCurrentCycleStart + 1;
  
  // Next period date
  const nextPeriodDate = new Date(currentCycleStart);
  nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength);
  
  // Days until next period
  const daysUntilNextPeriod = Math.floor(
    (nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
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
