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
  // Extended self-harm patterns to catch slang, typos, and informal language
  selfHarm:
    /(kill\s*(my|ma|me)\s*self|wanna\s*die|want\s*to\s*die|suicide|suicidal|end\s*(my|ma)\s*life|self.?harm|cutting\s*(my|ma)\s*self|hurt\s*(my|ma)\s*self|don'?t\s*want\s*to\s*live|no\s*reason\s*to\s*live|hang\s*(my|ma)\s*self|hung\s*(my|ma)\s*self|take\s*(my|ma)\s*(own\s*)?life|jump\s*off|overdose|poison\s*(my|ma)\s*self|kms|end\s*it\s*all|don'?t\s*wanna\s*live|cant\s*go\s*on|can'?t\s*take\s*it\s*anymore)/i,
  harassment:
    /(sexual.?harass|harassing me|stalking|stalker|sending me nudes|asking for nudes|creepy messages|inappropriate messages|touched without consent)/,
  danger:
    /(in danger|not safe|scared for my life|someone is going to hurt me|threatened me|threatening)/,
  generalAbuse:
    /(abusive|abuse|abusing|abused|being beaten|someone hits me|being hurt|mistreat|mistreating|hurts me|beating me)/,
  // Violence towards others - needs intervention
  violence:
    /(pour\s*acid|throw\s*acid|burn\s*(them|someone|her|him)|stab|shoot|murder|kill\s*(them|someone|her|him)|attack\s*(them|someone|her|him)|hurt\s*(them|someone|her|him))/i,
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

  violence: `I can hear that you're going through something really difficult right now. 💜 Those feelings of anger and wanting to hurt someone can be overwhelming.

But I care about you, and I want to help you find a safer way to deal with this. Hurting someone would have serious consequences for your life and future.

Please reach out to talk to someone right now:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7) - They can help you work through these feelings
📞 Butabika National Referral Mental Hospital: 0414 504 379

Can you tell me more about what's making you feel this way? Sometimes talking about what's hurting us can help us find better solutions. You're not alone in this. 💜`,
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

  // Self-harm/suicide detection - HIGHEST PRIORITY
  if (CRISIS_PATTERNS.selfHarm.test(m)) {
    return CRISIS_RESPONSES.selfHarm;
  }

  // Violence towards others - needs intervention
  if (CRISIS_PATTERNS.violence.test(m)) {
    return CRISIS_RESPONSES.violence;
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

    const errorMessage = String(error);

    // Handle rate limiting gracefully
    if (
      errorMessage.includes("RATE_LIMITED:") ||
      errorMessage.includes("429")
    ) {
      return NextResponse.json(
        {
          response:
            "I'm a bit busy right now with lots of conversations! 💜 Please wait about 20 seconds and send your message again. I promise I'll be right with you!",
          source: "rate_limited",
          type: "agent",
          retryAfter: 20,
        },
        {
          status: 429,
          headers: {
            "Retry-After": "20",
          },
        },
      );
    }

    // Handle timeout errors
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("AbortError") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      return NextResponse.json(
        {
          response:
            "I'm taking a bit longer than usual to respond. Please try sending your message again. 💜",
          source: "timeout",
          type: "agent",
        },
        { status: 504 },
      );
    }

    // Fallback response for other errors
    return NextResponse.json(
      {
        response:
          "I'm having a small technical issue right now. Please try again in a moment. If you need immediate help, call Sauti 116 (toll-free in Uganda) or visit your nearest health center. 💜",
        source: "error",
        type: "agent",
        error: errorMessage,
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
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    functionsAvailable: 12,
    apiKeyConfigured: !!apiKey,
    description: "SisterCare AI - Your supportive health companion",
  });
}
