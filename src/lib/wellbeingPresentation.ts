import type {
  WellbeingContext,
  WellbeingFeeling,
  WellbeingSupportNeed,
} from "@/lib/wellbeing";
import type { WellbeingCheckIn } from "@/types";

export const FEELING_OPTIONS: Array<{
  value: WellbeingFeeling;
  label: string;
  emoji: string;
}> = [
  { value: "calm", label: "Calm", emoji: "😌" },
  { value: "hopeful", label: "Hopeful", emoji: "🌤️" },
  { value: "content", label: "Content", emoji: "😊" },
  { value: "tired", label: "Drained", emoji: "😮‍💨" },
  { value: "anxious", label: "Anxious", emoji: "😟" },
  { value: "overwhelmed", label: "Overwhelmed", emoji: "😣" },
  { value: "sad", label: "Sad", emoji: "😔" },
  { value: "lonely", label: "Lonely", emoji: "🫥" },
  { value: "angry", label: "Angry", emoji: "😤" },
  { value: "numb", label: "Numb", emoji: "🌫️" },
];

export const PULSE_OPTIONS = [
  { value: "content", label: "Good", emoji: "😊", prompt: "Things feel manageable" },
  { value: "calm", label: "Okay", emoji: "😌", prompt: "Nothing strong right now" },
  { value: "tired", label: "Drained", emoji: "😮‍💨", prompt: "My energy feels low" },
  { value: "anxious", label: "Anxious", emoji: "😟", prompt: "My mind will not settle" },
  { value: "sad", label: "Low", emoji: "😔", prompt: "Today feels heavy" },
  { value: "overwhelmed", label: "Overwhelmed", emoji: "😣", prompt: "It feels like too much" },
] as const satisfies ReadonlyArray<{
  value: WellbeingFeeling;
  label: string;
  emoji: string;
  prompt: string;
}>;

export const CONTEXT_OPTIONS: Array<{
  value: WellbeingContext;
  label: string;
  icon: string;
}> = [
  { value: "relationships", label: "Relationships", icon: "favorite" },
  { value: "family", label: "Family", icon: "family_restroom" },
  { value: "work_or_study", label: "Work or study", icon: "school" },
  { value: "health_or_body", label: "Health or body", icon: "health_and_safety" },
  { value: "grief_or_loss", label: "Grief or loss", icon: "rainy" },
  { value: "safety_or_harassment", label: "Safety or harassment", icon: "shield" },
  { value: "money", label: "Money", icon: "payments" },
  { value: "sleep", label: "Sleep", icon: "bedtime" },
  { value: "other", label: "Something else", icon: "more_horiz" },
];

export const SUPPORT_OPTIONS: Array<{
  value: WellbeingSupportNeed;
  label: string;
  description: string;
  icon: string;
}> = [
  { value: "reflect", label: "Just reflect", description: "I only want to record today.", icon: "edit_note" },
  { value: "coping_tools", label: "Try something helpful", description: "Show me a gentle next step.", icon: "self_improvement" },
  { value: "talk_to_someone", label: "Talk to someone", description: "I would like private support.", icon: "forum" },
  { value: "urgent_support", label: "I need help now", description: "I do not feel able to manage alone.", icon: "emergency_home" },
];

export function feelingDetails(value: WellbeingFeeling) {
  return FEELING_OPTIONS.find((option) => option.value === value);
}

export function pulseDetails(value: WellbeingFeeling) {
  return PULSE_OPTIONS.find((option) => option.value === value);
}

export function contextLabel(value: WellbeingContext): string {
  return CONTEXT_OPTIONS.find((option) => option.value === value)?.label || value;
}

export function wellbeingSupportMessage(checkIn: WellbeingCheckIn): {
  tone: "steady" | "care" | "support";
  title: string;
  message: string;
} {
  const primaryFeeling = checkIn.feelings?.[0];
  if (
    checkIn.supportNeed === "urgent_support" ||
    checkIn.mood === 1 ||
    checkIn.stress === 5 ||
    checkIn.feelings?.includes("overwhelmed")
  ) {
    return {
      tone: "support",
      title: "You do not have to hold this alone",
      message: "Consider opening a private conversation or asking an available counsellor for support now.",
    };
  }
  if (primaryFeeling === "anxious") {
    return {
      tone: "care",
      title: "Let us slow this moment down",
      message: "Put both feet down, loosen your shoulders, and take one slow breath. You can talk privately if your mind still feels crowded.",
    };
  }
  if (["sad", "lonely", "numb"].includes(primaryFeeling || "")) {
    return {
      tone: "care",
      title: "You deserve support, not silence",
      message: "You do not need to explain everything at once. Start with one sentence here or reach someone safe when you are ready.",
    };
  }
  if (primaryFeeling === "tired") {
    return {
      tone: "care",
      title: "Your energy is asking for care",
      message: "Choose the smallest useful next step: water, food, rest, space, or asking someone to take one thing off your plate.",
    };
  }
  if (
    checkIn.mood <= 2 ||
    (checkIn.stress !== undefined && checkIn.stress >= 4) ||
    (checkIn.energy !== undefined && checkIn.energy <= 2)
  ) {
    return {
      tone: "care",
      title: "A gentler pace may help today",
      message: "Choose one small need to meet first—rest, food, water, space, or a conversation with someone safe.",
    };
  }
  return {
    tone: "steady",
    title: "Thank you for checking in with yourself",
    message: "Notice one thing helping today. Small moments of steadiness matter, and your private timeline will remember the pattern.",
  };
}
