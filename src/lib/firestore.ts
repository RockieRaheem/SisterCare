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
  registrationIntent: "member" | "counsellor" = "member",
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
    registrationIntent,
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

// Cycle math lives in src/lib/cycle.ts (pure + unit-tested). Re-exported here
// so existing importers keep working.
import { calculateNextPeriod, getCurrentPhase } from "./cycle";
export { calculateNextPeriod, getCycleInfo, getCurrentPhase } from "./cycle";
import {
  evaluateTimeAvailability,
  selectCandidates,
  rankCounsellors,
} from "./counsellorMatching";

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
      status: "in_session",
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
      status: "in_session",
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

// Availability evaluation, scoring, ranking, and the static fallback
// directory live in src/lib/counsellorMatching.ts (pure + shared with the
// admin-SDK server data layer).

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

  // 2. Static fallback + language filtering, then score and rank (shared
  // pure logic in counsellorMatching.ts)
  candidates = selectCandidates(candidates, { specialty, preferredLanguage });
  const loadMap = await getCounsellorLoads();
  return rankCounsellors(candidates, { specialty, preferredLanguage }, loadMap);
}

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
