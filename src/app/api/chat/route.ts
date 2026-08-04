import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/agent";
// Server data layer: admin-SDK reads/writes that persist under security
// rules, with client-SDK fallback in unconfigured dev mode.
import {
  connectUserToCounsellor,
  logAgentEvent,
  routeCounsellor,
  saveCycleData,
  setActiveCounsellorOnConversation,
  getActiveCounsellorForConversation,
  getCounsellors,
  getAgentSystemOverview,
  getConversationMemory,
  savePregnancyData,
  createReminder,
  pausePeriodReminders,
} from "@/lib/server/serverData";
import { getCycleInfo, calculateNextPeriod } from "@/lib/cycle";
import {
  translateText,
  detectLanguage,
  textToSpeechCached,
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
} from "@/lib/sunbird";
import {
  assessConversationSafety,
  assessTriageSeverity,
} from "@/lib/safety";
import { authenticateRequest } from "@/lib/serverAuth";
import { createSessionRequest } from "@/lib/server/sessions";
import { emitEvent } from "@/lib/server/events";
import { withApiObservability } from "@/lib/observability";
import { getClinicalRuntimeIssues } from "@/lib/clinicalGovernance";
import { enforceChatRateLimit } from "@/lib/server/rateLimit";
import { hasConfiguredAgentProvider } from "@/lib/agent/modelRouter";
import { assessAgentRequestPolicy } from "@/lib/agent/requestPolicy";
import {
  assertCompleteResponse,
  isClearlyIncompleteResponse,
} from "@/lib/agent/responseIntegrity";
import { selectConversationMemory } from "@/lib/chatPipeline/memory";
import { derivePeriodStartDate } from "@/lib/periodUpdateIntent";
import {
  buildLocalizedReasoningMessage,
  buildTranslationPrompt,
} from "@/lib/localization";
import { resolveChatLanguage } from "@/lib/chatLanguage";
import {
  ChatPipelineError,
  evaluateHandoffPolicy,
  inferCounsellorSpecialty,
  runChatPreflightPipeline,
} from "@/lib/chatPipeline";
import {
  getPregnancyDetailsFromLmp,
  getPregnancyDueDateFromMessages,
  getPregnancyLmpFromMessages,
  hasPregnancyConfirmation,
  inferClientAction,
  isConfirmedPregnancyIntent,
  isPregnancyActivationRequest,
  isPregnancyRecordQuestion,
} from "@/lib/chatPipeline/intent";
import {
  AgentActionStatus,
  TriageSeverity,
} from "@/types";

// Supabase Admin requires the full Node.js runtime. Keep this explicit so a
// deployment configuration change cannot move authenticated chat to Edge.
export const runtime = "nodejs";

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
  if (lower === "luo") return "luo";
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

// This small offline detector covers high-confidence Luganda health phrases
// when the optional language service is unavailable. It prevents a default UI
// setting of English from overriding what the person has actually written.
function inferLanguageFromHealthMessage(
  message: string,
): SupportedLanguageCode | undefined {
  if (
    /\b(olubuto|lubuto|omutwe|nsonyiwa|nkutegeredde|nkole ntya|nnyamba|webale|gyebale|oyagala|olaba bubi)\b/i.test(
      message,
    )
  ) {
    return "lug";
  }
  return undefined;
}

function addLanguageIntentHint(
  message: string,
  language: SupportedLanguageCode,
): string {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();

  if (language !== "lug") {
    return normalized;
  }

  const intentHints: Array<[RegExp, string]> = [
    [
      /(njagala|nnyagala).*(kwogera|okwogera).*(kansala|counsellor|counselor|human help|help)/i,
      "English meaning: I want to talk to a counsellor or human support.",
    ],
    [
      /(olubuto|lubuto).*(lunuma|lunuma nnyo|lunuma nyo|lumwa|lumye)/i,
      "English meaning: I have abdominal pain or cramps.",
    ],
    [
      /(mbulila bubi nyo|mbulira bubi nyo|netaga ku buyambi|netaaga ku buyambi|ntaga ku buyambi|nenyaga ku buyambi|need help)/i,
      "English meaning: I feel very bad today and need help.",
    ],
    [
      /(ku mwana omuwala ali olubuto|omuwala ali olubuto|ali olubuto|pregnant girl|pregnant)/i,
      "English meaning: A girl is pregnant.",
    ],
    [
      /(kye kitegeeza|kyekitegeeza|kitegeeza ki|what does it mean)/i,
      "English meaning: What does this mean?",
    ],
    [
      /(nafunye olubuto.*(ndi mu somero|ndi mu somelo)|ndi mu somero.*nafunye olubuto)/i,
      "English meaning: I am pregnant and still in school.",
    ],
    [
      /(omusajja.*yanfunisiza olubuto.*(bazadde|bazade).*tebamanyi|bazadde.*tebamanyi.*olubuto)/i,
      "English meaning: A man made me pregnant and my parents do not know.",
    ],
  ];

  for (const [pattern, hint] of intentHints) {
    if (pattern.test(lower)) {
      return `${normalized}\n\n${hint}`;
    }
  }

  return normalized;
}

