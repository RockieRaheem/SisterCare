/**
 * SisterCare AI Agent Tools
 *
 * This module defines the tools that the AI agent can use to reason,
 * take actions, and solve complex problems for users.
 */

// Tool definitions for Gemini function calling
export const AGENT_TOOLS = [
  {
    name: "get_cycle_info",
    description:
      "Get the user's current menstrual cycle information including current phase, day in cycle, days until next period, and whether they're currently menstruating. Use this when the user asks about their cycle, period predictions, or fertility window.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user's unique identifier",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "log_symptoms",
    description:
      "Log symptoms for the user. Use this when the user reports experiencing symptoms like cramps, headache, mood changes, flow intensity, etc. This creates a record in their health history.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user's unique identifier",
        },
        symptoms: {
          type: "array",
          items: { type: "string" },
          description:
            "List of symptoms (e.g., 'cramps', 'headache', 'bloating', 'fatigue', 'back pain', 'breast tenderness', 'nausea')",
        },
        mood: {
          type: "string",
          enum: ["great", "good", "okay", "low", "bad"],
          description: "The user's current mood",
        },
        flowIntensity: {
          type: "string",
          enum: ["none", "spotting", "light", "medium", "heavy"],
          description: "Flow intensity if currently on period",
        },
        notes: {
          type: "string",
          description: "Additional notes from the user",
        },
      },
      required: ["userId", "symptoms"],
    },
  },
  {
    name: "analyze_symptoms",
    description:
      "Analyze user's symptoms to determine if they are normal for their cycle phase or if they might indicate a health concern requiring medical attention. Use this when a user describes multiple symptoms or expresses concern.",
    parameters: {
      type: "object",
      properties: {
        symptoms: {
          type: "array",
          items: { type: "string" },
          description: "List of symptoms to analyze",
        },
        cyclePhase: {
          type: "string",
          enum: ["menstrual", "follicular", "ovulation", "luteal", "unknown"],
          description: "Current phase of menstrual cycle",
        },
        severity: {
          type: "string",
          enum: ["mild", "moderate", "severe"],
          description: "Overall severity of symptoms",
        },
        duration: {
          type: "string",
          description:
            "How long symptoms have persisted (e.g., '2 days', '1 week')",
        },
      },
      required: ["symptoms"],
    },
  },
  {
    name: "calculate_fertility_window",
    description:
      "Calculate the user's fertility window (ovulation period) based on their cycle data. Use this when the user asks about fertile days, ovulation, or trying to conceive/avoid pregnancy.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user's unique identifier",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "set_reminder",
    description:
      "Set a health reminder for the user. Use this to schedule period reminders, medication reminders, symptom logging reminders, or appointment reminders.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user's unique identifier",
        },
        type: {
          type: "string",
          enum: [
            "period_coming",
            "period_start",
            "log_symptoms",
            "medication",
            "appointment",
            "check_in",
          ],
          description: "Type of reminder",
        },
        title: {
          type: "string",
          description: "Title of the reminder",
        },
        message: {
          type: "string",
          description: "Message content of the reminder",
        },
        scheduledFor: {
          type: "string",
          description:
            "When to send the reminder (ISO date string or relative like 'tomorrow', 'in 3 days')",
        },
      },
      required: ["userId", "type", "title", "message", "scheduledFor"],
    },
  },
  {
    name: "search_health_info",
    description:
      "Search the health knowledge base for accurate information on menstrual health, reproductive health, symptoms, conditions, and treatments. Use this when the user asks factual health questions.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The health topic or question to search for",
        },
        category: {
          type: "string",
          enum: [
            "menstrual_health",
            "reproductive_health",
            "symptoms",
            "conditions",
            "treatments",
            "nutrition",
            "mental_health",
            "hygiene",
          ],
          description: "Category to search within",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "find_healthcare_resources",
    description:
      "Find healthcare resources in Uganda including hospitals, clinics, pharmacies, helplines, and support organizations. Use this when the user needs to find medical help or resources near them.",
    parameters: {
      type: "object",
      properties: {
        resourceType: {
          type: "string",
          enum: [
            "hospital",
            "clinic",
            "pharmacy",
            "helpline",
            "support_organization",
            "emergency",
          ],
          description: "Type of resource to find",
        },
        location: {
          type: "string",
          description: "Location in Uganda (city, district, or region)",
        },
        specialty: {
          type: "string",
          description:
            "Medical specialty needed (e.g., 'gynecology', 'mental health', 'family planning')",
        },
      },
      required: ["resourceType"],
    },
  },
  {
    name: "get_symptom_history",
    description:
      "Retrieve the user's symptom history to identify patterns, recurring issues, or changes over time. Use this for pattern analysis or when discussing symptom trends.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user's unique identifier",
        },
        days: {
          type: "number",
          description: "Number of days of history to retrieve (default 30)",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "assess_risk_level",
    description:
      "Assess the risk level of reported symptoms to determine if immediate medical attention is needed. Use this when symptoms seem concerning or the user expresses worry.",
    parameters: {
      type: "object",
      properties: {
        symptoms: {
          type: "array",
          items: { type: "string" },
          description: "Current symptoms",
        },
        additionalFactors: {
          type: "object",
          properties: {
            age: { type: "number" },
            pregnant: { type: "boolean" },
            chronicConditions: { type: "array", items: { type: "string" } },
            medications: { type: "array", items: { type: "string" } },
            symptomDuration: { type: "string" },
            severity: { type: "string" },
          },
          description: "Additional health factors to consider",
        },
      },
      required: ["symptoms"],
    },
  },
  {
    name: "generate_health_report",
    description:
      "Generate a summary health report for the user based on their cycle data, symptom logs, and health history. Use this when the user wants an overview of their health patterns.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user's unique identifier",
        },
        reportType: {
          type: "string",
          enum: ["weekly", "monthly", "cycle_summary"],
          description: "Type of report to generate",
        },
      },
      required: ["userId", "reportType"],
    },
  },
  {
    name: "update_period_start",
    description:
      "Record that the user's period has started today or on a specific date. Use this when the user says their period started.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user's unique identifier",
        },
        startDate: {
          type: "string",
          description: "Date period started (ISO string, defaults to today)",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "update_pregnancy_status",
    description:
      "Record that the user is pregnant, or update their pregnancy information including estimated due date, trimester, and weeks pregnant. Also use this to set a pregnancy reminder. When the user says they're pregnant, ask for the estimated due date or last period date to calculate the due date.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user's unique identifier",
        },
        isPregnant: {
          type: "boolean",
          description: "Whether the user is currently pregnant",
        },
        estimatedDueDate: {
          type: "string",
          description: "Estimated due date (ISO string, e.g. '2026-12-25')",
        },
        trimester: {
          type: "string",
          enum: ["first", "second", "third"],
          description: "Current trimester of pregnancy",
        },
        weeksPregnant: {
          type: "number",
          description: "How many weeks pregnant the user is",
        },
        lastMenstrualPeriodDate: {
          type: "string",
          description: "First day of last menstrual period before pregnancy (ISO string). Used to calculate due date.",
        },
        notes: {
          type: "string",
          description: "Additional notes about the pregnancy",
        },
      },
      required: ["userId", "isPregnant"],
    },
  },
  {
    name: "record_birth",
    description:
      "Record that the user has given birth. This clears pregnancy tracking data and resumes normal menstrual cycle tracking using the birth date as the starting point for the new cycle. Use this when the user says they've given birth or their baby has arrived.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user's unique identifier",
        },
        birthDate: {
          type: "string",
          description: "Date the baby was born (ISO string, defaults to today)",
        },
        babyHealth: {
          type: "string",
          description: "How the baby is doing (optional, e.g. 'healthy', 'needs care')",
        },
        motherHealth: {
          type: "string",
          description: "How the mother is feeling after birth (optional)",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "get_personalized_tips",
    description:
      "Get personalized health tips based on the user's current cycle phase, recent symptoms, and health goals. Use this to provide tailored advice.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user's unique identifier",
        },
        category: {
          type: "string",
          enum: [
            "nutrition",
            "exercise",
            "sleep",
            "mood",
            "pain_relief",
            "general_wellness",
          ],
          description: "Category of tips to get",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "get_system_overview",
    description:
      "Read the canonical SisterCare profile, preferences, cycle/pregnancy state, active session count, and recent symptom count for the signed-in user. Use when the user asks what the system knows or before coordinating multiple updates.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "update_user_profile",
    description:
      "Update safe user-controlled SisterCare profile fields and preferences from a direct user request. Never infer or change a setting without the user's clear instruction.",
    parameters: {
      type: "object",
      properties: {
        displayName: { type: "string", description: "Preferred display name" },
        language: {
          type: "string",
          enum: ["eng", "lug", "ach", "lgg", "nyn", "teo", "swa"],
          description: "Canonical Sister voice and reply language code",
        },
        reminderDaysBefore: { type: "integer", minimum: 0, maximum: 14 },
        emailNotifications: { type: "boolean" },
        pushNotifications: { type: "boolean" },
        theme: { type: "string", enum: ["light", "dark", "system"] },
      },
      required: [],
    },
  },
  {
    name: "request_counsellor_session",
    description:
      "Request an in-app session with a verified counsellor when the user explicitly asks for human support. Safety-critical sessions are created by the deterministic safety layer, not this tool.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description:
            "Privacy-minimized reason for support, maximum 500 characters",
        },
        specialty: {
          type: "string",
          enum: [
            "Mental Health",
            "Menstrual Health",
            "Reproductive Health",
            "Nutrition & Wellness",
            "Pregnancy & Postpartum",
            "Sexual Health",
            "Adolescent Health",
            "Relationship Counselling",
          ],
        },
        preferredLanguage: { type: "string" },
      },
      required: ["summary"],
    },
  },
];

// Convert to Gemini function declarations format
export function getGeminiFunctionDeclarations() {
  return AGENT_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}
