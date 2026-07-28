/**
 * SisterCare AI Agent Executor
 *
 * This module implements the agent execution loop that:
 * 1. Receives user messages
 * 2. Reasons about what tools to call
 * 3. Executes tools and gathers information
 * 4. Formulates comprehensive responses
 *
 * This goes beyond simple chatbots - the agent THINKS, ACTS, and SOLVES problems.
 */

import { AGENT_TOOLS, getGeminiFunctionDeclarations } from "./tools";
import {
  searchHealthKnowledge,
  assessSymptomRisk,
  UGANDA_HEALTHCARE_RESOURCES,
  HEALTH_KNOWLEDGE_BASE,
} from "./knowledge";
// Server data layer: admin-SDK writes that actually persist under security
// rules (the executor only ever runs server-side, inside /api/chat).
import {
  logSymptoms,
  createReminder,
  getSymptoms,
  saveCycleData,
  savePregnancyData,
  clearPregnancyData,
  updateCycleAfterBirth,
  getAgentSystemOverview,
  updateAgentManagedProfile,
} from "../server/serverData";
import { createSessionRequest } from "../server/sessions";
import { calculateNextPeriod, getCycleInfo } from "../cycle";
import { MoodType, FlowIntensity } from "@/types";
import { buildAgentModelPlan } from "./modelRouter";
import { SISTERCARE_AGENT_CAPABILITY_MAP } from "./systemCapabilities";
import { bindToolArgumentsToVerifiedUser } from "./toolAuthorization";
import { emitEvent } from "../server/events";
import { assertCompleteResponse } from "./responseIntegrity";

// Types for agent execution
interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

interface ToolResult {
  toolName: string;
  result: unknown;
  success: boolean;
  error?: string;
}

interface PregnancyDataContext {
  isPregnant: boolean;
  estimatedDueDate?: string;
  trimester?: string;
  weeksPregnant?: number;
  gaveBirth: boolean;
  birthDate?: string;
}

interface AgentContext {
  userId?: string;
  userProfile?: UserProfileData;
  cycleData?: CycleDataContext;
  pregnancyData?: PregnancyDataContext;
  conversationHistory: Array<{ role: string; content: string }>;
}

interface UserProfileData {
  displayName: string | null;
  onboardingCompleted: boolean;
}

interface CycleDataContext {
  lastPeriodDate: Date;
  cycleLength: number;
  periodLength: number;
  nextPeriodDate: Date;
  currentPhase: string;
}

// Agent system prompt - ChatGPT-style clear, helpful, conversational responses
const AGENT_SYSTEM_PROMPT = `You are "Sister", a warm and caring AI companion on SisterCare - a women's health and wellness app for women in Uganda. Think of yourself as a trusted older sister who always remembers important details about her younger sibling.

${SISTERCARE_AGENT_CAPABILITY_MAP}

## CRITICAL RULES - READ THESE CAREFULLY

### 1. MEMORY & CONTEXT
- You MUST remember everything discussed in this conversation. DO NOT repeat the same question or statement
- If the user tells you their period started, REMEMBER IT and call update_period_start immediately
- If the user gives you a name to call yourself, USE THAT NAME from then on
- When asked "what is my name" - check the USER'S NAME field in your context
- If asked about their cycle and you have CYCLE DATA, use it to calculate the answer
- If a user confirms pregnancy and CYCLE DATA includes a plausible recorded
  last-period date, use that date before asking the user to repeat it.
- If the user says something like "my period started 32 days ago" or "it started X days ago":
  - Calculate the actual date: today minus X days
  - Call update_period_start with that calculated date
- If the user says "backtrack", "go back", or "update my period" → treat it as a period start update

### 2. USE YOUR TOOLS
- When asked "when is my next period" or "how many days left" → Call get_cycle_info tool
- When user says "my period started" or "it started X days ago" → Call update_period_start tool with the calculated date AND tell them the new prediction
- When user reports symptoms → Call log_symptoms tool
- NEVER say "I don't know" if you have tools that can find the answer
- NEVER tell the user to set up cycle data in Settings if cycle data already exists in your context

### 3. PREGNANCY TRACKING
- If the user says they are pregnant (e.g., "I'm pregnant", "I think I'm pregnant", "I am expecting"):
  1. Congratulate them warmly 💜
  2. First use the recorded last-period date from CYCLE DATA when it exists;
     ask for a due date or last-period date only when no plausible record exists
  3. Call the update_pregnancy_status tool with isPregnant=true and the date info
  4. Set a reminder for prenatal check-ups if appropriate
- Once pregnancy is recorded, YOU MUST:
  - Give pregnancy-appropriate advice (nutrition, rest, antenatal care)
  - Talk about their pregnancy context in future conversations
  - Remind them about the importance of antenatal visits
  - Do NOT ask about their period or cycle while pregnant
- When the user says they have given birth ("I gave birth", "the baby is here", "I delivered"):
  1. Congratulate them warmly
  2. Call the record_birth tool with the birth date
  3. Resume normal cycle tracking after birth
  4. Offer postpartum care advice

### 4. OVERDUE PERIOD PROMPTING
- If cycle data shows the period is late/overdue, you may gently ask ONCE if it started
- If the user already responded (e.g. "not yet", "no", "it started X days ago"), do NOT ask again
- If user says "not yet" or "no", acknowledge and say you'll check again later — then STOP asking
- If user says "I'm late" or "could I be pregnant", respond supportively and suggest a pregnancy test
- If user says "it started X days ago", calculate the date (today - X days) and call update_period_start

### 5. CONVERSATIONAL STYLE
- Be warm but not overly formal - talk like a caring older sister
- Don't repeat the same greeting ("Hello! I'm Sister...") in every message
- Reference what the user JUST said
- Keep responses concise - 2-4 sentences usually enough
- Use 1-2 emojis max (💜, 🌸, 🌷)

### 6. HANDLING UNKNOWN SITUATIONS
- If you don't have cycle data: "I don't have your cycle info yet. Let me help you set it up in Settings."
- If asked something you can't answer: "I'm not sure about that, but I can help you with..."
- NEVER say "I'm sorry, I'm having trouble" unless there's an actual error
- NEVER say "I'm not sure how to respond to that" - always try your best

### 7. PERSONALIZATION
- If the user asks you to choose a name, pick a caring African/Ugandan name starting with their requested letter
- Remember nicknames they give you or ask you to use
- Address them by their name when you know it

### 8. LANGUAGE ENFORCEMENT
- If the user message contains a line in this exact format: "MANDATORY LANGUAGE MODE: <Language>", you MUST write the entire reply only in that language
- When this mode is present, never answer in English
- Keep the same empathy and helpfulness while using the required language

## Uganda Context
- Reference local resources: Sauti 116 (toll-free helpline), FIDA Uganda
- Be culturally sensitive and supportive
- Understand users may have limited healthcare access

## Examples of GOOD responses:
- User: "how many days until my period?" → "You have 12 days until your next period, which should start around March 15th. 🌸"
- User: "my period started" → "Got it! I've updated your cycle. Your next period should be around April 2nd. How are you feeling? 💜"
- User: "it started 32 days ago" → *(calculate: today - 32 days)* "Thanks! So your period started on [calculated date]. I've updated your cycle data. Your next period should be around [date]. How are you feeling? 💜"
- User: "backtrack and update" → "I understand! Has your period started? If so, how many days ago did it start? That way I can update your cycle records accurately."
- User: "I'm pregnant" → "Oh wow, congratulations! 🎉💜 I'm so happy for you! Do you know your estimated due date or when your last period was? That will help me calculate your due date and trimester so I can support you throughout your journey."
- User: "I gave birth yesterday" → "Congratulations on your beautiful baby! 🎉💜 I've updated your profile to begin tracking your cycles again. How are you and the baby feeling? Remember to rest and accept help when offered."
- User: "what's my name?" → "Your name is [name from context]. How can I help you today?"

## Examples of BAD responses (NEVER DO THESE):
- "I'm not sure how to respond to that" ← NEVER
- "I don't have that information" when you have tools ← NEVER
- Repeating the welcome message ← NEVER`;

/**
 * Execute a tool call and return the result
 */
