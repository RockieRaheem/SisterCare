/**
 * SisterCare safety layer — crisis detection and triage.
 *
 * This module is deliberately deterministic (regex, not LLM): a user in
 * crisis must ALWAYS receive the human-written response with real Ugandan
 * emergency resources, never an improvised model answer. It lives outside
 * the API route so it can be unit-tested — changes here are safety-critical
 * and require extra review.
 *
 * The English patterns run on the message AFTER translation; the native
 * patterns run on the ORIGINAL text as defense-in-depth for when translation
 * is unavailable.
 */

import { TriageSeverity } from "@/types";
import { BUTABIKA_CONTACT_TEXT } from "@/lib/emergencyResources";

// Crisis detection patterns - these bypass the agent for immediate safety
export const CRISIS_PATTERNS = {
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
    /(sexual.?harass|harassing me|stalking|stalker|sending me nudes|ask(?:s|ed|ing)? me for nudes|asking for nudes|creepy messages|inappropriate messages|touched without consent)/,
  danger:
    /(in danger|not safe|scared for my life|someone is going to hurt me|threatened me|threatening)/,
  generalAbuse:
    /(abusive|abuse|abusing|abused|being beaten|someone hits me|being hurt|mistreat|mistreating|hurts me|beating me)/,
  // Violence towards others - needs intervention
  violence:
    /(pour\s*acid|throw\s*acid|burn\s*(them|someone|her|him)|stab|shoot|murder|kill\s*(them|someone|her|him)|attack\s*(them|someone|her|him)|hurt\s*(them|someone|her|him))/i,
};

// Native-language self-harm phrases (Luganda, Swahili) checked on the ORIGINAL
// message. The English patterns above only work after translation succeeds;
// this catches a crisis even when translation is down. Every term here must be
// unambiguous — a false positive shows a supportive message, but a term that
// matches everyday speech would erode trust.
export const NATIVE_SELF_HARM_PATTERN =
  /(okwetta|kwetta|njagala\s+kufa|kujiua|najiua|nataka\s+kufa|kujidhuru)/i;

export type CrisisType = keyof typeof CRISIS_RESPONSES;

export interface ConversationSafetyAssessment {
  crisisType: CrisisType | null;
  response: string | null;
  severity: TriageSeverity;
  reason: string;
  matchedOn: "latest_message" | "conversation_context" | null;
}

const THIRD_PERSON_SELF_HARM_CONTEXT =
  /(movie|book|story|character|article|news|research|homework|assignment|essay|project|friend|someone else|another person).{0,60}(suicid|self.?harm)|(?:suicid|self.?harm).{0,60}(friend|someone else|another person|character)/i;

const CONTEXTUAL_SELF_HARM_SIGNALS = [
  /nothing matters/i,
  /gave (away )?(all )?my (things|belongings|possessions)/i,
  /won'?t be here tomorrow/i,
  /saying goodbye/i,
  /everyone (will be|would be) better without me/i,
  /no future for me/i,
];

// Crisis responses with Uganda-specific resources
export const CRISIS_RESPONSES = {
  familyAbuse: `I'm so sorry you're going through this. What you're describing is serious, and I want you to know that it is NOT your fault. You deserve to be safe. 💗

Immediate help is available in Uganda:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7) - Uganda's National Child and Family Helpline
📞 Uganda Police Emergency: 999 or 112
📞 Child and Family Protection Unit (CFPU): Visit your nearest police station
🌐 Report online: sauti.mglsd.go.ug/sauti/report

What you can do: Tell a trusted adult like a teacher, LC1 chairperson, religious leader, or relative. Go to the nearest police station and ask for the Child and Family Protection Unit. Go to a safe place like a neighbor, church, or mosque if you can.

Please remember: You are brave for speaking up. This is not your fault. Help is available 24/7 in Uganda. You don't have to face this alone.

Would you like me to help you think through your options for getting help safely?`,

  selfHarm: `I'm really glad you reached out. What you're feeling matters, and I'm concerned about your safety. Please know you're not alone. 💗

Please reach out right now in Uganda:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7) - They provide mental health and psychosocial support
📞 Butabika National Referral Mental Hospital: ${BUTABIKA_CONTACT_TEXT}
📞 Uganda Police Emergency: 999 or 112
🏥 Go to the nearest hospital or health centre

You can also reach out to a trusted person like a teacher, religious leader, counselor, or family member.

Your life matters. These feelings can get better with support. There are people in Uganda who care and want to help you through this. Please don't give up. 💗`,

  harassment: `I'm sorry this is happening to you. What you're describing is not okay, and it's not your fault. 💗

Get help now in Uganda:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7)
📞 Uganda Police Emergency: 999 or 112
📞 FIDA Uganda (Women Lawyers): 0414 530 848 - Free legal support for women
🌐 Report online: sauti.mglsd.go.ug/sauti/report

Important steps you can take: Document or screenshot any messages for evidence. Tell a trusted adult or friend. Block the person if it's safe to do so. Report to the police Child and Family Protection Unit or your LC1.

You deserve to feel safe. Would you like to talk more about what's happening?`,

  danger: `Your safety is the top priority. I hear that you're scared, and I want to help. 💗

If you're in immediate danger in Uganda, call the police right away:

📞 Uganda Police Emergency: 999 or 112
📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7)
📞 Your nearest police station - Ask for the Child and Family Protection Unit

You can also go to a safe place like a trusted neighbor's home, church, mosque, or LC1 office.

Can you tell me more about the situation? Is there somewhere safe you can go right now?`,

  generalAbuse: `I'm really concerned about what you've shared. You don't deserve to be treated this way. 💗

Please know: This is NOT your fault. You deserve to be safe. Help is available in Uganda.

Resources:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7)
📞 Uganda Police Emergency: 999 or 112
📞 FIDA Uganda (Women Lawyers): 0414 530 848
🌐 Report online: sauti.mglsd.go.ug/sauti/report

Would you feel comfortable sharing more about what's happening? I want to make sure you get the right help.`,

  violence: `I can hear that you're going through something really difficult right now. 💗 Those feelings of anger and wanting to hurt someone can be overwhelming.

But I care about you, and I want to help you find a safer way to deal with this. Hurting someone would have serious consequences for your life and future.

Please reach out to talk to someone right now:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7) - They can help you work through these feelings
📞 Butabika National Referral Mental Hospital: ${BUTABIKA_CONTACT_TEXT}

Can you tell me more about what's making you feel this way? Sometimes talking about what's hurting us can help us find better solutions. You're not alone in this. 💗`,
};

