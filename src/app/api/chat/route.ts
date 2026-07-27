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
import { authenticateRequest } from "@/lib/firebaseAdmin";
import { createSessionRequest } from "@/lib/server/sessions";
import { emitEvent } from "@/lib/server/events";
import { withApiObservability } from "@/lib/observability";
import {
  ChatPipelineError,
  evaluateHandoffPolicy,
  inferCounsellorSpecialty,
  runChatPreflightPipeline,
} from "@/lib/chatPipeline";
import {
  AgentActionStatus,
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

const PERIOD_START_PATTERN =
  /(period (started|came|has started|began|arrived)|i got my period|my period is here|started my period|got my periods|(started|began).*\d+\s*(day|week)s?\s*ago|backtrack|go back|update.*period)/i;

function toPhoneHref(phoneNumber: string): string {
  return `tel:${phoneNumber.replace(/[^+\d]/g, "")}`;
}

function toWhatsAppHref(phoneNumber: string): string {
  const digits = phoneNumber.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
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
    return "Nkwetegereza era nsonyiwa ku buzibu bw'oyitamu. 💜 Bw'oba olina olubuto ng'okyali ku somero, oyinza okufuna obuyambi obw'obukuumi okuva eri omusomesa gw'osiga, senior woman/mentor, oba omukozi w'eby'obulamu ku ddwaliro erikuli okumpi. Oyinza okutandika n'okukebera olubuto ku ddwaliro, oluvannyuma tukole plan ennyangu ey'okukuuma obulamu bwo n'obw'omwana.";
  }

  if (/(omusajja.*yanfunisiza olubuto)/i.test(m)) {
    return "Nsonyiwa nnyo olw'ebyo by'oyiseemu. 💜 Okwogera kino kiraga obuvumu. Ka tukole mu bukebezi: singa waliwo okutisibwa oba okukozesebwa mu bubi, saba obuyambi ku Sauti 116 (free, 24/7) oba 999/112. Era oyinza okutandika n'okukebera olubuto ku ddwaliro, olonde omuntu omukulu gw'osiga, era tukuyunge ku kansala akuyambe mu ngeri etakutisizza.";
  }

  if (
    /(omusajja.*yanfunisiza olubuto.*(bazadde|bazade).*tebamanyi|bazadde.*tebamanyi.*olubuto)/i.test(
      m,
    )
  ) {
    return "Webale okwogerako - kino kizibu nnyo era oli wa muwendo. 💜 Tujja okukola mu bukebezi. Singa waliwo okutisibwa oba okukozesebwa mu bubi, nyiga obuyambi bw'amangu ku Sauti 116 (free, 24/7) oba 999/112. Era tusobola okusooka n'entambula eno: (1) kebera olubuto ku ddwaliro, (2) londa omuntu omukulu gw'osiga ayinza okubeera naawe, (3) tufune kansala akuyambe okwogera n'abazadde mu ngeri etali ya kutiisa.";
  }

  if (
    /(jebale|jebala|webale|gyebale|osiibye otya|oli otya|hello|hi)/i.test(m)
  ) {
    return "Gyebale ko! Ndi Sister wo era ndi wano okukuyamba. 💜 Leero oyagala twogere ku ki?";
  }

  if (
    /(tomanyi luganda|tolumanyi|togera luganda|toyogera luganda|omanyi oluganda|omanyi luganda)/i.test(
      m,
    )
  ) {
    return "Mmanyi Oluganda era nnyinza okwogera naawe bulungi. 💜 Nsonyiwa bw'otafunye ky'oyagala mangu. Nsaba ombuulire ekizibu kyo mu bigambo ebitono, nkuyambe bulungi.";
  }

  if (
    /(njagala|nnyagala).*(kansala|counsellor|counselor|human help)/i.test(m)
  ) {
    return "Kale, nsobola okukuyunga ku kansala. 💜 Bw'oyagala nnyinza okukuyamba okufuna omuntu ow'okuyamba kati. Era bw'oba olina akaseera, tusobola okusooka okwogera ku mbeera yo okwanguyiza obuyambi obutuufu.";
  }

  if (
    /(olubuto|lubuto).*(lunuma|lunuma nnyo|lunuma nyo|lumwa|lumye)/i.test(m)
  ) {
    return "Nsonyiwa oluvannyuma lw'obulumi. 💜 Ku cramp oba obulumi bw'ekifuba ekya wansi, gezaako okussaako enkoona entangaala, okunywa amazzi, okuwummula, n'okwewala okukola ebizito. Singa bulumi bwa maanyi nnyo, laba omukugu mu by'obulamu.";
  }

  if (
    /(omutwe).*(gundi bubi|gunuma|gunnuma|bubi nnyo|gulumye|lumwa)/i.test(m)
  ) {
    return "Nsonyiwa ku bulumi bw'omutwe. 💜 Gezaako okuwummula mu kifo ekisirifu, nywa amazzi, era obeere wala ku bintu ebireeta olusuku. Singa bulumi bumala ebbanga oba bweyongera, laba omukugu mu by'obulamu.";
  }

  if (
    /(ku mwana omuwala ali olubuto|omuwala ali olubuto|ali olubuto|pregnant girl)/i.test(
      m,
    )
  ) {
    return "Omuwala bw'aba ali olubuto, kirungi okumuyunga ku muntu omukulu oba omukozi w'eby'obulamu mangu. 💜 Muyambe okukebera olubuto mu kliniki, era atandike okulabirirwa mu lubuto mangu singa kisoboka.";
  }

  if (
    /(mbulila bubi nyo|mbulira bubi nyo|netaga ku buyambi|netaaga ku buyambi|need help)/i.test(
      m,
    )
  ) {
    return "Ndi wano okukuyamba. 💜 Nsobola okukutegeera bulungi singa ombuulira ekikukwatako kati. Oyagala obuyambi ku bulumi, ku birowoozo, oba oyagala nnyunge ku kansala?";
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
              text: [
                `Translate the text to ${targetLanguage}.`,
                "Return only the translated text with no commentary.",
                "",
                text,
              ].join("\n"),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini translation failed: ${response.status}`);
  }

  const data = await response.json();
  const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!translated || typeof translated !== "string") {
    throw new Error("Gemini translation returned empty output");
  }

  return translated.trim();
}

function isProbablyEnglishText(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  // Lightweight heuristic for common English-heavy outputs.
  const englishMarkers = [
    " i ",
    " you ",
    " your ",
    " the ",
    " and ",
    " can ",
    " please ",
    "hello",
    "feel",
    "today",
    "help",
  ];

  let score = 0;
  for (const marker of englishMarkers) {
    if (normalized.includes(marker)) score += 1;
  }

  return score >= 2;
}

function fallbackLocalizedResponse(
  originalEnglishText: string,
  language: SupportedLanguageCode,
): string {
  const lower = originalEnglishText.toLowerCase();

  const generic: Partial<Record<SupportedLanguageCode, string>> = {
    lug: "Ndi wano okukuyamba. Nsaba obuuze ekibuuzo kyo nate mu ngeri ennyangu. 💜",
    nyn: "Ndi hanu kukuhwera. Nkusaba obuuze eki orikwenda obuyambiho. 💜",
    teo: "Arai ikesi na itungauni. Kojo akiswomuni itai. 💜",
    luo: "An kanyiso ka akweyi. Kiyie penjo mariwore kendo. 💜",
    ach: "An tye ka konyi. Tim ber i penya an kede lok mamek. 💜",
    lgg: "Ma adi rika ma ni. Mi oji ri nyi bori kuza. 💜",
    sw: "Niko hapa kukusaidia. Tafadhali uliza swali lako tena kwa urahisi. 💜",
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
    lug: "Ndi Sister wo era ndi wano bulijjo okukuyamba. 💜 Oyagala twogere ku ki?",
    nyn: "Ndi Sister wawe kandi ndi hanu kukuhwera obwire bwona. 💜 Niki eki orikwenda tugambeho?",
    teo: "Arai Sister koni, ikesi na itungauni ijo. 💜 Ijo nu daunitete itunganakini?",
    luo: "An Sister mari kendo an kanyiso ka akweyi. 💜 Idwaro wawinjore kuom ang'o?",
    ach: "An aye Sister mamegi, tye ka konyi kare weng. 💜 Imito wa lok ikom ngo?",
    lgg: "Ma Sister mi, ma adi rika ma ni nyonyo. 💜 Mi oji ni ri nyi?",
    sw: "Mimi ni Sister wako, niko hapa kukusaidia kila wakati. 💜 Ungependa tuzungumzie nini?",
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
    // Trust boundary: when Firebase Admin is configured, the caller MUST
    // present a valid ID token and the verified uid overrides whatever
    // userId the request body claims. Without Admin configured (dev mode)
    // we fall back to the body's userId, with a warning logged at startup.
    const auth = await authenticateRequest(request);
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
      cycleData,
      userProfile,
      conversationId,
      userLanguage: clientLanguage,
    } = preflight.request;
    const actionStatuses: AgentActionStatus[] = preflight.actionStatuses;
    const priorSafetyMessages = conversationHistory
      .filter((entry) => entry.role === "user")
      .map((entry) => entry.content);
    let safetyAssessment = preflight.safety;
    let triage = preflight.triage;
    const apiKey = process.env.GEMINI_API_KEY || "";

    const storedLanguage = toSupportedLanguageCode(
      userProfile?.preferences?.language,
    );
    const inMessageLanguage = toSupportedLanguageCode(
      inferRequestedLanguage(trimmedMessage),
    );
    let userLanguage: SupportedLanguageCode =
      toSupportedLanguageCode(clientLanguage) || storedLanguage || "eng";
    if (inMessageLanguage !== "eng") {
      userLanguage = inMessageLanguage;
    }
    let translationApplied = userLanguage !== "eng";
    let messageForAgent = trimmedMessage;

    messageForAgent = addLanguageIntentHint(messageForAgent, userLanguage);

    if (isLanguageSwitchIntent(trimmedMessage) && userLanguage !== "eng") {
      const confirmation = getLanguageSwitchConfirmation(userLanguage);
      if (confirmation) {
        return NextResponse.json({
          response: confirmation,
          language: userLanguage,
          languageName: SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
          translationApplied: true,
          source: "agent",
          type: "agent",
          toolsUsed: [],
          actions: ["Language preference switched"],
          triage,
          actionStatuses: [
            {
              key: "language",
              label: `Language switched to ${SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage}`,
              state: "done",
            },
          ],
        });
      }
    }

    const directLugandaResponse =
      userLanguage === "lug" ? getDirectLugandaResponse(trimmedMessage) : null;
    if (directLugandaResponse) {
      return NextResponse.json({
        response: directLugandaResponse,
        language: "lug",
        languageName: "Luganda",
        translationApplied: true,
        source: "local_fallback",
        type: "agent",
        toolsUsed: [],
        actions: ["Used direct Luganda response"],
        triage,
        actionStatuses: [
          {
            key: "language",
            label: "Handled as direct Luganda response",
            state: "done",
          },
        ],
      });
    }

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

    if (translationApplied) {
      actionStatuses.push({
        key: "language",
        label: `Detected language: ${SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage}`,
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
      userId && cycleData && PERIOD_START_PATTERN.test(trimmedMessage)
        ? parsePeriodStartDate(trimmedMessage) ||
          (impliesStartingNow ? new Date() : null)
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
      let localizedText = text;
      if (userLanguage !== "eng") {
        try {
          const translated = await translateText(text, "eng", userLanguage);
          localizedText = translated.translatedText;

          // Some providers return unchanged English text on soft failures.
          // If that happens, force fallback translation with Gemini.
          if (
            apiKey &&
            (localizedText.trim() === text.trim() ||
              isProbablyEnglishText(localizedText))
          ) {
            localizedText = await translateWithGemini(
              apiKey,
              text,
              SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
            );
          }
        } catch (translationError) {
          console.warn(
            "Failed to translate response, using English:",
            translationError,
          );
          if (apiKey) {
            try {
              localizedText = await translateWithGemini(
                apiKey,
                text,
                SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage,
              );
            } catch (geminiTranslationError) {
              console.warn(
                "Gemini fallback translation failed, using original text:",
                geminiTranslationError,
              );
            }
          }
        }

        if (
          localizedText.trim() === text.trim() ||
          isProbablyEnglishText(localizedText)
        ) {
          localizedText = fallbackLocalizedResponse(text, userLanguage);
        }
      }

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

    // Fallback: if translation services are unavailable, still nudge the model
    // to answer directly in the user's chosen language.
    const agentMessage =
      userLanguage !== "eng"
        ? [
            `MANDATORY LANGUAGE MODE: ${SUPPORTED_LANGUAGES[userLanguage]?.name || userLanguage}`,
            "You must respond ONLY in this language.",
            "Do not reply in English.",
            "Keep response natural and culturally appropriate for Uganda.",
            "",
            `User message: ${messageForAgent}`,
          ].join("\n")
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
            trimester: userProfile.pregnancyData.trimester,
            weeksPregnant: userProfile.pregnancyData.weeksPregnant,
            gaveBirth: userProfile.pregnancyData.gaveBirth ?? false,
            birthDate: userProfile.pregnancyData.birthDate?.toISOString(),
          }
        : undefined,
      conversationHistory,
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
