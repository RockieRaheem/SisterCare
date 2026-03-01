import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/agent";

/**
 * SisterCare AI Agent API Route
 *
 * This is NOT a simple chatbot - it's an AI AGENT that:
 * - REASONS about user needs
 * - USES TOOLS to gather data and take actions
 * - SOLVES PROBLEMS by combining multiple capabilities
 * - ACTS AUTONOMOUSLY (logs symptoms, sets reminders, finds resources)
 *
 * The agent goes beyond text generation to actually help users
 * manage their menstrual health through intelligent actions.
 */

// Crisis detection system prompt patterns - these bypass the agent for immediate safety
const CRISIS_PATTERNS = {
  abuse: {
    pattern:
      /(abusive|abuse|abusing|abused|hit me|hits me|beats me|beating me|violent|violence|hurt me|hurting me|molest|molesting|assault|assaulting|rape|raped|raping|touched me|touching me inappropriately|inappropriate touch|mistreat|mistreating)/,
    familyPattern:
      /(parent|father|mother|dad|mom|uncle|aunt|brother|sister|family|relative|step|stepfather|stepmother|stepdad|stepmom|guardian|boyfriend|partner|husband|wife|grandpa|grandma|grandfather|grandmother|cousin|neighbor|teacher|coach|boss)/,
  },
  selfHarm:
    /(kill myself|want to die|suicide|suicidal|end my life|self.?harm|cutting myself|hurt myself|don't want to live|no reason to live)/,
  harassment:
    /(sexual.?harass|harassing me|stalking|stalker|sending me nudes|asking for nudes|creepy messages|inappropriate messages|touched without consent)/,
  danger:
    /(in danger|not safe|scared for my life|someone is going to hurt me|threatened me|threatening)/,
  generalAbuse:
    /(abusive|abuse|abusing|abused|being beaten|someone hits me|being hurt|mistreat|mistreating|hurts me|beating me)/,
};

// Crisis responses with Uganda-specific resources
const CRISIS_RESPONSES = {
  familyAbuse: `I'm so sorry you're going through this. What you're describing is serious, and I want you to know that it is NOT your fault. You deserve to be safe. 💜

Immediate help is available in Uganda:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7) - Uganda's National Child and Family Helpline
📞 Uganda Police Emergency: 999 or 112
📞 Child and Family Protection Unit (CFPU): Visit your nearest police station
🌐 Report online: sauti.mglsd.go.ug/sauti/report

What you can do: Tell a trusted adult like a teacher, LC1 chairperson, religious leader, or relative. Go to the nearest police station and ask for the Child and Family Protection Unit. Go to a safe place like a neighbor, church, or mosque if you can.

Please remember: You are brave for speaking up. This is not your fault. Help is available 24/7 in Uganda. You don't have to face this alone.

Would you like me to help you think through your options for getting help safely?`,

  selfHarm: `I'm really glad you reached out. What you're feeling matters, and I'm concerned about your safety. Please know you're not alone. 💜

Please reach out right now in Uganda:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7) - They provide mental health and psychosocial support
📞 Butabika National Referral Mental Hospital: 0414 504 379
📞 Uganda Police Emergency: 999 or 112
🏥 Go to the nearest hospital or health centre

You can also reach out to a trusted person like a teacher, religious leader, counselor, or family member.

Your life matters. These feelings can get better with support. There are people in Uganda who care and want to help you through this. Please don't give up. 💜`,

  harassment: `I'm sorry this is happening to you. What you're describing is not okay, and it's not your fault. 💜

Get help now in Uganda:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7)
📞 Uganda Police Emergency: 999 or 112
📞 FIDA Uganda (Women Lawyers): 0414 530 848 - Free legal support for women
🌐 Report online: sauti.mglsd.go.ug/sauti/report

Important steps you can take: Document or screenshot any messages for evidence. Tell a trusted adult or friend. Block the person if it's safe to do so. Report to the police Child and Family Protection Unit or your LC1.

You deserve to feel safe. Would you like to talk more about what's happening?`,

  danger: `Your safety is the top priority. I hear that you're scared, and I want to help. 💜

If you're in immediate danger in Uganda, call the police right away:

📞 Uganda Police Emergency: 999 or 112
📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7)
📞 Your nearest police station - Ask for the Child and Family Protection Unit

You can also go to a safe place like a trusted neighbor's home, church, mosque, or LC1 office.

Can you tell me more about the situation? Is there somewhere safe you can go right now?`,

  generalAbuse: `I'm really concerned about what you've shared. You don't deserve to be treated this way. 💜

Please know: This is NOT your fault. You deserve to be safe. Help is available in Uganda.

Resources:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7)
📞 Uganda Police Emergency: 999 or 112
📞 FIDA Uganda (Women Lawyers): 0414 530 848
🌐 Report online: sauti.mglsd.go.ug/sauti/report

Would you feel comfortable sharing more about what's happening? I want to make sure you get the right help.`,
};

/**
 * Check for crisis situations - these need immediate human-written responses
 * The agent is bypassed for safety-critical situations
 */
function checkForCrisis(message: string): string | null {
  const m = message.toLowerCase();

  // Family abuse detection
  if (
    CRISIS_PATTERNS.abuse.pattern.test(m) &&
    CRISIS_PATTERNS.abuse.familyPattern.test(m)
  ) {
    return CRISIS_RESPONSES.familyAbuse;
  }

  // Self-harm/suicide detection
  if (CRISIS_PATTERNS.selfHarm.test(m)) {
    return CRISIS_RESPONSES.selfHarm;
  }

  // Sexual harassment/assault
  if (CRISIS_PATTERNS.harassment.test(m)) {
    return CRISIS_RESPONSES.harassment;
  }

  // General danger
  if (CRISIS_PATTERNS.danger.test(m)) {
    return CRISIS_RESPONSES.danger;
  }

  // General abuse mention without specifying who
  if (CRISIS_PATTERNS.generalAbuse.test(m)) {
    return CRISIS_RESPONSES.generalAbuse;
  }

  return null;
}

/**
 * POST /api/chat
 *
 * Main agent endpoint. Receives user messages and returns intelligent,
 * action-oriented responses. The agent can:
 * - Query user's cycle data
 * - Log symptoms
 * - Analyze health patterns
 * - Set reminders
 * - Find healthcare resources
 * - Assess symptom severity
 * - Generate health reports
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      conversationHistory = [],
      userId,
      cycleData,
      userProfile,
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // FIRST: Check for crisis situations - these bypass the agent
    const crisisResponse = checkForCrisis(message);
    if (crisisResponse) {
      console.log("Crisis detected - using safety response");
      return NextResponse.json({
        response: crisisResponse,
        source: "safety",
        type: "agent",
        toolsUsed: [],
        actions: ["Crisis intervention triggered"],
      });
    }

    // Get API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      console.warn("GEMINI_API_KEY not configured - agent cannot function");
      return NextResponse.json(
        {
          response:
            "I'm temporarily unable to process requests. Please try again later or contact support.",
          source: "error",
          type: "agent",
          error: "API key not configured",
        },
        { status: 503 },
      );
    }

    // Execute the agent
    console.log(
      "Executing agent for message:",
      message.substring(0, 50) + "...",
    );

    const agentResult = await executeAgent(apiKey, message, {
      userId,
      userProfile,
      cycleData: cycleData
        ? {
            lastPeriodDate: new Date(cycleData.lastPeriodDate),
            cycleLength: cycleData.cycleLength,
            periodLength: cycleData.periodLength,
            nextPeriodDate: new Date(cycleData.nextPeriodDate),
            currentPhase: cycleData.currentPhase,
          }
        : undefined,
      conversationHistory,
    });

    console.log("Agent completed. Tools used:", agentResult.toolsUsed);

    return NextResponse.json({
      response: agentResult.response,
      source: "agent",
      type: "agent",
      toolsUsed: agentResult.toolsUsed,
      actions: agentResult.actions,
      reasoning:
        agentResult.toolsUsed.length > 0
          ? `Analyzed your request and used ${agentResult.toolsUsed.length} tool(s) to help you.`
          : "Responded based on health knowledge.",
    });
  } catch (error) {
    console.error("Agent error:", error);

    // Fallback response
    return NextResponse.json(
      {
        response:
          "I apologize, but I encountered an issue processing your request. Please try again. If you're experiencing a medical emergency, please call Uganda Police at 999 or visit your nearest hospital.",
        source: "error",
        type: "agent",
        error: String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/chat
 *
 * Health check endpoint for the agent
 */
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  return NextResponse.json({
    status: "online",
    type: "ai_agent",
    capabilities: [
      "cycle_tracking",
      "symptom_logging",
      "symptom_analysis",
      "fertility_calculation",
      "reminder_setting",
      "health_search",
      "resource_finding",
      "risk_assessment",
      "health_reports",
      "personalized_tips",
    ],
    model: "gemini-2.5-flash",
    functionsAvailable: 12,
    apiKeyConfigured: !!apiKey,
    description:
      "SisterCare AI Agent - Beyond chatbots, solving real health problems",
  });
}
