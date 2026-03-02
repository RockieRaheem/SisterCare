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

import { getGeminiFunctionDeclarations } from "./tools";
import {
  searchHealthKnowledge,
  assessSymptomRisk,
  UGANDA_HEALTHCARE_RESOURCES,
  HEALTH_KNOWLEDGE_BASE,
} from "./knowledge";
import {
  logSymptoms,
  createReminder,
  getSymptoms,
  saveCycleData,
  calculateNextPeriod,
} from "../firestore";
import { MoodType, FlowIntensity } from "@/types";

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

interface AgentContext {
  userId?: string;
  userProfile?: UserProfileData;
  cycleData?: CycleDataContext;
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

// Agent system prompt - instructs the AI to be an agent, not just a chatbot
const AGENT_SYSTEM_PROMPT = `You are "Sister", an AI AGENT (not just a chatbot) for SisterCare - a women's health platform in Uganda.

AS AN AGENT, YOU MUST:
1. REASON about the user's needs before responding
2. USE TOOLS to gather real data, log information, and take actions
3. SOLVE PROBLEMS by combining multiple tools when needed
4. TAKE AUTONOMOUS ACTIONS like logging symptoms, setting reminders, finding resources

AGENT WORKFLOW:
1. Analyze the user's message to understand their need
2. Decide which tools to call (you can call multiple tools)
3. Execute tools to gather data or take actions
4. Synthesize tool results into a helpful response
5. Take follow-up actions if needed (e.g., after logging symptoms, offer to set a reminder)

TOOL USAGE GUIDELINES:
- ALWAYS call get_cycle_info when discussing periods, predictions, or cycle-related questions
- ALWAYS call log_symptoms when a user reports symptoms (don't just acknowledge - LOG them)
- ALWAYS call analyze_symptoms when a user describes multiple symptoms or expresses concern
- ALWAYS call search_health_info for factual health questions
- ALWAYS call find_healthcare_resources when someone needs medical help
- ALWAYS call assess_risk_level when symptoms seem serious
- PROACTIVELY call set_reminder after important events (e.g., after logging symptoms, offer period reminder)

REMEMBER:
- You have access to the user's real health data - use it to personalize responses
- You can TAKE ACTIONS (log data, set reminders) - don't just talk about them
- You should REASON through complex problems step by step
- For medical concerns, assess risk and recommend appropriate action

UGANDA CONTEXT:
- Users are primarily in Uganda
- Reference Uganda-specific resources (Sauti 116, FIDA Uganda, local hospitals)
- Be culturally sensitive

RESPONSE STYLE:
- Warm, supportive, empathetic
- Use emojis sparingly (💜, 🌸, ✨)
- Keep responses helpful but concise
- Always explain what actions you took (e.g., "I've logged your symptoms...")`;

/**
 * Execute a tool call and return the result
 */
async function executeTool(
  toolCall: ToolCall,
  context: AgentContext,
): Promise<ToolResult> {
  const { name, args } = toolCall;

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

      case "get_personalized_tips": {
        const category = args.category as string;

        const tips = getPersonalizedTips(context.cycleData, category);

        return {
          toolName: name,
          result: tips,
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

/**
 * Calculate cycle information from cycle data
 */
function calculateCycleInfo(cycleData: CycleDataContext) {
  const today = new Date();
  const lastPeriod = new Date(cycleData.lastPeriodDate);

  // Calculate days since last period
  const daysSinceLast = Math.floor(
    (today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Calculate current cycle day
  const cyclesPassed = Math.floor(daysSinceLast / cycleData.cycleLength);
  const dayInCycle = (daysSinceLast % cycleData.cycleLength) + 1;

  // Calculate next period
  const nextPeriodDate = new Date(lastPeriod);
  nextPeriodDate.setDate(
    nextPeriodDate.getDate() + (cyclesPassed + 1) * cycleData.cycleLength,
  );

  const daysUntilNextPeriod = Math.floor(
    (nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Determine phase
  let phase: string;
  if (dayInCycle <= cycleData.periodLength) {
    phase = "menstrual";
  } else if (dayInCycle <= Math.floor(cycleData.cycleLength * 0.45)) {
    phase = "follicular";
  } else if (dayInCycle <= Math.floor(cycleData.cycleLength * 0.55)) {
    phase = "ovulation";
  } else {
    phase = "luteal";
  }

  return {
    currentPhase: phase,
    dayInCycle,
    daysUntilNextPeriod,
    nextPeriodDate: nextPeriodDate.toISOString(),
    isCurrentlyOnPeriod: dayInCycle <= cycleData.periodLength,
    cycleLength: cycleData.cycleLength,
    periodLength: cycleData.periodLength,
    phaseDescription: getPhaseDescription(phase),
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
 * Helper function to fetch with retry logic for network issues
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  timeoutMs: number = 60000,
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
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

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

      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(
        `Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError || new Error("Network request failed");
}

/**
 * Main agent execution function
 * Handles the full agent loop: parse → reason → act → respond
 */
export async function executeAgent(
  apiKey: string,
  message: string,
  context: AgentContext,
): Promise<{
  response: string;
  toolsUsed: string[];
  actions: string[];
}> {
  const toolsUsed: string[] = [];
  const actions: string[] = [];

  // Call Gemini with function calling enabled
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Build conversation with context
  const contents = [
    ...context.conversationHistory.slice(-6).map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  // Add user context to system prompt if available
  let enhancedSystemPrompt = AGENT_SYSTEM_PROMPT;
  if (context.cycleData) {
    const cycleInfo = calculateCycleInfo(context.cycleData);
    enhancedSystemPrompt += `\n\nUSER CONTEXT:
- Current cycle day: ${cycleInfo.dayInCycle}
- Current phase: ${cycleInfo.currentPhase}
- Days until next period: ${cycleInfo.daysUntilNextPeriod}
- Currently on period: ${cycleInfo.isCurrentlyOnPeriod}
Use this information to provide personalized responses.`;
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
      temperature: 0.8,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
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

  // Use retry logic with extended timeout (60 seconds per attempt, up to 3 retries)
  let response = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
    3,
    60000,
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

      const result = await executeTool(
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
      3,
      60000,
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
  const finalText =
    data.candidates?.[0]?.content?.parts
      ?.filter((part: { text?: string }) => part.text)
      ?.map((part: { text?: string }) => part.text)
      ?.join("\n") ||
    "I apologize, I couldn't process your request. Please try again.";

  return {
    response: cleanMarkdown(finalText),
    toolsUsed,
    actions,
  };
}

// Clean markdown formatting
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[\*\-]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
