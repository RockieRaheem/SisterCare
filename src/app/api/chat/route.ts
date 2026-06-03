import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/agent";
import {
  connectUserToCounsellor,
  getCycleInfo,
  logAgentEvent,
  routeCounsellor,
  saveCycleData,
  calculateNextPeriod,
  setActiveCounsellorOnConversation,
  getActiveCounsellorForConversation,
  getCounsellors,
} from "@/lib/firestore";
import {
  translateText,
  detectLanguage,
  textToSpeech,
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
} from "@/lib/sunbird";
import {
  getCachedAudio,
  cacheAudio,
  createAudioUrl,
  getCacheStats,
} from "@/lib/ttsCache";
import {
  AgentActionStatus,
  CounsellorSpecialty,
  TriageSeverity,
} from "@/types";

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

const COUNSELLOR_REQUEST_PATTERN =
  /(counsellor|counselor|therapist|professional help|human support|talk to someone|connect me|i need help|i want a human|real help|i need real|speak to someone|real person|human help|mental health support|see a doctor|see a specialist)/i;
const CALL_REQUEST_PATTERN =
  /(call (them|her|him|counsellor|counselor)|phone (them|her|him|counsellor|counselor)|phone call|via (a )?phone call|dial|make (the )?call|make a call|call now|automatically call|auto.?call|cant you call|can't you call|call her for me|call him for me)/i;
const WHATSAPP_REQUEST_PATTERN =
  /(whatsapp|what'?s app|message (them|her|him|counsellor|counselor)|text (them|her|him|counsellor|counselor)|chat on whatsapp|connect.*whatsapp|if you cant|if you can't)/i;
// Detect pronoun references to active counsellor ("her", "him", "them")
const PRONOUN_REFERENCE_PATTERN =
  /(call her|call him|whatsapp her|whatsapp him|message (her|him|them)|text (her|him|them)|her number|his number|their number|contact (her|him|them)|reach (her|him|them))/i;
const PERIOD_START_PATTERN =
  /(period (started|came|has started)|i got my period|my period is here|started my period|got my periods)/i;

function toPhoneHref(phoneNumber: string): string {
  return `tel:${phoneNumber.replace(/[^+\d]/g, "")}`;
}

function toWhatsAppHref(phoneNumber: string): string {
  const digits = phoneNumber.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

function assessTriageSeverity(message: string): {
  severity: TriageSeverity;
  reason: string;
} {
  const m = message.toLowerCase();

  if (
    CRISIS_PATTERNS.selfHarm.test(m) ||
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

function inferCounsellorSpecialty(message: string): CounsellorSpecialty {
  const m = message.toLowerCase();

  if (/pregnan|postpartum|baby/i.test(m)) return "Pregnancy & Postpartum";
  if (/diet|food|nutrition|weight/i.test(m)) return "Nutrition & Wellness";
  if (/relationship|partner|marriage/i.test(m))
    return "Relationship Counselling";
  if (/sexual|sex|std|sti/i.test(m)) return "Sexual Health";
  if (/teen|adolescent|school girl|young girl/i.test(m))
    return "Adolescent Health";
  if (/period|menstrual|cycle|cramps|pms/i.test(m)) return "Menstrual Health";

  return "Mental Health";
}

function normalizeLanguageName(language?: string): string | undefined {
  if (!language) return undefined;
  const lower = language.trim().toLowerCase();
  if (!lower) return undefined;

  if (lower === "en") return "English";
  if (lower === "lg") return "Luganda";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function toSupportedLanguageCode(language?: string): SupportedLanguageCode {
  if (!language) return "eng";

  const lower = language.trim().toLowerCase();
  if (!lower) return "eng";
  if (lower in SUPPORTED_LANGUAGES) {
    return lower as SupportedLanguageCode;
  }
  if (lower === "english" || lower === "en") return "eng";
  if (lower === "luganda" || lower === "lg") return "lug";
  if (lower === "runyankole" || lower === "nyankole" || lower === "nyn")
    return "nyn";
  if (lower === "ateso" || lower === "teo") return "teo";
  if (lower === "acholi" || lower === "ach") return "ach";
  if (lower === "lugbara" || lower === "lgg") return "lgg";
  if (lower === "swahili" || lower === "sw") return "sw";
  return "eng";
}

function inferRequestedLanguage(message: string): string | undefined {
  const m = message.toLowerCase();
  const languageMap: Array<[RegExp, string]> = [
    [/ateso/, "Ateso"],
    [/runyankole|nyankole|ankole/, "Runyankole"],
    [/luganda|ganda/, "Luganda"],
    [/english/, "English"],
    [/swahili/, "Swahili"],
    [/lusoga/, "Lusoga"],
    [/luo/, "Luo"],
  ];

  for (const [pattern, language] of languageMap) {
    if (pattern.test(m)) {
      return language;
    }
  }

  return undefined;
}

function parsePeriodStartDate(message: string): Date | null {
  const m = message.toLowerCase();
  const now = new Date();

  if (/today/.test(m)) return now;
  if (/yesterday/.test(m)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }

  const dateMatch = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (dateMatch) {
    const parsed = new Date(dateMatch[1]);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const generic = new Date(message);
  if (!isNaN(generic.getTime()) && generic.getFullYear() > 2000) return generic;

  return null;
}

function shouldPromptCycleConfirmation(cycleData?: {
  lastPeriodDate: string | Date;
  cycleLength: number;
  periodLength: number;
}): boolean {
  if (!cycleData) return false;

  const info = getCycleInfo(
    new Date(cycleData.lastPeriodDate),
    cycleData.cycleLength,
    cycleData.periodLength,
  );

  return info.daysUntilNextPeriod <= 1 || info.isPeriodLate;
}

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
      conversationId,
      userLanguage: clientLanguage,
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 2000) {
      return NextResponse.json(
        { error: "Message is too long" },
        { status: 400 },
      );
    }

    const actionStatuses: AgentActionStatus[] = [];
    const triage = assessTriageSeverity(trimmedMessage);

    const storedLanguage = toSupportedLanguageCode(
      userProfile?.preferences?.language,
    );
    let userLanguage: SupportedLanguageCode =
      toSupportedLanguageCode(clientLanguage) || storedLanguage || "eng";
    let translationApplied = userLanguage !== "eng";
    let messageForAgent = trimmedMessage;

    if (!clientLanguage && !storedLanguage) {
      try {
        const detected = await detectLanguage(trimmedMessage);
        userLanguage = detected.language;
        translationApplied = userLanguage !== "eng";
      } catch (languageError) {
        console.warn(
          "Language detection failed, defaulting to English:",
          languageError,
        );
      }
    }

    if (userLanguage !== "eng") {
      try {
        const translated = await translateText(
          trimmedMessage,
          userLanguage,
          "eng",
        );
        messageForAgent = translated.translatedText;
      } catch (translationError) {
        console.warn(
          "Translation to English failed, continuing with original message:",
          translationError,
        );
      }
    }

    if (userId) {
      try {
        await logAgentEvent({
          userId,
          type: "triage",
          severity: triage.severity,
          success: true,
        });
      } catch (eventError) {
        console.warn("Failed to log triage event:", eventError);
      }
    }

    actionStatuses.push({
      key: "triage",
      label: `Triage completed (${triage.severity})`,
      state: "done",
    });

    if (translationApplied) {
      actionStatuses.push({
        key: "language",
        label: `Detected language: ${SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage}`,
        state: "done",
      });
    }

    if (userId && cycleData && PERIOD_START_PATTERN.test(trimmedMessage)) {
      const parsedStartDate =
        parsePeriodStartDate(trimmedMessage) || new Date();
      const nextPeriod = calculateNextPeriod(
        parsedStartDate,
        cycleData.cycleLength,
      );

      try {
        await saveCycleData(userId, {
          lastPeriodDate: parsedStartDate,
          nextPeriodDate: nextPeriod,
          currentPhase: "menstrual",
        });

        await logAgentEvent({
          userId,
          type: "cycle_updated",
          severity: triage.severity,
          success: true,
        });

        actionStatuses.push({
          key: "cycle-update",
          label: `Cycle updated from confirmed period date (${parsedStartDate.toLocaleDateString()})`,
          state: "done",
        });
      } catch (cycleError) {
        console.warn("Failed to auto-update cycle:", cycleError);
        actionStatuses.push({
          key: "cycle-update",
          label: "Cycle auto-update failed",
          state: "failed",
        });
      }
    }

    const requestedCounsellor = COUNSELLOR_REQUEST_PATTERN.test(trimmedMessage);
    const requestedCall = CALL_REQUEST_PATTERN.test(trimmedMessage);
    const requestedWhatsApp = WHATSAPP_REQUEST_PATTERN.test(trimmedMessage);
    const shouldOfferHandoff = triage.severity === "high";
    const shouldAutoConnect =
      requestedCounsellor ||
      requestedCall ||
      requestedWhatsApp ||
      triage.severity === "critical";

    const localizeResponse = async (text: string) => {
      let localizedText = text;
      if (userLanguage !== "eng") {
        try {
          const translated = await translateText(text, "eng", userLanguage);
          localizedText = translated.translatedText;
        } catch (translationError) {
          console.warn(
            "Failed to translate response, using English:",
            translationError,
          );
        }
      }

      let audio:
        | { url: string; durationSeconds: number; mimeType: string }
        | undefined;
      try {
        const tts = await textToSpeech(localizedText, userLanguage, 0.7);
        audio = {
          url: tts.audioUrl,
          durationSeconds: tts.durationSeconds,
          mimeType: "audio/mpeg",
        };
      } catch (ttsError) {
        console.warn(
          "TTS generation failed, continuing without audio:",
          ttsError,
        );
      }

      return { localizedText, audio };
    };

    const crisisResponse = checkForCrisis(trimmedMessage);
    if (crisisResponse) {
      const { localizedText, audio } = await localizeResponse(crisisResponse);
      return NextResponse.json({
        response: localizedText,
        language: userLanguage,
        languageName: SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
        audio,
        translationApplied,
        source: "safety",
        type: "agent",
        toolsUsed: [],
        actions: ["Crisis intervention triggered"],
        triage,
        actionStatuses: [
          ...actionStatuses,
          { key: "safety", label: "Safety protocol activated", state: "done" },
        ],
      });
    }

    let handoffText = "";

    if (shouldAutoConnect && userId) {
      actionStatuses.push({
        key: "handoff",
        label: "Finding best available counsellor",
        state: "pending",
      });

      try {
        let counsellor;
        const isPronounReference =
          PRONOUN_REFERENCE_PATTERN.test(trimmedMessage);

        if (isPronounReference && conversationId) {
          try {
            const activeCounsellorData =
              await getActiveCounsellorForConversation(conversationId);
            if (activeCounsellorData) {
              const allCounsellors = await getCounsellors();
              counsellor = allCounsellors.find(
                (c) => c.id === activeCounsellorData.id,
              );

              if (!counsellor) {
                counsellor = {
                  id: activeCounsellorData.id,
                  name: activeCounsellorData.name,
                  title: activeCounsellorData.title,
                  bio: `${activeCounsellorData.title} specializing in ${activeCounsellorData.specializations.join(", ")}`,
                  specializations: activeCounsellorData.specializations as any,
                  photoURL: "",
                  status: "available" as const,
                  rating: 5,
                  reviewCount: 0,
                  yearsExperience: 1,
                  languages: activeCounsellorData.languages,
                  phoneNumber: activeCounsellorData.phoneNumber,
                  whatsappNumber: activeCounsellorData.whatsappNumber,
                  availableHours: { start: "08:00", end: "22:00", days: [] },
                  sessionCount: 0,
                  verified: true,
                  createdAt: new Date(),
                };
              }
            }
          } catch (fetchErr) {
            console.warn(
              "Failed to fetch active counsellor, will route new one:",
              fetchErr,
            );
          }
        }

        if (!counsellor) {
          const specialty = inferCounsellorSpecialty(messageForAgent);
          const requestedLanguage = inferRequestedLanguage(trimmedMessage);
          const preferredLanguage =
            requestedLanguage ||
            normalizeLanguageName(userProfile?.preferences?.language) ||
            SUPPORTED_LANGUAGES[userLanguage]?.name ||
            "English";
          counsellor = await routeCounsellor({ specialty, preferredLanguage });
        }

        if (counsellor) {
          let handoffConversationId: string | undefined;
          try {
            handoffConversationId = await connectUserToCounsellor({
              userId,
              counsellorId: counsellor.id,
              reason: requestedCounsellor ? "user_request" : "risk_detected",
              summary: trimmedMessage,
            });
          } catch (connectError) {
            console.warn(
              "Could not create counsellor thread in Firestore, continuing with direct handoff:",
              connectError,
            );
          }

          if (handoffConversationId) {
            try {
              await setActiveCounsellorOnConversation({
                conversationId: handoffConversationId,
                counsellor,
              });
            } catch (metadataErr) {
              console.warn(
                "Failed to store active counsellor metadata:",
                metadataErr,
              );
            }
          }

          await logAgentEvent({
            userId,
            type: requestedCounsellor ? "handoff_connected" : "handoff_offered",
            severity: triage.severity,
            conversationId: handoffConversationId,
            success: true,
          }).catch((eventError) =>
            console.warn("Failed to log handoff event:", eventError),
          );

          actionStatuses[actionStatuses.length - 1] = {
            key: "handoff",
            label: `Connected to ${counsellor.name} (${counsellor.title})`,
            state: "done",
          };

          if (requestedCounsellor || requestedCall || requestedWhatsApp) {
            const { localizedText, audio } = await localizeResponse(
              `I've matched you with **${counsellor.name}** — ${counsellor.title}. 💜\n\nI'm opening their profile so you can review their languages, specialties, and availability first. From there, you can choose whether to call or WhatsApp them.`,
            );

            return NextResponse.json({
              response: localizedText,
              language: userLanguage,
              languageName:
                SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
              audio,
              translationApplied,
              source: "agent",
              type: "agent",
              toolsUsed: ["counsellor_routing"],
              actions: [`Matched to ${counsellor.name}`],
              triage,
              actionStatuses,
              handoffThreadCreated: Boolean(handoffConversationId),
              counsellorProfile: {
                id: counsellor.id,
                name: counsellor.name,
                title: counsellor.title,
                languages: counsellor.languages,
                specializations: counsellor.specializations,
                status: counsellor.status,
                rating: counsellor.rating,
                reviewCount: counsellor.reviewCount,
                photoURL: counsellor.photoURL,
                phoneNumber: counsellor.phoneNumber,
                whatsappNumber: counsellor.whatsappNumber,
                profileUrl: `/counsellors/${counsellor.id}`,
                callUrl: `tel:${counsellor.phoneNumber.replace(/[^+\d]/g, "")}`,
                whatsappUrl: `https://wa.me/${counsellor.whatsappNumber.replace(/[^\d]/g, "")}`,
              },
              counsellorHandoff: {
                name: counsellor.name,
                title: counsellor.title,
                phone: counsellor.phoneNumber,
                whatsapp: counsellor.whatsappNumber,
                photoURL: counsellor.photoURL,
                status: counsellor.status,
              },
            });
          }

          handoffText = `\n\nI have connected you to ${counsellor.name} (${counsellor.title}) for dedicated support.`;
        } else {
          actionStatuses[actionStatuses.length - 1] = {
            key: "handoff",
            label:
              "No counsellor currently available; queued for next available professional",
            state: "failed",
          };

          if (requestedCounsellor) {
            const { localizedText, audio } = await localizeResponse(
              `I wasn't able to find an immediately available counsellor right now, but I've flagged your request for urgent follow-up. 💜\n\nIn the meantime, you can reach our counsellors directly:\n\n📞 **Sauti 116 Helpline:** Call 116 (toll-free, 24/7)\n📞 **Mental Health Uganda:** 0800 110 022 (toll-free)\n\nYou can also browse available counsellors in the [Counsellors section](/counsellors) of the app to book a session directly.`,
            );

            return NextResponse.json({
              response: localizedText,
              language: userLanguage,
              languageName:
                SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
              audio,
              translationApplied,
              source: "agent",
              type: "agent",
              toolsUsed: ["counsellor_routing"],
              actions: [
                "Counsellor routing — no available match, flagged for follow-up",
              ],
              triage,
              actionStatuses,
            });
          }

          handoffText =
            "\n\nI could not find an immediately available counsellor right now, but I have flagged this for urgent follow-up. If this is an emergency, call Sauti 116 or 999 immediately.";
        }
      } catch (handoffError) {
        console.error("Handoff routing failed:", handoffError);
        actionStatuses[actionStatuses.length - 1] = {
          key: "handoff",
          label: "Counsellor routing failed",
          state: "failed",
        };

        if (requestedCounsellor) {
          const { localizedText, audio } = await localizeResponse(
            `I encountered an issue connecting you to a counsellor right now. 💜 Please try these direct options:\n\n📞 **Sauti 116 Helpline:** Call 116 (toll-free, 24/7)\n💬 **WhatsApp:** You can also browse [our counsellors](/counsellors) in the app to reach them directly.`,
          );

          return NextResponse.json({
            response: localizedText,
            language: userLanguage,
            languageName:
              SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
            audio,
            translationApplied,
            source: "agent",
            type: "agent",
            toolsUsed: [],
            actions: ["Counsellor routing error — fallback provided"],
            triage,
            actionStatuses,
          });
        }
      }
    } else if (shouldOfferHandoff && userId) {
      try {
        await logAgentEvent({
          userId,
          type: "handoff_offered",
          severity: triage.severity,
          success: true,
        });
      } catch (eventError) {
        console.warn("Failed to log handoff offer:", eventError);
      }

      actionStatuses.push({
        key: "handoff-offer",
        label: "Proactive counsellor handoff offered",
        state: "done",
      });
      handoffText =
        "\n\nI am concerned by what you shared. I can connect you to a professional counsellor right now. Reply: 'Connect me to a counsellor'.";
    }

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
          triage,
          actionStatuses,
        },
        { status: 503 },
      );
    }

    console.log(
      "Executing agent for message:",
      messageForAgent.substring(0, 50) + "...",
    );

    const agentResult = await executeAgent(apiKey, messageForAgent, {
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

    let responseText = agentResult.response;

    if (
      shouldPromptCycleConfirmation(cycleData) &&
      !PERIOD_START_PATTERN.test(trimmedMessage)
    ) {
      responseText +=
        "\n\nQuick check-in: did your period start already? If yes, please share the exact start date so I can update your cycle predictions accurately.";

      actionStatuses.push({
        key: "cycle-confirmation",
        label: "Cycle confirmation requested",
        state: "done",
      });
    }

    if (handoffText) {
      responseText += handoffText;
    }

    const { localizedText, audio } = await localizeResponse(responseText);

    return NextResponse.json({
      response: localizedText,
      language: userLanguage,
      languageName: SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
      audio,
      translationApplied,
      source: "agent",
      type: "agent",
      toolsUsed: agentResult.toolsUsed,
      actions: agentResult.actions,
      triage,
      actionStatuses,
      reasoning:
        agentResult.toolsUsed.length > 0
          ? `Analyzed your request and used ${agentResult.toolsUsed.length} tool(s) to help you.`
          : "Responded based on health knowledge.",
    });
  } catch (error) {
    console.error("Agent error:", error);
    const errorMessage = String(error);

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
          actionStatuses: [],
        },
        { status: 429, headers: { "Retry-After": "20" } },
      );
    }

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
          actionStatuses: [],
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      {
        response:
          "I'm having a small technical issue right now. Please try again in a moment. If you need immediate help, call Sauti 116 (toll-free in Uganda) or visit your nearest health center. 💜",
        source: "error",
        type: "agent",
        error: errorMessage,
        actionStatuses: [],
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
      "triage_scoring",
      "proactive_handoff_offers",
      "auto_counsellor_routing",
      "cycle_confirmation_loop",
      "agent_action_statuses",
      "evaluation_events",
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
