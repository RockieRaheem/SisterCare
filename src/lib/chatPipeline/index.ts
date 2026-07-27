import { runSafetyStage } from "./safetyStage";
import { validateChatRequest } from "./validation";
import {
  ChatIdentity,
  ChatPipelineContext,
  RawChatRequest,
} from "./types";

export function runChatPreflightPipeline(
  raw: RawChatRequest,
  identity: ChatIdentity,
): ChatPipelineContext {
  const request = validateChatRequest(raw, identity);
  const context = runSafetyStage(request);
  context.trace.unshift(
    { stage: "identity", outcome: "completed" },
    { stage: "validation", outcome: "completed" },
    { stage: "context", outcome: "completed" },
  );
  return context;
}

export * from "./types";
export * from "./validation";
export * from "./safetyStage";
export * from "./handoffStage";
