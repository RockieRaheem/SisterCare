import {
  AgentActionStatus,
  CycleData,
  TriageSeverity,
  UserProfile,
} from "@/types";
import { ConversationSafetyAssessment } from "@/lib/safety";

export interface RawChatRequest {
  message?: unknown;
  conversationHistory?: unknown;
  userId?: unknown;
  cycleData?: unknown;
  userProfile?: unknown;
  conversationId?: unknown;
  userLanguage?: unknown;
}

export interface NormalizedHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ValidatedChatRequest {
  message: string;
  userId?: string;
  conversationHistory: NormalizedHistoryMessage[];
  cycleData?: CycleData;
  userProfile?: UserProfile;
  conversationId?: string;
  userLanguage?: string;
}

export interface ChatPipelineContext {
  request: ValidatedChatRequest;
  safety: ConversationSafetyAssessment;
  triage: { severity: TriageSeverity; reason: string };
  actionStatuses: AgentActionStatus[];
  trace: ChatPipelineTrace[];
}

export interface ChatPipelineTrace {
  stage: string;
  outcome: "completed" | "short_circuit";
}

export class ChatPipelineError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ChatPipelineError";
  }
}

export type ChatIdentity =
  | { mode: "verified"; uid: string }
  | { mode: "development"; bodyUid?: string };