export function detectCrisisType(message: string): CrisisType | null {
  const m = message.toLowerCase();

  if (
    CRISIS_PATTERNS.abuse.pattern.test(m) &&
    CRISIS_PATTERNS.abuse.familyPattern.test(m)
  ) {
    return "familyAbuse";
  }

  const selfHarmMatch =
    CRISIS_PATTERNS.selfHarm.test(m) || NATIVE_SELF_HARM_PATTERN.test(m);
  if (selfHarmMatch && !THIRD_PERSON_SELF_HARM_CONTEXT.test(m)) {
    return "selfHarm";
  }
  if (CRISIS_PATTERNS.violence.test(m)) return "violence";
  if (CRISIS_PATTERNS.harassment.test(m)) return "harassment";
  if (CRISIS_PATTERNS.danger.test(m)) return "danger";
  if (CRISIS_PATTERNS.generalAbuse.test(m)) return "generalAbuse";

  return null;
}

/**
 * Check for crisis situations - these need immediate human-written responses.
 * The agent is bypassed for safety-critical situations.
 * Returns the crisis response text, or null if no crisis was detected.
 */
export function checkForCrisis(message: string): string | null {
  const crisisType = detectCrisisType(message);
  return crisisType ? CRISIS_RESPONSES[crisisType] : null;
}

/**
 * Conversation-aware safety evaluation. Direct crisis language in the latest
 * message wins. Otherwise multiple cumulative warning signals across recent
 * messages trigger the authored self-harm response.
 */
export function assessConversationSafety(
  messages: string[],
): ConversationSafetyAssessment {
  const recent = messages
    .filter((message): message is string => typeof message === "string")
    .map((message) => message.trim())
    .filter(Boolean)
    .slice(-8);
  const latest = recent.at(-1) ?? "";
  const directType = detectCrisisType(latest);

  if (directType) {
    return {
      crisisType: directType,
      response: CRISIS_RESPONSES[directType],
      severity: directType === "harassment" || directType === "generalAbuse"
        ? "high"
        : "critical",
      reason: `crisis_${directType}`,
      matchedOn: "latest_message",
    };
  }

  const conversation = recent.join(" ");
  const contextualSignalCount = CONTEXTUAL_SELF_HARM_SIGNALS.reduce(
    (count, pattern) => count + (pattern.test(conversation) ? 1 : 0),
    0,
  );

  if (contextualSignalCount >= 2) {
    return {
      crisisType: "selfHarm",
      response: CRISIS_RESPONSES.selfHarm,
      severity: "critical",
      reason: "cumulative_self_harm_signals",
      matchedOn: "conversation_context",
    };
  }

  const triage = assessTriageSeverity(latest);
  return {
    crisisType: null,
    response: null,
    severity: triage.severity,
    reason: triage.reason,
    matchedOn: null,
  };
}

/**
 * Assess how urgently a message needs human attention.
 * Drives counsellor auto-connect (critical) and handoff offers (high).
 */
export function assessTriageSeverity(message: string): {
  severity: TriageSeverity;
  reason: string;
} {
  const m = message.toLowerCase();

  if (
    detectCrisisType(m) === "selfHarm" ||
    CRISIS_PATTERNS.violence.test(m) ||
    CRISIS_PATTERNS.danger.test(m)
  ) {
    return { severity: "critical", reason: "safety_risk" };
  }

  if (
    CRISIS_PATTERNS.harassment.test(m) ||
    CRISIS_PATTERNS.generalAbuse.test(m) ||
    /panic|severe pain|can't cope|cant cope|overwhelmed|trauma|abuse/i.test(m)
  ) {
    return { severity: "high", reason: "distress_signals" };
  }

  if (/anxious|sad|stressed|worried|low mood|depressed|cramps/i.test(m)) {
    return { severity: "medium", reason: "wellbeing_concern" };
  }

  return { severity: "low", reason: "routine_support" };
}