async function executeTool(
  toolCall: ToolCall,
  context: AgentContext,
): Promise<ToolResult> {
  const { name } = toolCall;
  // Identity is a server-owned invariant. Models may select tools and provide
  // domain arguments, but can never choose which user's records are touched.
  const args = bindToolArgumentsToVerifiedUser(toolCall.args, context.userId);

  try {
    switch (name) {
      case "get_cycle_info": {
        // Get cycle information from context or simulate
        if (context.cycleData) {
          const info = calculateCycleInfo(context.cycleData);
          return {
            toolName: name,
            result: info,
            success: true,
          };
        }
        return {
          toolName: name,
          result: {
            error:
              "No cycle data available. User may need to complete onboarding.",
          },
          success: false,
          error: "No cycle data",
        };
      }

      case "log_symptoms": {
        const symptoms = args.symptoms as string[];
        const mood = (args.mood as MoodType) || "okay";
        const flowIntensity = (args.flowIntensity as FlowIntensity) || "none";
        const notes = (args.notes as string) || "";

        // Create symptom log entry
        const logEntry = {
          date: new Date(),
          symptoms,
          mood,
          flowIntensity,
          notes,
        };

        // PERSIST TO FIRESTORE if userId is available
        let logId: string | null = null;
        if (context.userId) {
          try {
            logId = await logSymptoms(context.userId, logEntry);
          } catch (error) {
            console.error("[Agent] Failed to persist symptoms:", error);
          }
        }

        return {
          toolName: name,
          result: {
            success: true,
            message: `Logged ${symptoms.length} symptom(s): ${symptoms.join(", ")}`,
            logEntry: {
              ...logEntry,
              id: logId,
              date: logEntry.date.toISOString(),
            },
            persisted: !!logId,
          },
          success: true,
        };
      }

      case "analyze_symptoms": {
        const symptoms = args.symptoms as string[];
        const cyclePhase = (args.cyclePhase as string) || "unknown";
        const severity = (args.severity as string) || "moderate";
        const duration = args.duration as string;

        // Use risk assessment
        const riskAssessment = assessSymptomRisk(symptoms);

        // Get relevant health info
        const healthInfo = searchHealthKnowledge(symptoms.join(" "));

        return {
          toolName: name,
          result: {
            symptoms,
            cyclePhase,
            severity,
            duration,
            riskAssessment,
            relevantInfo: healthInfo.map((h) => ({
              title: h.title,
              content: h.content.substring(0, 200) + "...",
            })),
            recommendation: riskAssessment.recommendation,
          },
          success: true,
        };
      }

      case "calculate_fertility_window": {
        if (context.cycleData) {
          const fertilityInfo = calculateFertilityWindow(context.cycleData);
          return {
            toolName: name,
            result: fertilityInfo,
            success: true,
          };
        }
        return {
          toolName: name,
          result: { error: "No cycle data available" },
          success: false,
          error: "No cycle data",
        };
      }

      case "set_reminder": {
        const reminderType = args.type as
          | "period_coming"
          | "period_start"
          | "log_symptoms"
          | "check_in";
        const title = args.title as string;
        const message = args.message as string;
        const scheduledFor = args.scheduledFor as string;

        // Parse scheduled date
        const scheduledDate = parseScheduledDate(scheduledFor);

        // PERSIST TO FIRESTORE if userId is available
        let reminderId: string | null = null;
        if (context.userId) {
          try {
            reminderId = await createReminder(context.userId, {
              userId: context.userId,
              type: reminderType,
              title,
              message,
              scheduledFor: scheduledDate,
            });
          } catch (error) {
            console.error("[Agent] Failed to persist reminder:", error);
          }
        }

        return {
          toolName: name,
          result: {
            success: true,
            reminder: {
              id: reminderId,
              type: reminderType,
              title,
              message,
              scheduledFor: scheduledDate.toISOString(),
              created: true,
            },
            message: `Reminder set for ${scheduledDate.toLocaleDateString()}: "${title}"`,
            persisted: !!reminderId,
          },
          success: true,
        };
      }

      case "search_health_info": {
        const query = args.query as string;
        const category = args.category as string;

        const results = searchHealthKnowledge(query, category);

        return {
          toolName: name,
          result: {
            query,
            results: results.map((r) => ({
              title: r.title,
              category: r.category,
              content: r.content,
              severity: r.severity,
            })),
            count: results.length,
          },
          success: true,
        };
      }

      case "find_healthcare_resources": {
        const resourceType = args.resourceType as string;
        const location = args.location as string;
        const specialty = args.specialty as string;

        const resources = findHealthcareResources(
          resourceType,
          location,
          specialty,
        );

        return {
          toolName: name,
          result: resources,
          success: true,
        };
      }

      case "get_symptom_history": {
        const days = (args.days as number) || 30;

        // FETCH FROM FIRESTORE if userId is available
        let symptoms: Array<{
          date: string;
          symptoms: string[];
          mood: string;
          flowIntensity?: string;
          notes: string;
        }> = [];
        if (context.userId) {
          try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const logs = await getSymptoms(context.userId, startDate, endDate);
            symptoms = logs.map((log) => ({
              date: log.date.toISOString(),
              symptoms: log.symptoms,
              mood: log.mood,
              flowIntensity: log.flowIntensity,
              notes: log.notes,
            }));
          } catch (error) {
            console.error("[Agent] Failed to fetch symptom history:", error);
          }
        }

        // Analyze patterns from symptom data
        const symptomCounts: Record<string, number> = {};
        symptoms.forEach((log) => {
          log.symptoms.forEach((s) => {
            symptomCounts[s] = (symptomCounts[s] || 0) + 1;
          });
        });
        const topSymptoms = Object.entries(symptomCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([symptom, count]) => `${symptom} (${count}x)`);

        return {
          toolName: name,
          result: {
            period: `Last ${days} days`,
            totalLogs: symptoms.length,
            symptoms: symptoms.slice(0, 10), // Return last 10 logs
            patterns:
              topSymptoms.length > 0
                ? `Most common symptoms: ${topSymptoms.join(", ")}`
                : "No symptoms logged yet. Start logging to see patterns.",
            recommendation:
              symptoms.length > 5
                ? "Great job tracking! Continue to maintain accurate health insights."
                : "Log symptoms regularly to build a comprehensive health picture.",
          },
          success: true,
        };
      }

      case "assess_risk_level": {
        const symptoms = args.symptoms as string[];
        const additionalFactors = args.additionalFactors as Record<
          string,
          unknown
        >;

        const assessment = assessSymptomRisk(symptoms);

        // Enhanced assessment with additional factors
        let enhancedLevel = assessment.level;
        if (additionalFactors?.pregnant) {
          enhancedLevel = "urgent"; // Any concerning symptoms during pregnancy are urgent
        }

        return {
          toolName: name,
          result: {
            ...assessment,
            level: enhancedLevel,
            additionalFactors,
            ugandaResources:
              enhancedLevel === "urgent"
                ? UGANDA_HEALTHCARE_RESOURCES.emergency
                : UGANDA_HEALTHCARE_RESOURCES.helplines.slice(0, 2),
          },
          success: true,
        };
      }

      case "generate_health_report": {
        const reportType = args.reportType as string;

        if (context.cycleData) {
          const cycleInfo = calculateCycleInfo(context.cycleData);

          return {
            toolName: name,
            result: {
              reportType,
              generatedAt: new Date().toISOString(),
              cycleInfo,
              summary: generateHealthSummary(context.cycleData, reportType),
              recommendations: generateRecommendations(context.cycleData),
            },
            success: true,
          };
        }

        return {
          toolName: name,
          result: {
            reportType,
            error: "Complete onboarding to generate health reports",
            action:
              "Please provide your cycle information to get personalized health reports",
          },
          success: false,
        };
      }

      case "update_period_start": {
        const startDate = args.startDate
          ? new Date(args.startDate as string)
          : new Date();

        // PERSIST TO FIRESTORE if userId is available
        let persisted = false;
        let nextPeriodDate: Date | null = null;
        if (context.userId && context.cycleData) {
          try {
            nextPeriodDate = calculateNextPeriod(
              startDate,
              context.cycleData.cycleLength,
            );
            await saveCycleData(context.userId, {
              lastPeriodDate: startDate,
              nextPeriodDate,
            });
            persisted = true;
          } catch (error) {
            console.error("[Agent] Failed to update period start:", error);
          }
        }

        return {
          toolName: name,
          result: {
            success: true,
            message: `Period start recorded for ${startDate.toLocaleDateString()}`,
            startDate: startDate.toISOString(),
            nextPeriodDate: nextPeriodDate?.toISOString() || null,
            action: persisted
              ? "Your cycle data has been updated. Predictions will now be more accurate."
              : "Period recorded. Sign in to save your data permanently.",
            persisted,
          },
          success: true,
        };
      }

      case "update_pregnancy_status": {
        const isPregnant = args.isPregnant as boolean;
        const dueDate = args.estimatedDueDate
          ? new Date(args.estimatedDueDate as string)
          : null;
        const trimester = args.trimester as string | undefined;
        const weeksPregnant = args.weeksPregnant as number | undefined;
        const suppliedLmpDate = args.lastMenstrualPeriodDate
          ? new Date(args.lastMenstrualPeriodDate as string)
          : null;
        const lmpDate =
          suppliedLmpDate && !Number.isNaN(suppliedLmpDate.getTime())
            ? suppliedLmpDate
            : context.cycleData?.lastPeriodDate
              ? new Date(context.cycleData.lastPeriodDate)
              : null;
        const notes = args.notes as string | undefined;

        // If we have LMP but no due date, calculate due date (40 weeks from LMP)
        let calculatedDueDate = dueDate;
        if (!calculatedDueDate && lmpDate) {
          calculatedDueDate = new Date(lmpDate);
          calculatedDueDate.setDate(calculatedDueDate.getDate() + 280); // 40 weeks
        }

        const daysPregnant = lmpDate
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - lmpDate.getTime()) / (1000 * 60 * 60 * 24),
              ),
            )
          : null;
        const derivedWeeksPregnant =
          typeof weeksPregnant === "number"
            ? weeksPregnant
            : daysPregnant === null
              ? undefined
              : Math.floor(daysPregnant / 7);
        const derivedTrimester =
          (trimester as "first" | "second" | "third" | undefined) ||
          (calculatedDueDate
            ? (calculateTrimester(calculatedDueDate) as
                | "first"
                | "second"
                | "third")
            : undefined);

        let persisted = false;
        if (context.userId) {
          try {
            await savePregnancyData(context.userId, {
              isPregnant,
              estimatedDueDate: calculatedDueDate || undefined,
              lastMenstrualPeriodDate: lmpDate || undefined,
              trimester: derivedTrimester,
              weeksPregnant: derivedWeeksPregnant,
              notes,
              gaveBirth: false,
            });
            persisted = true;
          } catch (error) {
            console.error("[Agent] Failed to save pregnancy data:", error);
          }
        }

        return {
          toolName: name,
          result: {
            success: persisted,
            isPregnant,
            estimatedDueDate: calculatedDueDate?.toISOString() || null,
            trimester: derivedTrimester || null,
            weeksPregnant: derivedWeeksPregnant ?? null,
            message: isPregnant
              ? `Pregnancy recorded. Due date: ${calculatedDueDate?.toLocaleDateString() || "to be confirmed"}.`
              : "Pregnancy status updated.",
            persisted,
          },
          success: persisted,
        };
      }

      case "record_birth": {
        const birthDate = args.birthDate
          ? new Date(args.birthDate as string)
          : new Date();
        const motherHealth = args.motherHealth as string | undefined;

        let persisted = false;
        if (context.userId) {
          try {
            // Save birth info to pregnancy data
            await savePregnancyData(context.userId, {
              gaveBirth: true,
              birthDate,
              isPregnant: false,
              notes: motherHealth ? `After birth: ${motherHealth}` : undefined,
            });
            // Resume cycle tracking with birth date as new cycle start
            const cycleLength = context.cycleData?.cycleLength || 28;
            const periodLength = context.cycleData?.periodLength || 5;
            await updateCycleAfterBirth(context.userId, birthDate, cycleLength, periodLength);
            persisted = true;
          } catch (error) {
            console.error("[Agent] Failed to record birth:", error);
          }
        }

        return {
          toolName: name,
          result: {
            success: true,
            birthDate: birthDate.toISOString(),
            message: `Birth recorded for ${birthDate.toLocaleDateString()}. Your cycle tracking has resumed.`,
            motherHealth: motherHealth || "Not specified",
            persisted,
          },
          success: true,
        };
      }

      case "get_personalized_tips": {
        const category = args.category as string;

        const tips = getPersonalizedTips(context.cycleData, category);

        return {
          toolName: name,
          result: tips,
          success: true,
        };
      }

      case "get_system_overview": {
        if (!context.userId) throw new Error("Verified user required");
        const overview = await getAgentSystemOverview(context.userId);
        return {
          toolName: name,
          result: overview,
          success: true,
        };
      }

      case "update_user_profile": {
        if (!context.userId) throw new Error("Verified user required");
        const update: Parameters<typeof updateAgentManagedProfile>[1] = {
          displayName:
            typeof args.displayName === "string"
              ? args.displayName
              : undefined,
          language:
            args.language === "en" || args.language === "lg"
              ? args.language
              : undefined,
          reminderDaysBefore:
            typeof args.reminderDaysBefore === "number"
              ? args.reminderDaysBefore
              : undefined,
          emailNotifications:
            typeof args.emailNotifications === "boolean"
              ? args.emailNotifications
              : undefined,
          pushNotifications:
            typeof args.pushNotifications === "boolean"
              ? args.pushNotifications
              : undefined,
          theme:
            args.theme === "light" ||
            args.theme === "dark" ||
            args.theme === "system"
              ? args.theme
              : undefined,
        };
        if (Object.values(update).every((value) => value === undefined)) {
          throw new Error("No supported profile changes were provided");
        }
        await updateAgentManagedProfile(context.userId, update);
        return {
          toolName: name,
          result: { success: true, updatedFields: Object.keys(update).filter((key) => update[key as keyof typeof update] !== undefined) },
          success: true,
        };
      }

      case "request_counsellor_session": {
        if (!context.userId) throw new Error("Verified user required");
        const summary =
          typeof args.summary === "string"
            ? args.summary.trim().slice(0, 500)
            : "";
        if (!summary) throw new Error("A session summary is required");
        const session = await createSessionRequest({
          userId: context.userId,
          reason: "user_request",
          priority: "normal",
          summary,
          specialty: args.specialty as
            | import("@/types").CounsellorSpecialty
            | undefined,
          preferredLanguage:
            typeof args.preferredLanguage === "string"
              ? args.preferredLanguage.slice(0, 40)
              : undefined,
        });
        return {
          toolName: name,
          result: {
            success: true,
            sessionId: session.id,
            state: session.state,
            counsellorName: session.counsellorName || null,
          },
          success: true,
        };
      }

      default:
        return {
          toolName: name,
          result: { error: `Unknown tool: ${name}` },
          success: false,
          error: `Unknown tool: ${name}`,
        };
    }
  } catch (error) {
    return {
      toolName: name,
      result: { error: String(error) },
      success: false,
      error: String(error),
    };
  }
}

