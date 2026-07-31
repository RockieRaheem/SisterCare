// User Profile Types
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  supportAlias: string;
  ageBand: MemberAgeBand | null;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
  onboardingCompleted: boolean;
  cycleData: CycleData | null;
  pregnancyData: PregnancyData | null;
  preferences: UserPreferences;
  privacyPreferences: UserPrivacyPreferences;
  /** Sign-up path only; it never grants a privileged Supabase role. */
  registrationIntent?: "member" | "counsellor";
  /** Server-controlled Supabase role; never accepted from a browser update. */
  role?: "member" | "counsellor" | "admin";
}

export type MemberAgeBand =
  | "under_13"
  | "13_15"
  | "16_17"
  | "18_24"
  | "25_plus"
  | "prefer_not_to_say";

export interface UserPrivacyPreferences {
  conversationRetention: "account" | "session";
  counsellorContextSharing:
    | "ask_each_time"
    | "approved_summary"
    | "never";
  discreetNotifications: boolean;
  notificationPreviews: boolean;
  sharedDeviceLockMinutes: number;
}

export interface PregnancyData {
  isPregnant: boolean;
  estimatedDueDate?: Date;
  lastMenstrualPeriodDate?: Date;
  trimester?: "first" | "second" | "third";
  weeksPregnant?: number;
  conceptionDate?: Date;
  notes?: string;
  gaveBirth: boolean;
  birthDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CycleData {
  lastPeriodDate: Date;
  cycleLength: number; // Average cycle length in days (typically 21-35)
  periodLength: number; // Average period duration in days (typically 3-7)
  nextPeriodDate: Date;
  currentPhase: CyclePhase;
  symptoms: SymptomLog[];
  history: CycleHistory[];
}

export interface CycleHistory {
  id: string;
  startDate: Date;
  endDate: Date | null;
  cycleLength: number;
  periodLength: number;
  symptoms: SymptomLog[];
  notes: string;
}

export interface SymptomLog {
  id: string;
  date: Date;
  mood: MoodType;
  symptoms: string[];
  notes: string;
  flowIntensity?: FlowIntensity;
}

export type MoodType = "great" | "good" | "okay" | "low" | "bad";
export type FlowIntensity = "light" | "medium" | "heavy" | "spotting" | "none";

export type CyclePhase =
  | "menstrual" // Days 1-5: Period
  | "follicular" // Days 6-13: Post-period, pre-ovulation
  | "ovulation" // Days 14-16: Fertile window
  | "luteal"; // Days 17-28: Post-ovulation, pre-period

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  reminderDaysBefore: number; // How many days before period to send reminder
  theme: "light" | "dark" | "system";
  language: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: "user" | "ai" | "counsellor";
  content: string;
  timestamp: Date;
  read: boolean;
  metadata?: {
    sentiment?: string;
    topics?: string[];
  };
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  type: "ai_support" | "counsellor";
  status: "active" | "closed";
  retentionMode: "account" | "session";
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: string;
  messageCount?: number;
  // Counsellor context - tracks active counsellor for this conversation
  activeCounsellorId?: string;
  activeCounsellor?: {
    id: string;
    name: string;
    title: string;
    languages: string[];
    specializations: string[];
    phoneNumber: string;
    whatsappNumber: string;
  };
}

export type TriageSeverity = "low" | "medium" | "high" | "critical";

export interface AgentActionStatus {
  key: string;
  label: string;
  state: "pending" | "done" | "failed";
}

export interface CounsellorHandoffResult {
  connected: boolean;
  conversationId?: string;
  counsellorId?: string;
  counsellorName?: string;
  counsellorSpecialty?: string;
  reason: "user_request" | "risk_detected";
}

export interface AgentEvent {
  id: string;
  userId: string;
  type:
    | "triage"
    | "handoff_offered"
    | "handoff_connected"
    | "cycle_confirmation_prompted"
    | "cycle_updated"
    | "pregnancy_updated"
    | "birth_recorded";
  severity?: TriageSeverity;
  conversationId?: string;
  success?: boolean;
  createdAt: Date;
}

// Reminder Types
export interface Reminder {
  id: string;
  userId: string;
  type: "period_coming" | "period_start" | "log_symptoms" | "check_in";
  title: string;
  message: string;
  scheduledFor: Date;
  sent: boolean;
  sentAt?: Date;
  read: boolean;
}