function getDirectLugandaResponse(message: string): string | null {
  const m = message.toLowerCase();

  if (
    /(nafunye olubuto.*(ndi mu somero|ndi mu somelo)|ndi mu somero.*nafunye olubuto)/i.test(
      m,
    )
  ) {
    return "Nkwetegereza era nsonyiwa ku buzibu bw'oyitamu. 💗 Bw'oba olina olubuto ng'okyali ku somero, oyinza okufuna obuyambi obw'obukuumi okuva eri omusomesa gw'osiga, senior woman/mentor, oba omukozi w'eby'obulamu ku ddwaliro erikuli okumpi. Oyinza okutandika n'okukebera olubuto ku ddwaliro, oluvannyuma tukole plan ennyangu ey'okukuuma obulamu bwo n'obw'omwana.";
  }

  if (/(omusajja.*yanfunisiza olubuto)/i.test(m)) {
    return "Nsonyiwa nnyo olw'ebyo by'oyiseemu. 💗 Okwogera kino kiraga obuvumu. Ka tukole mu bukebezi: singa waliwo okutisibwa oba okukozesebwa mu bubi, saba obuyambi ku Sauti 116 (free, 24/7) oba 999/112. Era oyinza okutandika n'okukebera olubuto ku ddwaliro, olonde omuntu omukulu gw'osiga, era tukuyunge ku kansala akuyambe mu ngeri etakutisizza.";
  }

  if (
    /(omusajja.*yanfunisiza olubuto.*(bazadde|bazade).*tebamanyi|bazadde.*tebamanyi.*olubuto)/i.test(
      m,
    )
  ) {
    return "Webale okwogerako - kino kizibu nnyo era oli wa muwendo. 💗 Tujja okukola mu bukebezi. Singa waliwo okutisibwa oba okukozesebwa mu bubi, nyiga obuyambi bw'amangu ku Sauti 116 (free, 24/7) oba 999/112. Era tusobola okusooka n'entambula eno: (1) kebera olubuto ku ddwaliro, (2) londa omuntu omukulu gw'osiga ayinza okubeera naawe, (3) tufune kansala akuyambe okwogera n'abazadde mu ngeri etali ya kutiisa.";
  }

  if (
    /(jebale|jebala|webale|gyebale|osiibye otya|oli otya|kili kitya|hello|hi)/i.test(m)
  ) {
    return "Gyebale ko! Ndi Sister wo era ndi wano okukuyamba. 💗 Leero oyagala twogere ku ki?";
  }

  if (
    /(tomanyi luganda|tolumanyi|togera luganda|toyogera luganda|omanyi oluganda|omanyi luganda)/i.test(
      m,
    )
  ) {
    return "Mmanyi Oluganda era nnyinza okwogera naawe bulungi. 💗 Nsonyiwa bw'otafunye ky'oyagala mangu. Nsaba ombuulire ekizibu kyo mu bigambo ebitono, nkuyambe bulungi.";
  }

  if (
    /(njagala|nnyagala).*(kansala|counsellor|counselor|human help)/i.test(m)
  ) {
    return "Kale, nsobola okukuyunga ku kansala. 💗 Bw'oyagala nnyinza okukuyamba okufuna omuntu ow'okuyamba kati. Era bw'oba olina akaseera, tusobola okusooka okwogera ku mbeera yo okwanguyiza obuyambi obutuufu.";
  }

  if (
    /(omutwe|headache).*(olubuto|lubuto|belly|abdomen)|(olubuto|lubuto|belly|abdomen).*(omutwe|headache)/i.test(
      m,
    ) &&
    /(ndi lubuto|ndi olubuto|nfa olubuto|oyinza okuba olubuto|pregnan)/i.test(
      m,
    )
  ) {
    return "Nsonyiwa nnyo kubanga oli mu bulumi. Obulumi bw'omutwe n'obw'olubuto nga oyinza okuba olubuto bwetaaga okukeberebwa leero ku ddwaliro oba health centre; si kirungi kugagezaako kugawonya ggwe wekka. Genda mangu ddala singa obulumi bwa maanyi, otandika okuvaamu omusaayi, ozirika oba ogwa eddalu, olaba bubi, oba olina omusujja. Nga tonnalabibwa, wummula, nywa amazzi mpola, era wewale eddagala lyonna okuggyako nga omukozi w'eby'obulamu akakakasizza nti terikukosa lubuto.";
  }

  if (
    /(olubuto|lubuto).*(lunuma|lunuma nnyo|lunuma nyo|lumwa|lumye)/i.test(m)
  ) {
    return "Nsonyiwa oluvannyuma lw'obulumi. 💗 Ku cramp oba obulumi bw'ekifuba ekya wansi, gezaako okussaako enkoona entangaala, okunywa amazzi, okuwummula, n'okwewala okukola ebizito. Singa bulumi bwa maanyi nnyo, laba omukugu mu by'obulamu.";
  }

  if (
    /(omutwe).*(gundi bubi|gunuma|gunnuma|bubi nnyo|gulumye|lumwa)/i.test(m)
  ) {
    return "Nsonyiwa ku bulumi bw'omutwe. 💗 Gezaako okuwummula mu kifo ekisirifu, nywa amazzi, era obeere wala ku bintu ebireeta olusuku. Singa bulumi bumala ebbanga oba bweyongera, laba omukugu mu by'obulamu.";
  }

  if (
    /(ku mwana omuwala ali olubuto|omuwala ali olubuto|ali olubuto|pregnant girl)/i.test(
      m,
    )
  ) {
    return "Omuwala bw'aba ali olubuto, kirungi okumuyunga ku muntu omukulu oba omukozi w'eby'obulamu mangu. 💗 Muyambe okukebera olubuto mu kliniki, era atandike okulabirirwa mu lubuto mangu singa kisoboka.";
  }

  if (
    /(mbulila bubi nyo|mbulira bubi nyo|netaga ku buyambi|netaaga ku buyambi|need help)/i.test(
      m,
    )
  ) {
    return "Ndi wano okukuyamba. 💗 Nsobola okukutegeera bulungi singa ombuulira ekikukwatako kati. Oyagala obuyambi ku bulumi, ku birowoozo, oba oyagala nnyunge ku kansala?";
  }

  return null;
}

