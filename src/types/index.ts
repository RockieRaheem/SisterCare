// User Profile Types
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
  onboardingCompleted: boolean;
  cycleData: CycleData | null;
  preferences: UserPreferences;
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
  odString;
  odString;
  odString;
  odString;
  userId: string;
  type: "ai_support" | "counsellor";
  status: "active" | "closed";
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  summary?: string;
}

// Reminder Types
export interface Reminder {
  id: string;
  odString;
  odString;
  odString;
  odString;
  userId: string;
  type: "period_coming" | "period_start" | "log_symptoms" | "check_in";
  title: string;
  message: string;
  scheduledFor: Date;
  sent: boolean;
  sentAt?: Date;
  read: boolean;
}

// Counsellor Types (for premium feature)
export interface Counsellor {
  id: string;
  name: string;
  title: string;
  specializations: string[];
  photoURL: string;
  available: boolean;
  rating: number;
  reviewCount: number;
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