async function executeAuthorizedTool(
  toolCall: ToolCall,
  context: AgentContext,
): Promise<ToolResult> {
  const result = await executeTool(toolCall, context);
  await emitEvent("agent.tool_executed", {
    userId: context.userId || "anonymous",
    toolName: toolCall.name,
    success: result.success,
  });
  return result;
}

function describeAction(toolName: string, args: Record<string, unknown>): string {
  void args;
  const labels: Record<string, string> = {
    update_period_start: "Updated period start date",
    update_pregnancy_status: "Updated pregnancy status",
    record_birth: "Recorded birth and postpartum cycle state",
    log_symptoms: "Logged symptoms",
    set_reminder: "Created reminder",
    update_user_profile: "Updated profile preferences",
    request_counsellor_session: "Requested a counsellor session",
  };
  return labels[toolName] || `Used ${toolName}`;
}

/**
 * Calculate cycle information from cycle data.
 * Delegates to the canonical math in src/lib/cycle.ts — the agent and the
 * data layer must never disagree about what phase the user is in.
 */
function calculateCycleInfo(cycleData: CycleDataContext) {
  const info = getCycleInfo(
    new Date(cycleData.lastPeriodDate),
    cycleData.cycleLength,
    cycleData.periodLength,
  );

  return {
    currentPhase: info.phase,
    lastPeriodDate: new Date(cycleData.lastPeriodDate).toISOString(),
    dayInCycle: info.dayInCycle,
    daysUntilNextPeriod: info.daysUntilNextPeriod,
    nextPeriodDate: info.nextPeriodDate.toISOString(),
    isCurrentlyOnPeriod: info.isInPeriod,
    cycleLength: cycleData.cycleLength,
    periodLength: cycleData.periodLength,
    phaseDescription: getPhaseDescription(info.phase),
  };
}

/**
 * Calculate fertility window
 */
