/**
 * SisterCare AI Agent Module
 *
 * This module exports the AI agent functionality for the SisterCare platform.
 * The agent goes beyond simple chatbots - it reasons, uses tools, and takes actions
 * to solve complex health-related problems for users.
 */

export { AGENT_TOOLS, getGeminiFunctionDeclarations } from "./tools";
export { executeAgent } from "./executor";
export {
  searchHealthKnowledge,
  assessSymptomRisk,
  HEALTH_KNOWLEDGE_BASE,
  UGANDA_HEALTHCARE_RESOURCES,
} from "./knowledge";