function isLanguageSwitchIntent(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /speak|talk|reply|respond|use language|language please|write in/.test(m) ||
    /toyogera|twogere|yogera/.test(m)
  );
}

function getLanguageSwitchConfirmation(
  language: SupportedLanguageCode,
): string | null {
  const responses: Partial<Record<SupportedLanguageCode, string>> = {
    lug: "Kale, tugenda kwogera mu Luganda. Ndi wano okukuyamba ku by'obulamu bwo. Onyagala twogere ku ki?",
    nyn: "Ni sawa, twaza kugamba omu Runyankole. Ndi hanu kukuhwera. Niki eki orikwenda tugambeho?",
    teo: "Erai, itetemuni ka Ateso. Arai ikesi na itungauni. Ijo nu daunitete itunganakini?",
    luo: "Ber ahinya, wabiro wuoyo e dholuo. An kanyiso ka akweyi. Idwaro wawinjore kuom ang'o?",
    ach: "Ber, wabedo kawacho i leb Acholi. An tye ka konyi. Imito wa lok ikom ngo?",
    lgg: "Yoo, mi adri ti Lugbara. Ma adi rika ma ni. Mi oji ni ri nyi?",
    sw: "Sawa, tutaongea kwa Kiswahili. Niko hapa kukusaidia. Ungependa tuzungumzie nini?",
  };

  return responses[language] || null;
}

function parsePeriodStartDate(message: string): Date | null {
  const m = message.toLowerCase();
  const now = new Date();
  const daysAgo = (days: number): Date => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  if (/today/.test(m)) return now;
  if (/day before yesterday/.test(m)) return daysAgo(2);
  if (/yesterday/.test(m)) return daysAgo(1);

  // Relative phrases: "started 5 days ago", "began two weeks ago", "a week ago"
  const relativeMatch = m.match(
    /\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|week)s?\s*(ago|back)\b/,
  );
  if (relativeMatch) {
    const numberWords: Record<string, number> = {
      a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    };
    const n = numberWords[relativeMatch[1]] ?? parseInt(relativeMatch[1], 10);
    const days = relativeMatch[2] === "week" ? n * 7 : n;
    // Beyond ~60 days it's history, not a current period — let the agent clarify.
    if (Number.isFinite(days) && days >= 0 && days <= 60) return daysAgo(days);
    return null;
  }
  if (/\blast week\b/.test(m)) return daysAgo(7);

  const dateMatch = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (dateMatch) {
    const parsed = new Date(dateMatch[1]);
    if (!isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime()) {
      return parsed;
    }
  }

  const generic = new Date(message);
  if (
    !isNaN(generic.getTime()) &&
    generic.getFullYear() > 2000 &&
    generic.getTime() <= now.getTime()
  ) {
    return generic;
  }

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