function calculateFertilityWindow(cycleData: CycleDataContext) {
  const today = new Date();
  const lastPeriod = new Date(cycleData.lastPeriodDate);

  // Ovulation typically occurs 14 days before next period
  const ovulationDay = cycleData.cycleLength - 14;

  // Fertile window: 5 days before ovulation through 1 day after
  const fertileStart = ovulationDay - 5;
  const fertileEnd = ovulationDay + 1;

  // Calculate days in current cycle
  const daysSinceLast = Math.floor(
    (today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dayInCycle = (daysSinceLast % cycleData.cycleLength) + 1;

  const isCurrentlyFertile =
    dayInCycle >= fertileStart && dayInCycle <= fertileEnd;
  const isOvulationDay = dayInCycle === ovulationDay;

  // Calculate next fertile window dates
  const currentCycleStart = new Date(lastPeriod);
  currentCycleStart.setDate(
    currentCycleStart.getDate() +
      Math.floor(daysSinceLast / cycleData.cycleLength) * cycleData.cycleLength,
  );

  const nextFertileStart = new Date(currentCycleStart);
  nextFertileStart.setDate(nextFertileStart.getDate() + fertileStart);

  const nextFertileEnd = new Date(currentCycleStart);
  nextFertileEnd.setDate(nextFertileEnd.getDate() + fertileEnd);

  // If we've passed it, calculate for next cycle
  if (today > nextFertileEnd) {
    nextFertileStart.setDate(
      nextFertileStart.getDate() + cycleData.cycleLength,
    );
    nextFertileEnd.setDate(nextFertileEnd.getDate() + cycleData.cycleLength);
  }

  return {
    fertileWindowStart: nextFertileStart.toISOString(),
    fertileWindowEnd: nextFertileEnd.toISOString(),
    ovulationDay: ovulationDay,
    currentDayInCycle: dayInCycle,
    isCurrentlyFertile,
    isOvulationDay,
    fertilityStatus: isOvulationDay
      ? "Peak fertility - ovulation day"
      : isCurrentlyFertile
        ? "High fertility - fertile window"
        : "Low fertility",
    advice: isCurrentlyFertile
      ? "You are in your fertile window. If trying to conceive, this is the best time. If avoiding pregnancy, use protection."
      : "You are outside your fertile window. Lower chance of conception, but no method is 100% reliable.",
  };
}

/**
 * Get phase description
 */
function getPhaseDescription(phase: string): string {
  const descriptions: Record<string, string> = {
    menstrual:
      "You're on your period. Focus on rest, hydration, and iron-rich foods. Cramps are common - heat and gentle movement can help.",
    follicular:
      "Post-period phase. Energy is rising as estrogen increases. Good time for challenging activities and new projects.",
    ovulation:
      "Fertile window. You may feel more energetic and social. If tracking fertility, this is important to note.",
    luteal:
      "Pre-period phase. Progesterone rises. PMS symptoms may appear in the second half. Practice self-care and reduce stress.",
  };
  return (
    descriptions[phase] ||
    "Track your cycle to get personalized phase information."
  );
}

/**
 * Find healthcare resources
 */
function findHealthcareResources(
  resourceType: string,
  location?: string,
  specialty?: string,
) {
  const resources = UGANDA_HEALTHCARE_RESOURCES;

  const result: Record<string, unknown> = {
    resourceType,
    location: location || "Uganda (nationwide)",
    specialty: specialty || "General",
  };

  switch (resourceType) {
    case "emergency":
      result.resources = resources.emergency;
      result.instructions =
        "For emergencies, call these numbers immediately. If someone is in immediate danger, don't hesitate.";
      break;

    case "helpline":
      result.resources = resources.helplines;
      result.instructions =
        "These helplines offer free, confidential support. Sauti 116 is available 24/7.";
      break;

    case "hospital":
    case "clinic":
      const loc = (location || "").toLowerCase();
      if (loc.includes("kampala") || loc === "") {
        result.resources = resources.hospitals.kampala;
      } else {
        result.resources = resources.hospitals.regional.filter((h) =>
          h.location.toLowerCase().includes(loc),
        );
        if ((result.resources as unknown[]).length === 0) {
          result.resources = resources.hospitals.regional;
          result.note =
            "Showing all regional hospitals. Specify your district for better results.";
        }
      }
      break;

    case "support_organization":
      result.resources = resources.support_organizations;
      if (specialty) {
        result.resources = resources.support_organizations.filter((o) =>
          o.services.some((s) =>
            s.toLowerCase().includes(specialty.toLowerCase()),
          ),
        );
      }
      break;

    default:
      result.resources = [
        resources.emergency,
        ...resources.helplines.slice(0, 2),
      ];
      result.note = "Showing emergency contacts and key helplines.";
  }

  return result;
}

/**
 * Parse scheduled date from natural language
 */
function parseScheduledDate(input: string): Date {
  const now = new Date();
  const lowered = input.toLowerCase();

  if (lowered === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  if (lowered.includes("in")) {
    const match = lowered.match(/in (\d+) day/);
    if (match) {
      const days = parseInt(match[1]);
      const future = new Date(now);
      future.setDate(future.getDate() + days);
      future.setHours(9, 0, 0, 0);
      return future;
    }
  }

  // Try to parse as ISO date
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Default to tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

/**
 * Generate health summary
 */
function generateHealthSummary(
  cycleData: CycleDataContext,
  reportType: string,
): string {
  const cycleInfo = calculateCycleInfo(cycleData);

  if (reportType === "cycle_summary") {
    return `Your cycle is ${cycleData.cycleLength} days long with periods lasting ${cycleData.periodLength} days. You are currently on day ${cycleInfo.dayInCycle} (${cycleInfo.currentPhase} phase). Your next period is expected in ${cycleInfo.daysUntilNextPeriod} days.`;
  }

  return `Health report generated. Current phase: ${cycleInfo.currentPhase}. Days until next period: ${cycleInfo.daysUntilNextPeriod}. Continue logging symptoms for more detailed insights.`;
}

/**
 * Generate recommendations
 */
function generateRecommendations(cycleData: CycleDataContext): string[] {
  const cycleInfo = calculateCycleInfo(cycleData);
  const recommendations: string[] = [];

  switch (cycleInfo.currentPhase) {
    case "menstrual":
      recommendations.push("Stay hydrated and eat iron-rich foods");
      recommendations.push("Apply heat for cramp relief");
      recommendations.push("Get adequate rest");
      break;
    case "follicular":
      recommendations.push("Great time for exercise and physical activities");
      recommendations.push("Focus on protein and complex carbs");
      recommendations.push("Energy is rising - tackle challenging tasks");
      break;
    case "ovulation":
      recommendations.push("Peak energy time - use it well");
      recommendations.push("Track fertility signs if relevant");
      recommendations.push("Stay physically active");
      break;
    case "luteal":
      recommendations.push("Practice stress management");
      recommendations.push("Reduce caffeine and salt to minimize PMS");
      recommendations.push("Prioritize sleep and self-care");
      break;
  }

  if (cycleInfo.daysUntilNextPeriod <= 3) {
    recommendations.push("Period coming soon - prepare your supplies");
  }

  return recommendations;
}

/**
 * Get personalized tips based on cycle phase
 */
function getPersonalizedTips(
  cycleData: CycleDataContext | undefined,
  category: string,
) {
  const phase = cycleData
    ? calculateCycleInfo(cycleData).currentPhase
    : "unknown";

  const tips: Record<string, Record<string, string[]>> = {
    nutrition: {
      menstrual: [
        "Eat iron-rich foods: spinach, red meat, beans, lentils",
        "Stay hydrated - water, herbal teas, coconut water",
        "Dark chocolate (70%+) provides magnesium for cramps",
        "Avoid excess salt to reduce bloating",
      ],
      follicular: [
        "Focus on lean proteins to support energy",
        "Add fermented foods for gut health",
        "Complex carbs for sustained energy",
        "Fresh fruits and vegetables for vitamins",
      ],
      ovulation: [
        "Antioxidant-rich foods: berries, leafy greens",
        "Light, fresh meals suit high energy",
        "Zinc-rich foods support reproductive health",
        "Stay well hydrated",
      ],
      luteal: [
        "Magnesium foods: bananas, avocados, nuts",
        "Complex carbs to stabilize mood",
        "Reduce caffeine to minimize anxiety",
        "Calcium-rich foods help with PMS",
      ],
      unknown: [
        "Eat a balanced diet with iron, protein, and vegetables",
        "Stay hydrated throughout the day",
        "Limit processed foods and excess sugar",
        "Include healthy fats like avocado and nuts",
      ],
    },
    exercise: {
      menstrual: [
        "Gentle yoga and stretching",
        "Light walking",
        "Swimming if comfortable",
        "Rest is okay - listen to your body",
      ],
      follicular: [
        "High-intensity workouts",
        "Strength training",
        "Try new exercise classes",
        "Energy is building - push yourself",
      ],
      ovulation: [
        "Peak performance time",
        "HIIT and cardio",
        "Group fitness activities",
        "Challenge yourself with new goals",
      ],
      luteal: [
        "Moderate exercise is best",
        "Pilates and yoga",
        "Walking and light jogging",
        "Reduce intensity as period approaches",
      ],
      unknown: [
        "Aim for 30 minutes of movement daily",
        "Mix cardio and strength training",
        "Listen to your body's needs",
        "Gentle yoga helps with cramps",
      ],
    },
    sleep: {
      menstrual: [
        "You may need more sleep - honor that",
        "Warm bath before bed for relaxation",
        "Use extra pillows for comfort",
        "Avoid screens an hour before sleep",
      ],
      follicular: [
        "Sleep quality often improves this phase",
        "Maintain consistent sleep schedule",
        "Morning light helps regulate rhythm",
        "7-8 hours is ideal",
      ],
      ovulation: [
        "You may feel more awake - maintain routine",
        "Don't sacrifice sleep for activities",
        "Keep bedroom cool for better sleep",
        "Avoid late caffeine",
      ],
      luteal: [
        "Sleep may be disrupted - practice sleep hygiene",
        "Magnesium before bed may help",
        "Keep room dark and cool",
        "Avoid alcohol which disrupts sleep",
      ],
      unknown: [
        "Aim for 7-9 hours per night",
        "Keep consistent sleep and wake times",
        "Create a relaxing bedtime routine",
        "Limit screen time before bed",
      ],
    },
    mood: {
      menstrual: [
        "Be gentle with yourself",
        "Journal your feelings",
        "Connect with supportive people",
        "Allow rest without guilt",
      ],
      follicular: [
        "Channel rising energy positively",
        "Set intentions for the cycle",
        "Socialize - you're likely feeling open",
        "Start creative projects",
      ],
      ovulation: [
        "Confidence may be higher",
        "Good time for important conversations",
        "Express yourself and your needs",
        "Enjoy social connections",
      ],
      luteal: [
        "Practice extra self-compassion",
        "Mindfulness and deep breathing",
        "Reduce stress where possible",
        "Know that feelings are temporary",
      ],
      unknown: [
        "Practice daily gratitude",
        "Move your body to boost mood",
        "Connect with supportive people",
        "Seek help if feelings persist",
      ],
    },
    pain_relief: {
      menstrual: [
        "Heat therapy: hot water bottle on abdomen",
        "NSAIDs like ibuprofen work best early",
        "Gentle stretching and yoga",
        "Ginger tea is anti-inflammatory",
      ],
      follicular: [
        "Pain usually subsides this phase",
        "Continue gentle movement",
        "Stay hydrated",
        "Address any persistent pain with doctor",
      ],
      ovulation: [
        "Mild ovulation pain is normal",
        "Typically brief (hours to a day)",
        "Heat can help if needed",
        "Severe pain warrants doctor visit",
      ],
      luteal: [
        "Breast tenderness may occur",
        "Supportive bra helps",
        "Reduce caffeine and salt",
        "Prepare pain relief for upcoming period",
      ],
      unknown: [
        "Heat is effective for cramps",
        "Anti-inflammatory foods help",
        "Gentle movement releases endorphins",
        "See a doctor for severe or unusual pain",
      ],
    },
    general_wellness: {
      menstrual: [
        "Self-care is not selfish",
        "Rest when needed",
        "Comfort foods in moderation are okay",
        "Track your symptoms for patterns",
      ],
      follicular: [
        "Build healthy habits now",
        "Energy is great for health goals",
        "Schedule appointments and check-ups",
        "Set positive intentions",
      ],
      ovulation: [
        "Use peak energy wisely",
        "Balance activity with rest",
        "Stay connected socially",
        "Be mindful of fertility",
      ],
      luteal: [
        "Wind down gradually",
        "Prepare for your period",
        "Practice stress management",
        "Be kind to yourself",
      ],
      unknown: [
        "Track your cycle for insights",
        "Maintain consistent self-care",
        "Regular check-ups are important",
        "Listen to your body's signals",
      ],
    },
  };

  const categoryTips = tips[category] || tips.general_wellness;
  const phaseTips = categoryTips[phase] || categoryTips.unknown;

  return {
    category,
    phase,
    tips: phaseTips,
    general: `These tips are personalized for your ${phase} phase. Your body's needs change throughout your cycle - honoring that supports your overall health.`,
  };
}

/**
 * Generate intelligent fallback response when AI doesn't return useful content
 * This prevents generic "I don't understand" messages
 */
function generateFallbackResponse(
  message: string,
  context: AgentContext,
): string {
  const m = message.toLowerCase();
  const userName = context.userProfile?.displayName;

  // CRITICAL: Check for crisis situations FIRST - these bypass everything else
  // Self-harm/suicide patterns (expanded for slang/typos)
  if (
    /kill\s*(my|ma|me)\s*self|wanna\s*die|want\s*to\s*die|suicide|end\s*(my|ma)\s*life|hang\s*(my|ma)\s*self|hung\s*(my|ma)\s*self|take\s*(my|ma)\s*life|don'?t\s*want\s*to\s*live|can'?t\s*go\s*on|kms|end\s*it\s*all/i.test(
      m,
    )
  ) {
    return `I'm really glad you reached out. What you're feeling matters, and I'm concerned about your safety. Please know you're not alone. 💜

Please reach out right now in Uganda:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7) - They provide mental health and psychosocial support
📞 Butabika National Referral Mental Hospital: 0414 504 379
📞 Uganda Police Emergency: 999 or 112
🏥 Go to the nearest hospital or health centre

You can also reach out to a trusted person like a teacher, religious leader, counselor, or family member.

Your life matters. These feelings can get better with support. There are people in Uganda who care and want to help you through this. Please don't give up. 💜`;
  }

  // Violence towards others
  if (
    /pour\s*acid|throw\s*acid|burn\s*(them|someone)|stab|shoot|murder|kill\s*(them|someone|her|him)|attack\s*(them|someone)/i.test(
      m,
    )
  ) {
    return `I can hear that you're going through something really difficult right now. 💜 Those feelings of anger and wanting to hurt someone can be overwhelming.

But I care about you, and I want to help you find a safer way to deal with this. Hurting someone would have serious consequences for your life and future.

Please reach out to talk to someone right now:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7) - They can help you work through these feelings
📞 Butabika National Referral Mental Hospital: 0414 504 379

Can you tell me more about what's making you feel this way? Sometimes talking about what's hurting us can help us find better solutions. You're not alone in this. 💜`;
  }

  // Feeling bad/depressed - needs empathetic response
  if (
    m.includes("feeling bad") ||
    m.includes("feel bad") ||
    m.includes("depressed") ||
    m.includes("hopeless") ||
    m.includes("worthless")
  ) {
    return `I'm sorry you're feeling this way. 💜 Your feelings are valid, and I'm here for you.

Would you like to talk about what's happening? Sometimes sharing what's on your heart can help. 

If you're going through a really hard time, please remember you can also call:
📞 Sauti 116 Helpline: 116 (free, 24/7) - They're trained to listen and help.

I'm here for you. What's going on? 💜`;
  }

  // "Be my big sis" type requests
  if (m.includes("big sis") || (m.includes("be my") && m.includes("sis"))) {
    return `Of course I can be your big sis! 💜 I'm here to support you through anything. What's on your mind today?`;
  }

  // Asking AI to choose a name
  if (
    (m.includes("choose") && m.includes("name")) ||
    (m.includes("pick") && m.includes("name"))
  ) {
    // Extract the letter they want
    const letterMatch =
      m.match(/letter\s*['"]?([a-z])['"]?/i) ||
      m.match(/starting with\s*['"]?([a-z])['"]?/i);
    if (letterMatch) {
      const letter = letterMatch[1].toUpperCase();
      const names: Record<string, string[]> = {
        A: ["Amara", "Aisha", "Adaeze"],
        B: ["Blessing", "Beatrice", "Brenda"],
        C: ["Chidera", "Care", "Comfort"],
        D: ["Dorothy", "Divine", "Diana"],
        E: ["Esther", "Emma", "Eunice"],
        F: ["Faith", "Favour", "Florence"],
        G: ["Grace", "Gloria", "Gift"],
        H: ["Hope", "Happiness", "Hannah"],
        I: ["Irene", "Ivy", "Immaculate"],
        J: ["Joy", "Janet", "Judith"],
        K: ["Kindness", "Karen", "Kate"],
        L: ["Love", "Linda", "Lucy"],
        M: ["Mercy", "Mary", "Martha"],
        N: ["Naomi", "Nancy", "Natasha"],
        O: ["Olivia", "Onyinye", "Ogechi"],
        P: ["Patience", "Peace", "Precious"],
        Q: ["Queen", "Queenie"],
        R: ["Ruth", "Rose", "Rachel"],
        S: ["Sister", "Sarah", "Sharon"],
        T: ["Thankful", "Tina", "Trudy"],
        U: ["Unity", "Uche", "Uju"],
        V: ["Victory", "Violet", "Vera"],
        W: ["Wisdom", "Winifred", "Winnie"],
        X: ["Xena"],
        Y: ["Yetunde", "Yinka"],
        Z: ["Zainab", "Zara", "Zena"],
      };
      const options = names[letter] || ["Care"];
      const chosenName = options[0];
      return `How about "${chosenName}"? 💜 It feels right for me as your supportive sister. You can call me ${chosenName} from now on!`;
    }
    return `I'd love a special name! 💜 What letter should it start with?`;
  }

  // Positive affirmations like "that's sick", "cool", "nice"
  if (
    m.match(
      /^(sick|cool|nice|awesome|great|amazing|love it|perfect|dope|fire|lit)/i,
    ) ||
    m.includes("that's sick") ||
    m.includes("thats sick") ||
    m.includes("i like")
  ) {
    return `I'm glad you like it! 💜 How can I help you today?`;
  }

  // Questions about their name
  if (
    m.includes("my name") ||
    m.includes("what am i called") ||
    m.includes("who am i")
  ) {
    if (userName) {
      return `Your name is ${userName}. 💜 How can I help you today?`;
    }
    return "I don't have your name saved yet. You can set it in Settings, or just tell me what you'd like me to call you! 💜";
  }

  // Questions about cycle/period
  if (m.includes("period") || m.includes("cycle") || m.includes("menstruat")) {
    if (context.cycleData) {
      const cycleInfo = calculateCycleInfo(context.cycleData);
      const nextDate = new Date(cycleInfo.nextPeriodDate).toLocaleDateString(
        "en-US",
        { month: "long", day: "numeric" },
      );

      if (
        m.includes("when") ||
        m.includes("how many") ||
        m.includes("days") ||
        m.includes("left")
      ) {
        return `You have ${cycleInfo.daysUntilNextPeriod} days until your next period, which should arrive around ${nextDate}. 🌸`;
      }
      if (m.includes("phase") || m.includes("what phase")) {
        return `You're currently in your ${cycleInfo.currentPhase} phase (day ${cycleInfo.dayInCycle} of your cycle). ${getPhaseDescription(cycleInfo.currentPhase)} 💜`;
      }
      if (m.includes("start") || m.includes("began") || m.includes("came")) {
        return `Got it! I've noted that your period started. 💜 How are you feeling? Do you have any cramps or symptoms I should know about?`;
      }
    }
    return "I'd love to help with your cycle questions! Please set up your cycle data in Settings first, or tell me when your last period started. 🌸";
  }

  // Cramps and pain
  if (m.includes("cramp") || m.includes("pain") || m.includes("hurt")) {
    return `I'm sorry you're dealing with cramps. 💜 Here are some things that can help:\n\n• Apply a hot water bottle or heating pad to your lower belly\n• Gentle stretching or walking\n• Stay hydrated\n• Rest if you need to\n\nIf the pain is severe or unusual, please see a health professional. 🌸`;
  }

  // Emotional support
  if (
    m.includes("sad") ||
    m.includes("anxious") ||
    m.includes("worried") ||
    m.includes("stressed") ||
    m.includes("depressed")
  ) {
    return `I hear you, and your feelings are valid. 💜 I'm here for you.\n\nWould you like to:\n• Talk about what's going on?\n• Try some deep breathing together?\n• Just have someone listen?\n\nI'm here, whatever you need. 🌸`;
  }

  // Mood and feelings
  if (m.includes("feel") || m.includes("mood")) {
    return `Thank you for sharing how you're feeling. 💜 Your emotions matter. Would you like to talk more about it, or would you prefer some self-care tips?`;
  }

  // Questions about the AI's name
  if (m.includes("your name") || (m.includes("called") && m.includes("you"))) {
    return "I'm Sister, your supportive companion here at SisterCare! But if you'd like to give me a different name, just let me know. 💜";
  }

  // Greetings
  if (
    m.match(
      /^(hi|hello|hey|sup|yo|hola|good morning|good evening|howdy|hii|heey|heyy)/i,
    )
  ) {
    const greeting = userName ? `Hey ${userName}! ` : "Hey there! ";
    return `${greeting}Good to see you. 💜 How can I help you today?`;
  }

  // How are you / feeling questions
  if (
    m.includes("how are you") ||
    m.includes("how do you feel") ||
    m.includes("wassup") ||
    m.includes("what's up")
  ) {
    return "I'm here and ready to help! 💜 More importantly, how are YOU feeling today?";
  }

  // Thank you responses
  if (m.includes("thank") || m.includes("thanks")) {
    return "You're welcome! 💜 I'm always here when you need me. Is there anything else I can help with?";
  }

  // "What can you do" type questions
  if (
    m.includes("what can you") ||
    m.includes("help me with") ||
    m.includes("what do you do")
  ) {
    return `I'm here to support you! 💜 I can:\n\n• Track your menstrual cycle and predict your next period\n• Log symptoms and moods\n• Answer health questions\n• Provide emotional support\n• Connect you with counsellors if needed\n\nWhat would you like help with?`;
  }

  // Local language intent hints added by the API for Luganda and similar phrases.
  if (
    m.includes("i want to talk to a counsellor") ||
    m.includes("human support") ||
    m.includes("talk to a counsellor") ||
    m.includes("counselor")
  ) {
    return `Of course - I can help connect you to a counsellor. 💜

If you'd like, I can match you with a counsellor now, or we can talk about what's going on first. If this feels urgent, tell me what's happening and I'll help right away.`;
  }

  if (
    m.includes("i have abdominal pain") ||
    m.includes("i have cramps") ||
    m.includes("period pain") ||
    m.includes("lower abdominal pain")
  ) {
    return `I'm sorry you're in pain. 💜 For cramps or lower abdominal pain, try:

• A hot water bottle or warm compress on your lower belly
• Gentle stretching or a short walk
• Drinking water and resting
• Avoiding very heavy activity for now

If the pain is severe, unusual, or getting worse, please see a health professional.`;
  }

  if (
    m.includes("a girl is pregnant") ||
    m.includes("pregnant girl") ||
    m.includes("pregnant")
  ) {
    return `If a girl is pregnant, the next best step is to get support from a trusted adult or health worker. 💜

Please try to confirm the pregnancy with a clinic or health professional, and encourage antenatal care as early as possible. If there is fear, pressure, or safety concern, I can also help you think through who to talk to safely.`;
  }

  if (
    m.includes("i feel very bad today and need help") ||
    m.includes("i need help") ||
    m.includes("feel very bad")
  ) {
    return `I'm here with you. 💜 Please tell me a little more about what is happening so I can help in the right way.

If you want, you can tell me:
• whether it's pain, stress, or fear
• whether you need a counsellor
• whether this is about pregnancy, periods, or something else`;
  }

  // User frustration - apologize and try to help
  if (
    m.includes("stupid") ||
    m.includes("idiot") ||
    m.includes("dumb") ||
    m.includes("useless") ||
    m.includes("what's wrong with you") ||
    m.includes("whats wrong with you") ||
    m.includes("don't understand") ||
    m.includes("not helpful")
  ) {
    return `I'm really sorry I'm not being helpful right now. 💜 I want to do better for you. Can you tell me specifically what you need help with? I'll try my best to give you a useful answer.`;
  }

  // "Why don't you answer" type questions
  if (
    m.includes("why don't you") ||
    m.includes("why dont you") ||
    m.includes("answer me") ||
    m.includes("not answering") ||
    m.includes("not responding") ||
    m.includes("ignoring me")
  ) {
    return `I'm so sorry if I seemed unresponsive! 💜 I'm here now and listening. Please tell me what's on your mind - I want to help you.`;
  }

  // "What have I told you" type questions - acknowledge the gap
  if (
    m.includes("told you") ||
    m.includes("i said") ||
    m.includes("just said") ||
    m.includes("already said")
  ) {
    return `You're right, I should be paying better attention. 💜 I'm sorry. Can you please repeat what you need? I'm fully focused on helping you now.`;
  }

  // When user says something the AI should respond to contextually
  if (
    m.includes("give me answers") ||
    m.includes("respond to") ||
    m.includes("basing on")
  ) {
    return `You're absolutely right - I should be responding to what you're actually saying! 💜 I apologize for the confusion. Please share what's on your mind, and I'll give you a proper response.`;
  }

  // Default helpful response - more conversational
  const defaultResponses = [
    "I'm here to help! 💜 You can ask me about your menstrual cycle, log how you're feeling, or just chat. What's on your mind?",
    "Hey, I'm listening! 💜 Feel free to ask me anything about your health or just share how you're feeling today.",
    "I'm your Sister, always here for you. 💜 What would you like to talk about?",
  ];
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

/**
 * Helper function to fetch with retry logic for network issues and rate limits
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 1, // Reduced retries - fail fast and try next model
  timeoutMs: number = 20000, // Reduced timeout
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Handle rate limiting (429) - fail fast, don't retry here
      if (response.status === 429) {
        clearTimeout(timeoutId);
        // Immediately throw to try next model
        throw new Error(
          `RATE_LIMITED:I'm receiving a lot of messages right now! Please wait about 30 seconds and try again. 💜`,
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a rate limit error we threw
      if (lastError.message.startsWith("RATE_LIMITED:")) {
        throw lastError;
      }

      // Check if it's a timeout or network error worth retrying
      const isRetryable =
        lastError.name === "AbortError" ||
        lastError.message.includes("fetch failed") ||
        lastError.message.includes("ETIMEDOUT") ||
        lastError.message.includes("ECONNRESET") ||
        lastError.message.includes("ConnectTimeoutError");

      if (!isRetryable || attempt === maxRetries) {
        break;
      }

      // Wait before retrying (short backoff)
      const waitTime = Math.min(1000 * attempt, 3000);
      console.log(
        `Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError || new Error("Network request failed");
}

// Per-user request tracking so one chatty user can't starve everyone else.
// NOTE: in-memory state is per-server-instance — on serverless this resets per
// lambda. Good enough as a courtesy limit; hard quota enforcement belongs at
// the edge or in a shared store once auth lands.
interface UserRequestState {
  lastRequestTime: number;
  requestCount: number;
  windowStart: number;
}

const userRequestStates = new Map<string, UserRequestState>();
const USER_STATE_TTL_MS = 5 * 60000;

// Upstream circuit breaker — deliberately GLOBAL, not per-user: when every
// model is failing (quota exhausted, provider outage) that affects all users,
// and hammering the API on behalf of other users just prolongs it.
const upstreamHealth = {
  consecutiveFailures: 0,
  cooldownUntil: 0,
};

// Minimum time between requests per user (ms) - prevents hammering
const MIN_REQUEST_INTERVAL = 2000;
// Max requests per minute PER USER - conservative for free tier
const MAX_REQUESTS_PER_MINUTE = 6;
// Cooldown after consecutive failures
const FAILURE_COOLDOWN_MS = 60000; // 1 minute cooldown after failures

function getUserRequestState(userKey: string, now: number): UserRequestState {
  // Prune stale entries so the map doesn't grow unbounded on long-lived servers
  if (userRequestStates.size > 1000) {
    for (const [key, state] of userRequestStates) {
      if (now - state.lastRequestTime > USER_STATE_TTL_MS) {
        userRequestStates.delete(key);
      }
    }
  }

  let state = userRequestStates.get(userKey);
  if (!state) {
    state = { lastRequestTime: 0, requestCount: 0, windowStart: now };
    userRequestStates.set(userKey, state);
  }
  return state;
}

/**
 * Main agent execution function
 * Handles the full agent loop: parse → reason → act → respond
 */
export async function executeAgent(
  apiKey: string,
  message: string,
  context: AgentContext,
  options?: { preferGemini?: boolean },
): Promise<{
  response: string;
  toolsUsed: string[];
  actions: string[];
}> {
  const toolsUsed: string[] = [];
  const actions: string[] = [];

  // Rate limiting
  const now = Date.now();

  // Upstream circuit breaker: all models were recently failing
  if (now < upstreamHealth.cooldownUntil) {
    console.log("[Agent] In cooldown period, using local fallback");
    return {
      response: generateFallbackResponse(message, context),
      toolsUsed: [],
      actions: ["Used local response - AI cooling down"],
    };
  }

  const userKey = context.userId || "anonymous";
  const userState = getUserRequestState(userKey, now);

  if (now - userState.windowStart > 60000) {
    // Reset this user's window
    userState.windowStart = now;
    userState.requestCount = 0;
  }

  // Per-user limit - use fallback instead of error so the user still gets help
  if (userState.requestCount >= MAX_REQUESTS_PER_MINUTE) {
    console.log(
      `[Agent] Rate limit reached for user ${userKey.slice(0, 8)}..., using local fallback`,
    );
    return {
      response: generateFallbackResponse(message, context),
      toolsUsed: [],
      actions: ["Used local response due to rate limiting"],
    };
  }

  // Enforce minimum interval between THIS user's requests
  const timeSinceLastRequest = now - userState.lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest),
    );
  }

  userState.lastRequestTime = Date.now();
  userState.requestCount++;

  // Try configured providers and models in order until one works.
  let lastError: Error | null = null;
  const modelPlan = buildAgentModelPlan({
    ...process.env,
    GEMINI_API_KEY: apiKey || process.env.GEMINI_API_KEY,
  }, options?.preferGemini ? ["gemini", "groq"] : undefined);

  for (const attempt of modelPlan) {
    try {
      const result =
        attempt.provider === "groq"
          ? await executeWithGroq(
              attempt.apiKey,
              attempt.model,
              message,
              context,
              toolsUsed,
              actions,
            )
          : await executeWithModel(
              attempt.apiKey,
              attempt.model,
              message,
              context,
              toolsUsed,
              actions,
            );
      // Success! Reset failure counter
      upstreamHealth.consecutiveFailures = 0;
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[Agent] ${attempt.provider}/${attempt.model} failed:`,
        lastError.message,
      );

      // If it's a rate limit error, try the next model immediately
      if (
        lastError.message.includes("429") ||
        lastError.message.includes("RATE_LIMITED")
      ) {
        console.log(`[Agent] Trying next model due to rate limit...`);
        continue;
      }

      // For other errors, also try next model
      continue;
    }
  }

  // All models failed - track failures and enter cooldown if needed
  upstreamHealth.consecutiveFailures++;
  if (upstreamHealth.consecutiveFailures >= 3) {
    console.log("[Agent] Multiple failures, entering cooldown");
    upstreamHealth.cooldownUntil = Date.now() + FAILURE_COOLDOWN_MS;
    upstreamHealth.consecutiveFailures = 0;
  }

  // Use intelligent local fallback instead of throwing error
  console.log("[Agent] All models failed, using local fallback response");
  return {
    response: generateFallbackResponse(message, context),
    toolsUsed: [],
    actions: ["Used local response - AI models unavailable"],
  };
}

/**
 * Execute through Groq's OpenAI-compatible Chat Completions function-calling
 * interface. Custom tools always execute locally through executeTool, so Groq
 * never receives database credentials or direct write access.
 */
async function executeWithGroq(
  apiKey: string,
  model: string,
  message: string,
  context: AgentContext,
  toolsUsed: string[],
  actions: string[],
): Promise<{
  response: string;
  toolsUsed: string[];
  actions: string[];
}> {
  const url = `${process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"}/chat/completions`;
  const contextSummary = {
    displayName: context.userProfile?.displayName || null,
    onboardingCompleted: context.userProfile?.onboardingCompleted ?? false,
    cycle: context.cycleData
      ? calculateCycleInfo(context.cycleData)
      : null,
    pregnancy: context.pregnancyData || null,
  };
  const systemPrompt = `${AGENT_SYSTEM_PROMPT}

## SISTERCARE SYSTEM CONTEXT
You operate inside SisterCare. You may reason about the supplied user context
and call only the provided tools. Tool results are canonical. Never claim a
write succeeded until its tool result says success. Never invent unavailable
profile, cycle, pregnancy, reminder, symptom, counsellor, or session data.

CURRENT USER CONTEXT:
${JSON.stringify(contextSummary)}`;

  type XaiMessage = {
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
    tool_call_id?: string;
  };

  const messages: XaiMessage[] = [
    { role: "system", content: systemPrompt },
    ...context.conversationHistory.slice(-30).map(
      (entry): XaiMessage => ({
        role: entry.role === "user" ? "user" : "assistant",
        content: entry.content,
      }),
    ),
    { role: "user", content: message },
  ];
  const tools = AGENT_TOOLS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  for (let iteration = 0; iteration < 5; iteration += 1) {
    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: "auto",
          parallel_tool_calls: false,
          temperature: 0.4,
          max_tokens: 1536,
        }),
      },
      2,
      30_000,
    );
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0] as
      | { finish_reason?: string; message?: XaiMessage }
      | undefined;
    const assistant = choice?.message;
    if (!assistant) throw new Error("Groq returned no assistant message");
    const toolCalls = assistant.tool_calls || [];
    if (toolCalls.length === 0) {
      const text = assistant.content || generateFallbackResponse(message, context);
      assertCompleteResponse(text, choice?.finish_reason);
      return {
        response: cleanResponse(text),
        toolsUsed,
        actions,
      };
    }

    messages.push({
      role: "assistant",
      content: assistant.content || null,
      tool_calls: toolCalls,
    });
    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      const result = await executeAuthorizedTool(
        { name: call.function.name, args },
        context,
      );
      toolsUsed.push(call.function.name);
      if (result.success) actions.push(describeAction(call.function.name, args));
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result.result),
      });
    }
  }

  throw new Error("Groq tool loop exceeded maximum iterations");
}

