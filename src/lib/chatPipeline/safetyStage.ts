import { assessConversationSafety } from "@/lib/safety";
import { ChatPipelineContext, ValidatedChatRequest } from "./types";

export function runSafetyStage(
  request: ValidatedChatRequest,
): ChatPipelineContext {
  const userMessages = request.conversationHistory
    .filter((message) => message.role === "user")
    .map((message) => message.content);
  const safety = assessConversationSafety([...userMessages, request.message]);

  return {
    request,
    safety,
    triage: { severity: safety.severity, reason: safety.reason },
    actionStatuses: [],
    trace: [{ stage: "safety", outcome: safety.response ? "short_circuit" : "completed" }],
  };
}