// Counsellor Types
/** Public, server-derived availability. A counsellor is never marked available
 * merely because their scheduled working hours have started. */
export type CounsellorStatus = "available" | "in_session" | "offline";

export type CounsellorSpecialty =
  | "Mental Health"
  | "Menstrual Health"
  | "Reproductive Health"
  | "Nutrition & Wellness"
  | "Pregnancy & Postpartum"
  | "Sexual Health"
  | "Adolescent Health"
  | "Relationship Counselling";

export interface Counsellor {
  id: string;
  name: string;
  title: string;
  bio: string;
  specializations: CounsellorSpecialty[];
  photoURL: string;
  status: CounsellorStatus;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  languages: string[];
  phoneNumber: string;
  whatsappNumber: string;
  availableHours: {
    start: string; // e.g., "09:00"
    end: string; // e.g., "17:00"
    days: string[]; // e.g., ["Monday", "Tuesday", ...]
  };
  sessionCount: number;
  verified: boolean;
  verificationStatus?: "pending" | "verified" | "suspended" | "expired";
  credentialExpiresAt?: Date;
  maxConcurrentSessions?: number;
  acceptingNewSessions?: boolean;
  crisisTrained?: boolean;
  supervisorId?: string;
  createdAt: Date;
}

// ============================================
// COUNSELLING SESSION TYPES (Phase 2 — ARCHITECTURE_V2 §4.4)
// ============================================

/**
 * Session lifecycle states. Transitions are validated by
 * src/lib/sessionStateMachine.ts — never set state directly.
 */
export type SessionState =
  | "requested" // waiting for a match (this IS the queue)
  | "matched" // assigned to a counsellor, awaiting accept
  | "accepted" // counsellor accepted (momentary; engine auto-activates)
  | "active" // room is open, both sides can message
  | "completed" // ended by either party
  | "feedback_received" // user rated the session (terminal)
  | "expired" // no match within the request TTL (terminal)
  | "escalated"; // counsellor flagged an emergency (terminal)

export type SessionPriority = "normal" | "critical";

export interface CounsellingSession {
  id: string;
  userId: string;
  counsellorId: string | null;
  counsellorName?: string;
  state: SessionState;
  priority: SessionPriority;
  reason: "user_request" | "risk_detected";
  specialty?: CounsellorSpecialty;
  preferredLanguage?: string;
  /** Short context shown to the counsellor before accepting (max 500 chars) */
  summary: string;
  participantAlias?: string;
  contextScope?: "none" | "member_approved" | "safety_minimum";
  /** Originating AI conversation, when the session came from a chat handoff */
  conversationId?: string;
  requestedAt: Date;
  matchedAt?: Date;
  acceptedAt?: Date;
  activeAt?: Date;
  completedAt?: Date;
  endedBy?: "user" | "counsellor";
  feedbackRating?: number; // 1..5
  feedbackComment?: string;
  /** SLA metric: seconds from requested to accepted (the crisis lane clock) */
  timeToHumanSeconds?: number;
  matchAttempts: number;
  /** Counsellor uids who declined or timed out — excluded from rematching */
  declinedBy: string[];
  crisisEscalationLevel?: number;
  emergencyFallbackRequired?: boolean;
  incidentRequired?: boolean;
}

export interface SessionMessage {
  id: string;
  senderId: string;
  senderRole: "user" | "counsellor";
  text: string;
  createdAt: Date;
}

/** Presence heartbeat doc for a counsellor (presence/{counsellorUid}) */
export interface CounsellorPresence {
  counsellorId: string;
  status: CounsellorStatus;
  lastHeartbeat: Date;
}

/** A private application submitted before a counsellor account is activated. */
export interface CounsellorApplication {
  id: string;
  status: "pending" | "verified" | "rejected";
  profile: Pick<
    Counsellor,
    "name" | "title" | "bio" | "photoURL" | "specializations" | "languages" | "phoneNumber"
  >;
  legalName: string;
  registrationNumber: string;
  credentialType: string;
  credentialExpiresAt: Date;
  documentReferences: string[];
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNote?: string;
}

// Subscription Types
export interface Subscription {
  userId: string;
  plan: "free" | "premium";
  status: "active" | "cancelled" | "expired";
  startDate: Date;
  endDate?: Date;
  priceUGX: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