/**
 * Execute with a specific Gemini model.
 */
async function executeWithModel(
  apiKey: string,
  model: string,
  message: string,
  context: AgentContext,
  toolsUsed: string[],
  actions: string[],
): Promise<{
  response: string;
  toolsUsed: string[];
  actions: string[];
}> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  console.log(`[Agent] Using model: ${model}`);

  // Build conversation with context - include more history for better context
  const contents = [
  ...context.conversationHistory.slice(-30).map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  // Add user context to system prompt if available
  let enhancedSystemPrompt = AGENT_SYSTEM_PROMPT;

  // Add user's name PROMINENTLY for personalization
  if (context.userProfile?.displayName) {
    enhancedSystemPrompt += `\n\n=== USER INFORMATION ===\nUSER'S NAME: ${context.userProfile.displayName}\nWhen they ask "what is my name" or "what's my name", tell them: "${context.userProfile.displayName}"\n=========================`;
  } else {
    enhancedSystemPrompt += `\n\n=== USER INFORMATION ===\nUser has not set their name. If asked about their name, say "I don't have your name yet - you can set it in Settings."\n=========================`;
  }

  if (context.cycleData) {
    const cycleInfo = calculateCycleInfo(context.cycleData);
    const nextPeriodFormatted = new Date(
      cycleInfo.nextPeriodDate,
    ).toLocaleDateString("en-US", { month: "long", day: "numeric" });
    enhancedSystemPrompt += `\n\n=== CYCLE DATA (USE THIS!) ===
Current cycle day: Day ${cycleInfo.dayInCycle} of ${cycleInfo.cycleLength}
Current phase: ${cycleInfo.currentPhase}
Days until next period: ${cycleInfo.daysUntilNextPeriod} days
Next period date: ${nextPeriodFormatted}
Currently on period: ${cycleInfo.isCurrentlyOnPeriod ? "YES" : "NO"}

IMPORTANT: When asked "when is my next period" or "how many days until my period", respond with:
"You have ${cycleInfo.daysUntilNextPeriod} days until your next period, which should start around ${nextPeriodFormatted}."
================================`;
  } else {
    enhancedSystemPrompt += `\n\n=== CYCLE DATA ===\nNo cycle data available. If user asks about their cycle, say:\n"I don't have your cycle information yet. Would you like to set it up? You can do this in Settings or just tell me when your last period started."\n===================`;
  }

  // Inject pregnancy context
  if (context.pregnancyData) {
    const pd = context.pregnancyData;
    if (pd.isPregnant) {
      enhancedSystemPrompt += `\n\n=== PREGNANCY DATA ===
The user is CURRENTLY PREGNANT.
Due date: ${pd.estimatedDueDate ? new Date(pd.estimatedDueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not yet provided"}
Trimester: ${pd.trimester || "Not yet determined"}
Weeks pregnant: ${pd.weeksPregnant ? `${pd.weeksPregnant} weeks` : "Not yet calculated"}

IMPORTANT:
- Do NOT ask about periods or cycle while the user is pregnant
- Give pregnancy-appropriate advice when asked
- If the user says they've given birth, call record_birth tool
===========================`;
    } else if (pd.gaveBirth) {
      enhancedSystemPrompt += `\n\n=== POSTPARTUM DATA ===
The user has recently given birth (birth date: ${pd.birthDate ? new Date(pd.birthDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "recently"}).
Cycle tracking has resumed from the birth date.
Offer postpartum care advice when appropriate.
===========================`;
    }
  }

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: enhancedSystemPrompt }],
    },
    tools: [
      {
        functionDeclarations: getGeminiFunctionDeclarations(),
      },
    ],
    toolConfig: {
      functionCallingConfig: {
        mode: "AUTO",
      },
    },
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1536,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_ONLY_HIGH",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH",
      },
    ],
  };

  // Use retry logic with shorter timeout for better UX
  let response = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
    2,
    30000,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  let data = await response.json();

  // Check for function calls and execute them
  let maxIterations = 5; // Prevent infinite loops
  let iterations = 0;

  while (iterations < maxIterations) {
    const candidate = data.candidates?.[0];

    if (!candidate?.content?.parts) {
      break;
    }

    // Check for function calls
    const functionCalls = candidate.content.parts.filter(
      (part: { functionCall?: unknown }) => part.functionCall,
    );

    if (functionCalls.length === 0) {
      // No more function calls, extract text response
      break;
    }

    // Execute all function calls
    const toolResults: Array<{
      functionResponse: { name: string; response: unknown };
    }> = [];

    for (const part of functionCalls) {
      const call = part.functionCall as {
        name: string;
        args: Record<string, unknown>;
      };
      console.log(`Agent calling tool: ${call.name}`);

      const result = await executeAuthorizedTool(
        { name: call.name, args: call.args || {} },
        context,
      );

      toolsUsed.push(call.name);
      if (result.success) {
        actions.push(
          `${call.name}: ${JSON.stringify(result.result).substring(0, 100)}...`,
        );
      }

      toolResults.push({
        functionResponse: {
          name: call.name,
          response: result.result,
        },
      });
    }

    // Send tool results back to the model
    const followUpContents = [
      ...contents,
      { role: "model", parts: functionCalls },
      {
        role: "user",
        parts: toolResults.map((r) => ({
          functionResponse: r.functionResponse,
        })),
      },
    ];

    const followUpBody = {
      ...requestBody,
      contents: followUpContents,
    };

    // Use retry logic for follow-up calls
    response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(followUpBody),
      },
      2,
      30000,
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Gemini API follow-up error: ${response.status} - ${errorText}`,
      );
    }

    data = await response.json();
    iterations++;
  }

  // Extract final text response
  const finalCandidate = data.candidates?.[0];
  const finalText =
    finalCandidate?.content?.parts
      ?.filter((part: { text?: string }) => part.text)
      ?.map((part: { text?: string }) => part.text)
      ?.join("\n") || generateFallbackResponse(message, context);

  assertCompleteResponse(finalText, finalCandidate?.finishReason);

  return {
    response: cleanResponse(finalText),
    toolsUsed,
    actions,
  };
}

/**
 * Calculate trimester from due date (rough estimate based on current date vs due date)
 */
function calculateTrimester(dueDate: Date): string {
  const now = new Date();
  const totalPregnancyDays = 280; // 40 weeks
  const daysElapsed = Math.floor(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysPregnant = totalPregnancyDays - daysElapsed;
  const weeksPregnant = Math.floor(daysPregnant / 7);

  if (weeksPregnant <= 13) return "first";
  if (weeksPregnant <= 27) return "second";
  return "third";
}

// Clean and format response for chat display
function cleanResponse(text: string): string {
  return (
    text
      // Remove excessive bold/italic markdown but keep text readable
      .replace(/\*\*\*([^*]+)\*\*\*/g, "$1") // Bold italic
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
      .replace(/\*([^*]+)\*/g, "$1") // Italic
      // Remove code blocks but keep the content
      .replace(/```[\w]*\n?([\s\S]*?)```/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      // Remove heading markers
      .replace(/^#{1,6}\s+/gm, "")
      // Clean up excessive whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
