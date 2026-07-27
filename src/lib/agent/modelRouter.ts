export type AgentProviderName = "gemini" | "groq";

export interface AgentModelAttempt {
  provider: AgentProviderName;
  model: string;
  apiKey: string;
}

type AgentProviderEnv = Record<string, string | undefined>;

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
] as const;

function providerOrder(value?: string): AgentProviderName[] {
  const requested = (value || "groq,gemini")
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(
      (provider): provider is AgentProviderName =>
        provider === "gemini" || provider === "groq",
    );
  return [...new Set(requested)];
}

export function buildAgentModelPlan(
  env: AgentProviderEnv = process.env,
): AgentModelAttempt[] {
  const attempts: AgentModelAttempt[] = [];
  for (const provider of providerOrder(env.AGENT_PROVIDER_ORDER)) {
    if (provider === "gemini" && env.GEMINI_API_KEY) {
      for (const model of GEMINI_MODELS) {
        attempts.push({
          provider,
          model,
          apiKey: env.GEMINI_API_KEY,
        });
      }
    }
    if (provider === "groq" && env.GROQ_API_KEY) {
      attempts.push({
        provider,
        model: env.GROQ_MODEL || "openai/gpt-oss-120b",
        apiKey: env.GROQ_API_KEY,
      });
    }
  }
  return attempts;
}

export function hasConfiguredAgentProvider(
  env: AgentProviderEnv = process.env,
): boolean {
  return buildAgentModelPlan(env).length > 0;
}