function isSignificantlyOverdue(cycleData?: {
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
  return info.daysLate >= 7;
}

async function translateWithGemini(
  apiKey: string,
  text: string,
  targetLanguage: string,
): Promise<string> {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildTranslationPrompt(text, targetLanguage),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1536,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini translation failed: ${response.status}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const translated = candidate?.content?.parts?.[0]?.text;
  if (!translated || typeof translated !== "string") {
    throw new Error("Gemini translation returned empty output");
  }

  const completeTranslation = translated.trim();
  assertCompleteResponse(completeTranslation, candidate?.finishReason);
  return completeTranslation;
}

function isProbablyEnglishText(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  const englishWords = normalized.match(
    /\b(i|you|your|the|and|can|please|hello|feel|today|help|this|that|with|for|are|is)\b/g,
  );
  return (englishWords?.length || 0) >= 2;
}

function fallbackLocalizedResponse(
  originalEnglishText: string,
  language: SupportedLanguageCode,
): string {
  const lower = originalEnglishText.toLowerCase();

  const generic: Partial<Record<SupportedLanguageCode, string>> = {
    lug: "Ndi wano okukuyamba. Nsaba obuuze ekibuuzo kyo nate mu ngeri ennyangu. 💗",
    nyn: "Ndi hanu kukuhwera. Nkusaba obuuze eki orikwenda obuyambiho. 💗",
    teo: "Arai ikesi na itungauni. Kojo akiswomuni itai. 💗",
    luo: "An kanyiso ka akweyi. Kiyie penjo mariwore kendo. 💗",
    ach: "An tye ka konyi. Tim ber i penya an kede lok mamek. 💗",
    lgg: "Ma adi rika ma ni. Mi oji ri nyi bori kuza. 💗",
    sw: "Niko hapa kukusaidia. Tafadhali uliza swali lako tena kwa urahisi. 💗",
  };

  const cycleSetup: Partial<Record<SupportedLanguageCode, string>> = {
    lug: "Nnyinza okukuyamba ku cycle yo. Sooka otegeke cycle data yo mu Settings, oba mpiteko olunaku period yo lwe yasooka okutandika. 🌸",
    nyn: "Ninyenda kukuhwera aha cycle yawe. Banza oteekateekye cycle data omu Settings, nari ombuurire olunaku orwatandikireho periods. 🌸",
    teo: "Arai etunganan ka cycle noi. Kobuni akitogogong Settings ka cycle data, arai ijo neni amori na itojokinit periods. 🌸",
    luo: "Anyalo konyi kuom cycle mari. Chak keto data mar cycle e Settings kata nyisa chieng' mane period maru ochakore. 🌸",
    ach: "An twero konyi ikom cycle mamegi. Bed i keto cycle data i Settings onyo waci an nino ma period mamegi ocako. 🌸",
    lgg: "Ma adi rika ma cycle mi. Soko mi dria cycle data ri Settings, ma mi pa ma ndrini ma period mi oco. 🌸",
    sw: "Ninaweza kukusaidia kuhusu mzunguko wako. Tafadhali weka data ya mzunguko kwenye Settings au niambie tarehe ambayo hedhi yako ilianza. 🌸",
  };

  const greeting: Partial<Record<SupportedLanguageCode, string>> = {
    lug: "Ndi Sister wo era ndi wano bulijjo okukuyamba. 💗 Oyagala twogere ku ki?",
    nyn: "Ndi Sister wawe kandi ndi hanu kukuhwera obwire bwona. 💗 Niki eki orikwenda tugambeho?",
    teo: "Arai Sister koni, ikesi na itungauni ijo. 💗 Ijo nu daunitete itunganakini?",
    luo: "An Sister mari kendo an kanyiso ka akweyi. 💗 Idwaro wawinjore kuom ang'o?",
    ach: "An aye Sister mamegi, tye ka konyi kare weng. 💗 Imito wa lok ikom ngo?",
    lgg: "Ma Sister mi, ma adi rika ma ni nyonyo. 💗 Mi oji ni ri nyi?",
    sw: "Mimi ni Sister wako, niko hapa kukusaidia kila wakati. 💗 Ungependa tuzungumzie nini?",
  };

  if (
    lower.includes("set up your cycle data") ||
    lower.includes("last period started")
  ) {
    return cycleSetup[language] || generic[language] || originalEnglishText;
  }

  if (
    lower.includes("always here for you") ||
    lower.includes("what would you like to talk about")
  ) {
    return greeting[language] || generic[language] || originalEnglishText;
  }

  return generic[language] || originalEnglishText;
}

async function localizeResponseText(
  englishText: string,
  language: SupportedLanguageCode,
  geminiApiKey: string,
): Promise<string> {
  if (language === "eng") return englishText;

  let localizedText = "";
  try {
    const translated = await translateText(englishText, "eng", language);
    localizedText = translated.translatedText;
  } catch (sunbirdError) {
    console.warn("Sunbird response localization failed:", sunbirdError);
    if (geminiApiKey) {
      try {
        localizedText = await translateWithGemini(
          geminiApiKey,
          englishText,
          SUPPORTED_LANGUAGES[language]?.name || language,
        );
      } catch (geminiError) {
        console.warn("Gemini response localization fallback failed:", geminiError);
      }
    }
  }

  if (
    !localizedText ||
    isClearlyIncompleteResponse(localizedText) ||
    (isProbablyEnglishText(localizedText) &&
      localizedText.trim() === englishText.trim())
  ) {
    return fallbackLocalizedResponse(englishText, language);
  }
  return localizedText;
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
async function postChat(request: NextRequest) {
  try {
    // Trust boundary: when Supabase Admin is configured, the caller MUST
    // present a valid ID token and the verified uid overrides whatever
    // userId the request body claims. Without Admin configured (dev mode)
    // we fall back to the body's userId, with a warning logged at startup.
    const auth = await authenticateRequest(request);
    if (auth.status === "unavailable") {
      return NextResponse.json(
        {
          response:
            "I couldn’t securely verify your session, so I did not read or change any account data. Please retry in a moment.",
          error: "Authentication verification is temporarily unavailable",
          code: "AUTH_VERIFICATION_UNAVAILABLE",
          source: "security",
          type: "agent",
          actionStatuses: [
            {
              key: "auth-verification",
              label: "No action taken because identity verification was unavailable",
              state: "failed",
            },
          ],
        },
        { status: 503 },
      );
    }
    if (auth.status === "unauthenticated") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    let preflight;
    try {
      preflight = runChatPreflightPipeline(
        body || {},
        auth.status === "verified"
          ? { mode: "verified", uid: auth.uid }
          : {
              mode: "development",
              bodyUid:
                body && typeof body.userId === "string"
                  ? body.userId
                  : undefined,
            },
      );
    } catch (error) {
      if (error instanceof ChatPipelineError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status },
        );
      }
      throw error;
    }
    const {
      message: trimmedMessage,
      conversationHistory,
      userId,
      cycleData: clientCycleData,
      userProfile: clientUserProfile,
      conversationId,
      userLanguage: clientLanguage,
    } = preflight.request;
    if (auth.status === "verified" && userId) {
      const quota = await enforceChatRateLimit(userId, request.headers.get("x-forwarded-for"));
      if (!quota.allowed) {
        return NextResponse.json({ error: "Please wait a moment before sending another message.", code: "RATE_LIMITED", retryAfter: quota.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } });
      }
    }
    let cycleData = clientCycleData;
    let userProfile = clientUserProfile;
    let effectiveConversationHistory = conversationHistory;
    if (auth.status === "verified" && userId) {
      try {
        const canonicalContext = await getAgentSystemOverview(userId);
        userProfile = canonicalContext.profile || undefined;
        cycleData = canonicalContext.profile?.cycleData || undefined;
      } catch (error) {
        console.warn("[chat] Canonical agent context unavailable", {
          userId: userId.slice(0, 8),
          error: error instanceof Error ? error.message : "unknown",
        });
        userProfile = undefined;
        cycleData = undefined;
      }

      if (conversationId) {
        try {
          const storedHistory = await getConversationMemory(
            userId,
            conversationId,
          );
          effectiveConversationHistory = selectConversationMemory(
            storedHistory,
            conversationHistory,
            trimmedMessage,
          );
        } catch (error) {
          console.warn("[chat] Durable conversation memory unavailable", {
            userId: userId.slice(0, 8),
            error: error instanceof Error ? error.message : "unknown",
          });
        }
      }
    }
    const actionStatuses: AgentActionStatus[] = preflight.actionStatuses;
    const priorSafetyMessages = effectiveConversationHistory
      .filter((entry) => entry.role === "user")
      .map((entry) => entry.content);
    let safetyAssessment = preflight.safety;
    let triage = preflight.triage;
    const apiKey = process.env.GEMINI_API_KEY || "";

    const storedLanguageValue = userProfile?.preferences?.language;
    const storedLanguage = storedLanguageValue
      ? toSupportedLanguageCode(storedLanguageValue)
      : undefined;
    const clientLanguageCode = clientLanguage
      ? toSupportedLanguageCode(clientLanguage)
      : undefined;
    const requestedLanguageName = inferRequestedLanguage(trimmedMessage);
    const inMessageLanguage = requestedLanguageName
      ? toSupportedLanguageCode(requestedLanguageName)
      : undefined;
    const inferredHealthLanguage = inferLanguageFromHealthMessage(trimmedMessage);
    let userLanguage = resolveChatLanguage({
      requestedLanguage: inMessageLanguage,
      clientLanguage: clientLanguageCode,
      storedLanguage,
      inferredLanguage: inferredHealthLanguage,
    });
    let translationApplied = userLanguage !== "eng";
    let messageForAgent = trimmedMessage;

    messageForAgent = addLanguageIntentHint(messageForAgent, userLanguage);

    if (isLanguageSwitchIntent(trimmedMessage) && inMessageLanguage) {
      const confirmation = await localizeResponseText(
        "Okay, I will use your requested language. What would you like help with?",
        userLanguage,
        apiKey,
      );
      return NextResponse.json({
        response: confirmation,
        language: userLanguage,
        languageName: SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
        translationApplied: userLanguage !== "eng",
        source: "agent",
        type: "agent",
        toolsUsed: [],
        actions: ["Reply language changed for this response"],
        triage,
        actionStatuses: [
          {
            key: "language",
            label: `Replying in ${SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage}`,
            state: "done",
          },
        ],
      });
    }

    const confirmedPregnancy = hasPregnancyConfirmation(
      trimmedMessage,
      effectiveConversationHistory,
    );
    const pregnancyMessages = [
      ...effectiveConversationHistory
        .filter((entry) => entry.role === "user")
        .map((entry) => entry.content),
      trimmedMessage,
    ];
    const pregnancyDueDateFromConversation =
      getPregnancyDueDateFromMessages(pregnancyMessages);
    const pregnancyLmpFromConversation = pregnancyDueDateFromConversation
      ? new Date(
          pregnancyDueDateFromConversation.getTime() -
            280 * 24 * 60 * 60 * 1000,
        )
      : getPregnancyLmpFromMessages(pregnancyMessages);
    const shouldActivatePregnancy =
      confirmedPregnancy &&
      (isConfirmedPregnancyIntent(trimmedMessage) ||
        isPregnancyActivationRequest(trimmedMessage) ||
        pregnancyLmpFromConversation !== null);

    if (!clientLanguageCode && !storedLanguage && !inMessageLanguage) {
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
        if (apiKey) {
          try {
            messageForAgent = await translateWithGemini(
              apiKey,
              trimmedMessage,
              "English",
            );
          } catch (geminiTranslationError) {
            console.warn(
              "Gemini fallback translation to English failed:",
              geminiTranslationError,
            );
          }
        }
      }
    }

    // Safety net: the crisis/triage regexes are English-only, so a message
    // written in Luganda or Swahili would sail past them. Re-assess severity
    // on the translated text and keep whichever result is more severe.
    if (messageForAgent !== trimmedMessage) {
      const severityRank: Record<TriageSeverity, number> = {
        low: 0,
        medium: 1,
        high: 2,
        critical: 3,
      };
      const translatedTriage = assessTriageSeverity(messageForAgent);
      if (
        severityRank[translatedTriage.severity] > severityRank[triage.severity]
      ) {
        triage = translatedTriage;
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

    const requestedClientAction = inferClientAction(trimmedMessage);
    if (requestedClientAction) {
      const isSignOut = requestedClientAction.type === "sign_out";
      const destinationLabel = isSignOut
        ? "Signing you out"
        : requestedClientAction.articleId === 6
          ? "Opening Foods That Help During Your Period in the library"
          : `Opening ${requestedClientAction.href.slice(1).replace(/-/g, " ")}`;
      const actionResponse = await localizeResponseText(
        isSignOut ? "Signing you out securely now." : `${destinationLabel}.`,
        userLanguage,
        apiKey,
      );
      return NextResponse.json({
        response: actionResponse,
        language: userLanguage,
        languageName: SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
        source: "agent_action",
        type: "agent",
        toolsUsed: [],
        actions: [destinationLabel],
        triage,
        clientAction: requestedClientAction,
        actionStatuses: [
          ...actionStatuses,
          { key: "client-action", label: destinationLabel, state: "done" },
        ],
      });
    }

    if (translationApplied) {
      actionStatuses.push({
        key: "language",
        label: `Reply language: ${SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage}`,
        state: "done",
      });
    }

    // Only pre-write a period date when the message actually states one, or
    // affirmatively says the period is starting NOW. Vague matches such as
    // "update my period" or "backtrack" used to default to today's date and
    // fight with the agent's own tool call — those are now left to the agent.
    const impliesStartingNow =
      /\b(i got my period|got my periods|my period is here|period (started|has started|came|began|arrived))\b/i.test(
        trimmedMessage,
      ) && !/\b(ago|back|last week|update|backtrack)\b/i.test(trimmedMessage);
    const parsedStartDate =
      userId && cycleData && !shouldActivatePregnancy
        ? derivePeriodStartDate(
            trimmedMessage,
            effectiveConversationHistory,
          ) || (impliesStartingNow ? new Date() : null)
        : null;

    if (userId && cycleData && parsedStartDate) {
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

        cycleData = {
          ...cycleData,
          lastPeriodDate: parsedStartDate,
          nextPeriodDate: nextPeriod,
          currentPhase: "menstrual",
        };

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

    if (userId && shouldActivatePregnancy) {
      const lastPeriodDate =
        pregnancyLmpFromConversation ||
        (cycleData ? new Date(cycleData.lastPeriodDate) : new Date("invalid"));
      const pregnancy = getPregnancyDetailsFromLmp(lastPeriodDate);
      const hasPlausibleRecordedLmp =
        !Number.isNaN(lastPeriodDate.getTime()) &&
        pregnancy.daysPregnant >= 14 &&
        pregnancy.daysPregnant <= 294;

      if (hasPlausibleRecordedLmp) {
        try {
          await savePregnancyData(userId, {
            isPregnant: true,
            gaveBirth: false,
            lastMenstrualPeriodDate: lastPeriodDate,
            estimatedDueDate: pregnancy.estimatedDueDate,
            weeksPregnant: pregnancy.weeksPregnant,
            trimester: pregnancy.trimester,
          });
          await pausePeriodReminders(userId);
          if (!userProfile?.pregnancyData?.isPregnant) {
            const checkIn = new Date();
            checkIn.setDate(checkIn.getDate() + 7);
            await createReminder(userId, {
              userId,
              type: "check_in",
              title: "Pregnancy check-in",
              message: "How are you feeling? Take a moment to review your pregnancy support and antenatal plan.",
              scheduledFor: checkIn,
            });
          }
          await logAgentEvent({
            userId,
            type: "pregnancy_updated",
            severity: triage.severity,
            success: true,
          });
          const formattedLmp = lastPeriodDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });
          const formattedDueDate = pregnancy.estimatedDueDate.toLocaleDateString(
            "en-US",
            { month: "long", day: "numeric", year: "numeric" },
          );
          const pregnancyResponse = await localizeResponseText(
            `I've switched your profile to pregnancy support using the last period date already recorded in SisterCare: ${formattedLmp}. Your estimated due date is ${formattedDueDate}; this is about ${pregnancy.weeksPregnant} weeks pregnant and in the ${pregnancy.trimester} trimester. Please arrange antenatal care, and tell me if that recorded date is not the first day of the period before this pregnancy.`,
            userLanguage,
            apiKey,
          );
          return NextResponse.json({
            response: pregnancyResponse,
            language: userLanguage,
            languageName: SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
            source: "agent_action",
            type: "agent",
            toolsUsed: ["get_system_overview", "update_pregnancy_status"],
            actions: ["Updated pregnancy status", "Scheduled pregnancy check-in"],
            triage,
            actionStatuses: [
              ...actionStatuses,
              {
                key: "pregnancy-update",
                label: "Pregnancy support enabled from recorded cycle data",
                state: "done",
              },
            ],
          });
        } catch (pregnancyError) {
          console.warn("Failed to enable pregnancy support from cycle data:", pregnancyError);
          actionStatuses.push({
            key: "pregnancy-update",
            label: "Pregnancy update could not be saved",
            state: "failed",
          });
        }
      }
    }

    // These facts are stored on the authenticated profile, not inferred from
    // the language model. Answering them here makes the record reliably
    // available in every future chat and proves exactly what SisterCare has.
    if (userProfile?.pregnancyData?.isPregnant && isPregnancyRecordQuestion(trimmedMessage)) {
      const recordedLmp = userProfile.pregnancyData.lastMenstrualPeriodDate;
      const recordedDueDate = userProfile.pregnancyData.estimatedDueDate;
      const lmpText = recordedLmp
        ? new Date(recordedLmp).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "not recorded yet";
      const dueText = recordedDueDate
        ? new Date(recordedDueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "not recorded yet";
      const pregnancyRecordResponse = await localizeResponseText(
        `Your pregnancy record in SisterCare has your last menstrual period as ${lmpText} and your estimated due date as ${dueText}. You are currently recorded as ${userProfile.pregnancyData.weeksPregnant ?? "an unconfirmed number of"} weeks pregnant in the ${userProfile.pregnancyData.trimester || "unconfirmed"} trimester.`,
        userLanguage,
        apiKey,
      );
      return NextResponse.json({
        response: pregnancyRecordResponse,
        language: userLanguage,
        languageName: SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
        source: "system_record",
        type: "agent",
        toolsUsed: ["get_system_overview"],
        actions: ["Read recorded pregnancy information"],
        triage,
        actionStatuses: [...actionStatuses, { key: "pregnancy-record", label: "Read recorded pregnancy information", state: "done" }],
      });
    }

    const handoffPolicy = evaluateHandoffPolicy({
      message: trimmedMessage,
      severity: triage.severity,
      languageCode: userLanguage,
    });
    const {
      requestedCounsellor,
      requestedCall,
      requestedWhatsApp,
      shouldOfferHandoff,
      shouldAutoConnect,
    } = handoffPolicy;

    const localizeResponse = async (text: string) => {
      const localizedText = await localizeResponseText(
        text,
        userLanguage,
        apiKey,
      );

      let audio:
        | { url: string; durationSeconds: number; mimeType: string }
        | undefined;
      // Voice output exists for users more comfortable hearing their own
      // language — for English it adds seconds of latency and burns Sunbird
      // quota on every message for little value, so skip it.
      if (userLanguage !== "eng") {
        try {
          const tts = await textToSpeechCached(localizedText, userLanguage, 0.7);
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
      }

      return { localizedText, audio };
    };

    const agentMessage =
      userLanguage !== "eng"
        ? buildLocalizedReasoningMessage(
            messageForAgent,
            SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
          )
        : messageForAgent;

    // Check both the original conversation and the English translation. The
    // contextual assessment catches cumulative signals across recent turns.
    if (!safetyAssessment.response && messageForAgent !== trimmedMessage) {
      safetyAssessment = assessConversationSafety([
        ...priorSafetyMessages,
        messageForAgent,
      ]);
    }
    const crisisResponse = safetyAssessment.response;
    if (crisisResponse) {
      // Crisis lane (ARCHITECTURE_V2 §4.4): beyond the canned resources, open
      // a critical session so an online counsellor is paged and the
      // time-to-human SLA clock starts. Failure here must never block the
      // crisis resources from reaching the user.
      let crisisSession: { id: string; state: string } | undefined;
      if (userId) {
        try {
          await emitEvent("crisis.detected", {
            userId,
            severity: triage.severity,
            conversationId: conversationId || null,
          });
          const session = await createSessionRequest({
            userId,
            reason: "risk_detected",
            priority: "critical",
            summary: `Crisis detected by safety layer: ${messageForAgent.substring(0, 300)}`,
            specialty: "Mental Health",
            preferredLanguage:
              SUPPORTED_LANGUAGES[userLanguage]?.name || undefined,
            conversationId: conversationId || undefined,
          });
          crisisSession = { id: session.id, state: session.state };
          actionStatuses.push({
            key: "crisis-lane",
            label:
              session.state === "matched" || session.state === "active"
                ? "A counsellor has been alerted"
                : "Waiting for the next available counsellor",
            state: "done",
          });
        } catch (sessionError) {
          console.warn("Crisis-lane session creation failed:", sessionError);
        }
      }

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
        session: crisisSession,
        actionStatuses: [
          ...actionStatuses,
          { key: "safety", label: "Safety protocol activated", state: "done" },
        ],
      });
    }

    let handoffText = "";
    let sessionInfo:
      | { id: string; state: string; priority: string }
      | undefined;

    if (shouldAutoConnect && userId) {
      actionStatuses.push({
        key: "handoff",
        label: "Finding best available counsellor",
        state: "pending",
      });

      // Phase 2 session lane: open a platform-observed session in parallel
      // with the legacy phone/WhatsApp handoff. Critical triage enters the
      // crisis lane (queue preemption + time-to-human SLA clock). Failure
      // here never blocks the legacy handoff below.
      try {
        const session = await createSessionRequest({
          userId,
          reason:
            triage.severity === "critical" ? "risk_detected" : "user_request",
          priority: triage.severity === "critical" ? "critical" : "normal",
          summary: messageForAgent.substring(0, 400),
          specialty: inferCounsellorSpecialty(messageForAgent),
          preferredLanguage:
            SUPPORTED_LANGUAGES[userLanguage]?.name || undefined,
          conversationId: conversationId || undefined,
        });
        sessionInfo = {
          id: session.id,
          state: session.state,
          priority: session.priority,
        };
        if (triage.severity === "critical") {
          await emitEvent("crisis.detected", {
            userId,
            severity: triage.severity,
            sessionId: session.id,
            conversationId: conversationId || null,
          });
        }
      } catch (sessionErr) {
        console.warn(
          "Session request creation failed (continuing with legacy handoff):",
          sessionErr,
        );
      }

      try {
        let counsellor;
        const isPronounReference =
          handoffPolicy.referencesActiveCounsellor;

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
              "Could not create counsellor thread in Supabase, continuing with direct handoff:",
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
              `I've matched you with **${counsellor.name}** — ${counsellor.title}. 💗\n\nI'm opening their profile so you can review their languages, specialties, and availability first. From there, you can request a private SisterCare session.`,
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
              session: sessionInfo,
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
              `I wasn't able to find an immediately available counsellor right now, but I've flagged your request for urgent follow-up. 💗\n\nIf you need urgent support, call your configured regional emergency service. You can also browse live availability in the [Counsellors section](/counsellors) and request a private SisterCare session.`,
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
              session: sessionInfo,
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
            `I encountered an issue connecting you to a counsellor right now. 💗 Please browse [our counsellors](/counsellors) to see live availability and request a private SisterCare session.`,
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

    const requestPolicy = assessAgentRequestPolicy(trimmedMessage);
    if (requestPolicy.kind === "blocked_action") {
      const { localizedText, audio } = await localizeResponse(
        requestPolicy.warning,
      );
      return NextResponse.json({
        response: localizedText,
        language: userLanguage,
        languageName: SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
        audio,
        translationApplied,
        source: "security",
        type: "agent",
        code: "ACTION_NOT_ALLOWED",
        toolsUsed: [],
        actions: [],
        triage,
        actionStatuses: [
          ...actionStatuses,
          {
            key: "action-boundary",
            label: "Unsafe or unauthorised action prevented",
            state: "failed",
          },
        ],
      });
    }

    const clinicalRuntimeIssues = getClinicalRuntimeIssues();
    const clinicalGuidanceAllowed = clinicalRuntimeIssues.length === 0;
    if (
      !clinicalGuidanceAllowed &&
      requestPolicy.kind === "clinical_guidance"
    ) {
      const { localizedText, audio } = await localizeResponse(
        "I can record what you are experiencing and help you contact a verified counsellor, but I can’t provide clinical causes, diagnosis, medication, or treatment guidance until SisterCare’s clinical content has completed documented professional review. If your symptoms are severe, rapidly worsening, involve heavy bleeding, fainting, breathing difficulty, or immediate danger, seek urgent in-person care now.",
      );
      return NextResponse.json({
        response: localizedText,
        language: userLanguage,
        languageName: SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
        audio,
        translationApplied,
        source: "clinical_limit",
        type: "agent",
        code: "CLINICAL_REVIEW_REQUIRED",
        toolsUsed: [],
        actions: [],
        triage,
        actionStatuses: [
          ...actionStatuses,
          {
            key: "clinical-governance",
            label: "Clinical guidance limited pending professional review",
            state: "failed",
          },
        ],
      });
    }

    if (!hasConfiguredAgentProvider()) {
      console.warn("No agent model provider is configured");
      return NextResponse.json(
        {
          response:
            "I can’t use advanced reasoning right now because no model provider is configured. No account changes were made. Please ask an administrator to check the Groq or Gemini configuration.",
          source: "degraded",
          type: "agent",
          code: "MODEL_PROVIDER_NOT_CONFIGURED",
          triage,
          actionStatuses: [
            ...actionStatuses,
            {
              key: "model-provider",
              label: "Advanced reasoning provider unavailable",
              state: "failed",
            },
          ],
        },
        { status: 200 },
      );
    }

    console.log(
      "Executing agent for message:",
      agentMessage.substring(0, 50) + "...",
    );

    const agentResult = await executeAgent(apiKey, agentMessage, {
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
      pregnancyData: userProfile?.pregnancyData
        ? {
            isPregnant: userProfile.pregnancyData.isPregnant ?? false,
            estimatedDueDate:
              userProfile.pregnancyData.estimatedDueDate?.toISOString(),
            lastMenstrualPeriodDate:
              userProfile.pregnancyData.lastMenstrualPeriodDate?.toISOString(),
            trimester: userProfile.pregnancyData.trimester,
            weeksPregnant: userProfile.pregnancyData.weeksPregnant,
            gaveBirth: userProfile.pregnancyData.gaveBirth ?? false,
            birthDate: userProfile.pregnancyData.birthDate?.toISOString(),
          }
        : undefined,
      conversationHistory: effectiveConversationHistory,
      clinicalGuidanceAllowed,
    });

    let responseText = agentResult.response;

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
      session: sessionInfo,
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
            "I'm a bit busy right now with lots of conversations! 💗 Please wait about 20 seconds and send your message again.",
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
            "I'm taking a bit longer than usual to respond. Please try sending your message again. 💗",
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
          "I'm having a small technical issue right now. Please try again in a moment. If you need immediate help, contact your configured regional emergency service or visit the nearest health facility. 💗",
        source: "error",
        type: "agent",
        error: errorMessage,
        actionStatuses: [],
      },
      { status: 500 },
    );
  }
}

export const POST = withApiObservability("chat", postChat);

/**
 * GET /api/chat
 *
 * Health check endpoint for the agent
 */
export async function GET() {
  return NextResponse.json({
    status: "online",
    type: "ai_agent",
    description: "SisterCare chat service",
  });
}
