import { NextRequest, NextResponse } from "next/server";

// System prompt for SisterCare AI assistant
const SYSTEM_PROMPT = `You are "Sister", a compassionate and knowledgeable AI support assistant for SisterCare, a digital platform for women's well-being, guidance, and menstrual health. This app is primarily designed for users in Uganda.

Your role is to:
1. Provide emotional support with empathy, warmth, and understanding
2. Answer questions about menstrual health, cycles, and related topics
3. Offer practical tips for managing periods, PMS symptoms, and emotional well-being
4. Guide users on when to seek professional medical help
5. Create a safe, non-judgmental space for sensitive discussions
6. Listen actively when users want to share something - don't redirect them, let them speak
7. CRITICAL: If someone mentions abuse, violence, self-harm, or danger - take it seriously and provide Uganda crisis resources

Guidelines:
- Always be warm, supportive, and encouraging
- Use inclusive and respectful language
- Provide accurate, evidence-based health information
- Never diagnose medical conditions
- Keep responses helpful and conversational (2-4 paragraphs max)
- Use emojis sparingly (💜, 🌸, ✨)
- When someone wants to share or talk, LISTEN first - ask them to tell you more
- Be a supportive friend, not just an information bot

UGANDA CONTEXT (IMPORTANT):
- Users are primarily in Uganda
- For emergencies, reference Uganda Police: 999 or 112
- For abuse/child protection, reference Sauti 116 Helpline (toll-free 24/7)
- For women's legal support, reference FIDA Uganda: 0414 530 848
- Reference local support like LC1 chairpersons, churches, mosques as safe places
- Be culturally sensitive to Ugandan context

FORMATTING RULES (VERY IMPORTANT):
- DO NOT use markdown formatting like ** for bold, * for italics, or # for headers
- DO NOT use bullet points with • or - or *
- Write in natural flowing paragraphs like a conversation
- Use line breaks to separate ideas
- Lists should be written as numbered sentences or comma-separated items
- Keep formatting clean and simple like a text message or chat`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // FIRST: Check for crisis/safety situations - these get priority
    const crisisResponse = checkForCrisis(message);
    if (crisisResponse) {
      return NextResponse.json({ response: crisisResponse, source: "safety" });
    }

    // Try Gemini API with correct model names
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== "") {
      try {
        const response = await callGeminiAPI(
          apiKey,
          message,
          conversationHistory,
        );
        if (response) {
          // Clean markdown from AI response
          const cleanedResponse = cleanMarkdown(response);
          return NextResponse.json({ response: cleanedResponse, source: "ai" });
        }
      } catch (apiError) {
        console.error("Gemini API error:", apiError);
        // Fall through to intelligent response
      }
    }

    // Use intelligent fallback
    const response = generateSmartResponse(message);
    return NextResponse.json({ response, source: "fallback" });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Clean markdown formatting from AI responses
function cleanMarkdown(text: string): string {
  return (
    text
      // Remove bold markers **text** or __text__
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      // Remove italic markers *text* or _text_
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Remove headers # ## ### etc
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bullet points with * or -
      .replace(/^\s*[\*\-]\s+/gm, "")
      // Remove numbered list formatting but keep the text
      .replace(/^\s*\d+\.\s+/gm, "")
      // Remove inline code backticks
      .replace(/`([^`]+)`/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Clean up extra whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// Check for crisis situations that need immediate attention
function checkForCrisis(message: string): string | null {
  const m = message.toLowerCase();

  // Abuse detection - check for abuse words + family/relationship words
  if (
    /(abusive|abuse|abusing|abused|hit me|hits me|beats me|beating me|violent|violence|hurt me|hurting me|molest|molesting|assault|assaulting|rape|raped|raping|touched me|touching me inappropriately|inappropriate touch|mistreat|mistreating)/.test(
      m,
    ) &&
    /(parent|father|mother|dad|mom|uncle|aunt|brother|sister|family|relative|step|stepfather|stepmother|stepdad|stepmom|guardian|boyfriend|partner|husband|wife|grandpa|grandma|grandfather|grandmother|cousin|neighbor|teacher|coach|boss)/.test(
      m,
    )
  ) {
    return `I'm so sorry you're going through this. What you're describing is serious, and I want you to know that it is NOT your fault. You deserve to be safe. 💜

Immediate help is available in Uganda:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7) - Uganda's National Child and Family Helpline
📞 Uganda Police Emergency: 999 or 112
📞 Child and Family Protection Unit (CFPU): Visit your nearest police station
🌐 Report online: sauti.mglsd.go.ug/sauti/report

What you can do: Tell a trusted adult like a teacher, LC1 chairperson, religious leader, or relative. Go to the nearest police station and ask for the Child and Family Protection Unit. Go to a safe place like a neighbor, church, or mosque if you can.

Please remember: You are brave for speaking up. This is not your fault. Help is available 24/7 in Uganda. You don't have to face this alone.

Would you like me to help you think through your options for getting help safely?`;
  }

  // Self-harm/suicide detection
  if (
    /(kill myself|want to die|suicide|suicidal|end my life|self.?harm|cutting myself|hurt myself|don't want to live|no reason to live)/.test(
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

  // Sexual harassment/assault
  if (
    /(sexual.?harass|harassing me|stalking|stalker|sending me nudes|asking for nudes|creepy messages|inappropriate messages|touched without consent)/.test(
      m,
    )
  ) {
    return `I'm sorry this is happening to you. What you're describing is not okay, and it's not your fault. 💜

Get help now in Uganda:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7)
📞 Uganda Police Emergency: 999 or 112
📞 FIDA Uganda (Women Lawyers): 0414 530 848 - Free legal support for women
🌐 Report online: sauti.mglsd.go.ug/sauti/report

Important steps you can take: Document or screenshot any messages for evidence. Tell a trusted adult or friend. Block the person if it's safe to do so. Report to the police Child and Family Protection Unit or your LC1.

You deserve to feel safe. Would you like to talk more about what's happening?`;
  }

  // General danger
  if (
    /(in danger|not safe|scared for my life|someone is going to hurt me|threatened me|threatening)/.test(
      m,
    )
  ) {
    return `Your safety is the top priority. I hear that you're scared, and I want to help. 💜

If you're in immediate danger in Uganda, call the police right away:

📞 Uganda Police Emergency: 999 or 112
📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7)
📞 Your nearest police station - Ask for the Child and Family Protection Unit

You can also go to a safe place like a trusted neighbor's home, church, mosque, or LC1 office.

Can you tell me more about the situation? Is there somewhere safe you can go right now?`;
  }

  // General abuse mention without specifying who
  if (
    /(abusive|abuse|abusing|abused|being beaten|someone hits me|being hurt|mistreat|mistreating|hurts me|beating me)/.test(
      m,
    )
  ) {
    return `I'm really concerned about what you've shared. You don't deserve to be treated this way. 💜

Please know: This is NOT your fault. You deserve to be safe. Help is available in Uganda.

Resources:

📞 Sauti 116 Helpline: Call 116 (toll-free, 24/7)
📞 Uganda Police Emergency: 999 or 112
📞 FIDA Uganda (Women Lawyers): 0414 530 848
🌐 Report online: sauti.mglsd.go.ug/sauti/report

Would you feel comfortable sharing more about what's happening? I want to make sure you get the right help.`;
  }

  return null; // No crisis detected
}

async function callGeminiAPI(
  apiKey: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<string> {
  // Use current Gemini models (Feb 2026) - lite has better quota limits for free tier
  const models = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // Build conversation contents
      const contents = [
        ...conversationHistory.slice(-6).map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
        { role: "user", parts: [{ text: message }] },
      ];

      const requestBody = {
        contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH",
          },
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

      console.log(`Trying model: ${model}`);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Model ${model} failed: ${response.status} - ${errorText}`);
        // If rate limited, model not found, or permission denied (leaked key), try next model
        if (response.status === 429 || response.status === 404 || response.status === 403) {
          continue;
        }
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Check for valid response
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`Model ${model} succeeded!`);
        return data.candidates[0].content.parts[0].text;
      }

      // Check if blocked by safety
      if (data.candidates?.[0]?.finishReason === "SAFETY") {
        console.log(`Model ${model} blocked by safety filter`);
        continue;
      }

      console.log(`Model ${model} returned no content`);
    } catch (err) {
      console.log(`Model ${model} error:`, err);
      continue;
    }
  }

  throw new Error("All Gemini models failed");
}

// Intelligent response generator - handles natural conversation
function generateSmartResponse(message: string): string {
  const m = message.toLowerCase().trim();

  // IDENTITY QUESTIONS - Handle questions about Sister first
  if (/(who (created|made|built|developed)|who's your (creator|developer|maker))/.test(m) || 
      /(created you|made you|built you|developed you)/.test(m)) {
    return `I was created by the SisterCare team! 💜

SisterCare is a digital platform dedicated to supporting women's well-being, menstrual health, and emotional wellness - especially for women and girls in Uganda.

I'm here to be your supportive companion, answering questions, providing guidance, and offering a safe space to talk. Is there something I can help you with today? 🌸`;
  }

  // What AI model / technology questions
  if (/(what (ai|model|technology)|which (ai|model)|are you (ai|chatbot|robot|bot)|what are you (made|built|powered))/.test(m) ||
      /(are you real|are you human|are you a person)/.test(m)) {
    return `I'm Sister, an AI-powered support companion! 💜

I'm designed specifically for SisterCare to help with menstrual health questions, emotional support, and wellness guidance. While I'm not human, I'm here to listen without judgment and provide helpful, caring support.

Think of me as a knowledgeable friend who's always available when you need to talk. What's on your mind? 🌸`;
  }

  // CONVERSATIONAL RESPONSES - Handle natural dialog first

  // Someone wants to share/talk about something
  if (
    /(something|something's|somethings) (on my|in my|bothering|troubling|weighing)/.test(
      m,
    ) ||
    /(i have|i've got|there's|theres) something (to share|to tell|on my heart|on my mind|deep|heavy|important)/.test(
      m,
    ) ||
    /(need to|want to|have to) (talk|share|tell|vent|get .* off my chest)/.test(
      m,
    ) ||
    /can i (talk|share|tell|confide|open up)/.test(m)
  ) {
    return `Of course, I'm here for you. 💜 Take your time - this is a safe space, and I'm listening.

What's on your heart? You can share as much or as little as you're comfortable with. I'm not going anywhere.`;
  }

  // Asking to be listened to / heard
  if (
    /(hear me|listen to me|let me (talk|speak|share|explain)|first hear|you first hear|just listen)/.test(
      m,
    ) ||
    /(you are supposed to|you should|you need to) (advise|help|listen|support)/.test(
      m,
    )
  ) {
    return `You're absolutely right, and I'm sorry if I seemed rushed. 💜 

I'm here to listen to YOU. Please, go ahead and share what's on your mind. I want to understand what you're going through before offering any advice. Take all the time you need.`;
  }

  // User wants to chat/talk (simple request)
  if (/^(i want to chat|let's chat|wanna chat|can we chat|want to talk|wanna talk|let's talk)$/i.test(m) || 
      /^(i want to|let's|can we) (chat|talk|have a conversation)/i.test(m)) {
    return `I'd love to chat with you! 💜 I'm all ears.

What's on your mind today? You can tell me about your day, share something that's been bothering you, ask questions about health or periods, or just vent - I'm here for all of it.

So, what would you like to talk about? 🌸`;
  }

  // User says that's not what they asked / wrong answer
  if (/(didn't ask|didnt ask|not what i asked|not what i said|that's not|thats not|wrong answer|wrong response|i asked about|i was asking|that wasn't|that wasnt|off topic)/.test(m)) {
    return `I'm so sorry for the confusion! 💜 Let me listen more carefully.

Please tell me again what you'd like to know or talk about, and I'll focus on exactly that. I want to give you the right answer this time.

What was your question? 🌸`;
  }

  // User expresses frustration with responses
  if (/(not helpful|not helping|useless|don't understand|same response|real answer|hardcoded|hard coded|repetitive|not working|you're broken|broken|just repeating)/.test(m)) {
    return `I hear your frustration, and I'm truly sorry. 💜 Let me try harder.

Please tell me exactly what's going on - describe your situation in detail and I'll give you my best, most specific guidance.

For example: Are you having pain? Where is it and how severe? Is it about your period - when was your last one? Are you worried about pregnancy or something else? Do you need emotional support about something specific?

The more details you share, the better I can help you. I'm really listening. 🌸`;
  }

  // Greetings with emotional context
  if (
    /^(hi+|hello|hey+)/.test(m) &&
    (/(today|feeling|day|doing)/.test(m) || m.length < 20)
  ) {
    const greetings = [
      "Hello, sister! 💜 I'm here for you. How are you feeling today? Whether you want to chat, ask questions, or just need someone to listen - I'm here.",
      "Hey there! 💜 Welcome. How's your day going? I'm here to support you with whatever's on your mind.",
      "Hi! 🌸 It's good to see you. How are you doing? I'm here to listen, answer questions, or just chat.",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Basic greetings
  if (
    /^(hi+|hello|hey+|good\s*(morning|afternoon|evening)|howdy|hiya|greetings)$/i.test(
      m,
    )
  ) {
    const greetings = [
      "Hello, sister! 💜 I'm so glad you're here. How can I support you today? I'm here to listen, answer questions, or just chat.",
      "Hey there! 💜 Welcome! I'm Sister, your supportive companion. What brings you here today?",
      "Hi! 🌸 It's lovely to connect with you. How are you doing? I'm here for whatever you need.",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // TOPIC-BASED RESPONSES

  // Generic pain relief / guidance requests (catch-all)
  if (
    /(relieve|relief|reduce|ease|help.*pain|guidance.*pain|deal.*pain|manage.*pain|stop.*pain)/.test(m) ||
    /(the pain|my pain|this pain)/.test(m) && /(help|relieve|stop|manage|reduce|ease|guidance)/.test(m)
  ) {
    return `How to relieve menstrual pain 💜

For immediate relief: Try a heating pad on your abdomen (it's as effective as ibuprofen!). Pain relievers like ibuprofen or naproxen work best when taken early. A warm bath can also help relax your muscles.

Natural remedies include ginger tea which is anti-inflammatory, gentle yoga poses like child's pose and cat-cow, and light walking which releases endorphins. Chamomile tea and staying hydrated also help.

For long-term relief: Regular exercise helps a lot. Try to reduce salt, caffeine, and alcohol before your period. Magnesium supplements can also make a difference.

Other tips: Rest when you need to - your body is working hard. Apply a warm compress for 15-20 minutes at a time. Avoid tight clothing around your waist.

See a doctor if your pain is severe, sudden, or different from usual. You deserve to feel better! 🌸`;
  }

  // Menstruation/cleaning/hygiene
  if (
    /(clean|wash|hygiene|hygienic|sanit|shower|bath)/.test(m) &&
    /(period|menstrua|during|while|my self|myself)/.test(m)
  ) {
    return `Staying clean during your period 💜

Great question! Here's how to maintain good hygiene during menstruation:

For daily care: Shower or bathe daily (warm water is fine!). Use mild, unscented soap on external areas only. Always wash front to back to prevent infections. Change your underwear daily or more if needed.

For period products: Change pads every 4-6 hours, tampons every 4-8 hours (never longer!), and empty menstrual cups every 8-12 hours. Always wash your hands before and after changing products.

Some important tips: Your vagina is self-cleaning so don't douche. Avoid scented products near intimate areas. Wear breathable cotton underwear. It's normal to have a mild smell, and that's okay!

After using the bathroom, always wipe front to back, and consider using unscented wipes for extra freshness.

Is there anything specific about period hygiene you'd like to know more about? 🌸`;
  }

  // Cramps - enhanced pattern matching
  if (
    /(cramp|cramping|pain.*(abdomen|stomach|belly|lower)|stomach.*hurt|belly.*ache|lower.*pain)/.test(
      m,
    ) ||
    /(terrible|bad|severe|awful|horrible|intense)\s*(cramp|pain)/.test(m) ||
    /cramp/.test(m)
  ) {
    if (/(what is|what are|what's|define|explain|meaning)/.test(m)) {
      return `What are menstrual cramps? 💜

Menstrual cramps (dysmenorrhea) are throbbing or cramping pains in your lower abdomen that occur before and during your period. They're super common!

The science: Your uterus contracts to shed its lining, triggered by hormone-like chemicals called prostaglandins. Higher levels mean stronger cramps.

There are two types: Primary dysmenorrhea is the common period cramps with no underlying condition. Secondary dysmenorrhea is caused by conditions like endometriosis.

Most cramps are normal, but if yours are severe, talk to a doctor. Want tips on relieving them? 🌸`;
    }

    if (/(why|cause|reason|what causes|what makes)/.test(m)) {
      return `What causes menstrual cramps? 💜

The main culprit is prostaglandins, which are hormone-like chemicals your body makes.

Here's how it works: First, prostaglandin levels rise before your period. Then they trigger uterine contractions. These contractions briefly cut off oxygen, and this causes the cramping pain.

Some people have worse cramps due to higher prostaglandin production, starting periods young (before 11), heavy or irregular periods, never being pregnant, or stress and smoking.

Cramps often improve with age! If yours are severe, a doctor can help. 🌸`;
    }

    if (
      /(how to|how can|how do|relieve|reduce|stop|help|manage|deal|rid|ease)/.test(
        m,
      )
    ) {
      return `How to relieve menstrual cramps 💜

For immediate relief: Try a heating pad on your abdomen (it's as effective as ibuprofen!). Pain relievers like ibuprofen or naproxen work best when taken early. A warm bath can also help relax your muscles.

Natural remedies include ginger tea which is anti-inflammatory, gentle yoga poses like child's pose and cat-cow, and light walking which releases endorphins.

For long-term relief: Regular exercise helps a lot. Try to reduce salt, caffeine, and alcohol before your period. Magnesium supplements can also make a difference.

See a doctor if your cramps are severe or if there's a sudden change! 🌸`;
    }

    // Default cramps response
    return `Cramps are super common, and I can help! 💜

I can explain what cramps are and the biology behind them, why they happen and the causes, or how to relieve them with proven methods.

What would you like to know? 🌸`;
  }

  // Period-related
  if (/(period|menstrua|bleeding|flow|spotting|time of.*month)/.test(m)) {
    if (/(late|missed|irregular|skip|haven't)/.test(m)) {
      return `Late or missed period? 💜

Don't panic - many things can cause this!

Common causes include stress which can significantly delay ovulation, weight changes that affect hormones, intense exercise that can disrupt cycles, illness, changes from starting or stopping birth control, and pregnancy if you're sexually active.

You should see a doctor if your period is 3+ months late and you're not pregnant, if it's suddenly very irregular, or if severe pain accompanies it.

Cycles of 21-35 days are normal! Want more specific guidance? 🌸`;
    }

    if (/(heavy|clot|flooding|too much)/.test(m)) {
      return `Heavy periods 💜

You're not alone - heavy bleeding is common.

Signs of heavy bleeding include soaking through a pad or tampon in 1-2 hours, needing to change at night, clots larger than a quarter, periods lasting 7+ days, and feeling tired or weak.

What helps: Ibuprofen can reduce flow by 25-30%. Menstrual cups hold more than pads or tampons. Eating iron-rich foods helps with energy.

See a doctor if this is new or worsening, you feel dizzy or exhausted, or it disrupts your daily life.

Heavy periods have treatable causes! 🌸`;
    }

    return `I'm here to help with period questions! 💜

Some period basics: They typically come every 21-35 days, usually last 3-7 days, and flow varies from person to person.

I can help with late or missed periods, heavy bleeding, first period info, and products and hygiene.

What's your question? 🌸`;
  }

  // Pregnancy concerns
  if (/(pregnant|pregnancy|think i'm pregnant|might be pregnant|could be pregnant|missed period.*pregnant|no period.*pregnant)/.test(m)) {
    return `I hear you, and this must be a lot to process. 💜 I'm here for you.

First, take a breath. A missed period doesn't always mean pregnancy - stress, illness, weight changes, and hormonal shifts can all cause it.

If you think you might be pregnant: The most reliable way to know is a pregnancy test. They're most accurate from the first day of your missed period. You can get tests at pharmacies or health centers.

Early signs of pregnancy can include a missed period, nausea or vomiting (morning sickness), tender or swollen breasts, fatigue, and frequent urination.

If you're in Uganda and need support: Marie Stopes Uganda offers confidential services (0800 100 110, toll-free). Your local health center can also help with testing and guidance.

Whatever your situation, you deserve support without judgment. Would you like to talk more about what you're going through? 🌸`;
  }

  // Talking to parents/adults about periods or health
  if (/(tell|talk|report|share|speak).*(mum|mom|mother|parent|dad|father|family|adult|teacher)/.test(m) || /(how do i tell|how to tell|should i tell).*/.test(m)) {
    return `Talking to a trusted adult 💜

It's brave of you to want to share! Having support makes things easier.

Tips for starting the conversation: Choose a quiet, private moment. You can say something like "I need to talk about something important" or "I'm feeling worried about my health and need your help."

If it's about your period: Remember this is natural and nothing to be embarrassed about. You could say "I've been having some period symptoms and need some advice."

If it's about pregnancy concerns: This is harder, but you deserve support. Consider writing it down first if speaking feels too hard. You could say "I'm worried about something health-related and I need your help."

If you don't feel safe talking to parents: Consider a school counselor, auntie, older sister, trusted teacher, or health worker at a local clinic.

You don't have to face anything alone. 🌸`;
  }

  // Mood/emotions/PMS
  if (
    /(mood|emotion|sad|cry|anxious|anxiety|stress|depress|angry|irritable|pms|pmdd|feeling)/.test(
      m,
    )
  ) {
    if (/(pms|pmdd|premenstrual|before period)/.test(m)) {
      return `Understanding PMS 💜

PMS affects up to 75% of menstruating people - you're not alone!

Common symptoms appear 1-2 weeks before your period and include mood swings, irritability, anxiety, sadness, food cravings, bloating, fatigue, and trouble sleeping.

What helps: Reduce salt, caffeine, and sugar. Try calcium, magnesium, or B6 supplements. Exercise helps, even just walking. And prioritize getting enough sleep.

If symptoms severely disrupt your life, talk to a doctor about PMDD. Your feelings are real! 🌸`;
    }

    if (/(anxious|anxiety|worried|panic|nervous)/.test(m)) {
      return `Feeling anxious? 💜

Your feelings are valid. Hormones can definitely increase anxiety.

Try Box Breathing for quick relief: Inhale for 4 counts, hold for 4 counts, exhale for 4 counts, hold for 4 counts. Repeat this 4 times.

You can also try 5-4-3-2-1 Grounding: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste.

Other tips: Splash cold water on your face, go for a short walk, limit caffeine, or talk to someone you trust.

If anxiety is frequent, consider talking to a professional. You don't have to manage alone! 🌸`;
    }

    if (/(sad|crying|depressed|hopeless|down|low)/.test(m)) {
      return `I hear you, and I'm sorry you're feeling this way. 💜

Some gentle reminders: Crying is healthy. Hormones can intensify emotions. These feelings are temporary. And you're not alone.

Things that might help: Get some sunlight or fresh air. Listen to comforting music. Reach out to someone you trust. Journal your thoughts. Take a warm bath or shower.

Please seek support if sadness lasts 2+ weeks, if you have thoughts of hurting yourself, or if daily activities feel impossible.

You matter. Want to talk more about what's going on? 🌸`;
    }

    return `Emotions and your cycle are deeply connected. 💜

I can help with PMS symptoms and management, anxiety relief techniques, understanding mood swings, and coping strategies for feeling sad.

What's going on for you? I'm here to listen. 🌸`;
  }

  // Thanks
  if (/thank|thanks|thx|appreciate|helpful/i.test(m)) {
    return "You're so welcome! 💜 I'm always here when you need support, information, or just someone to talk to. Is there anything else I can help with? 🌸";
  }

  // How are you
  if (/how are you|how're you|how r u|hru/i.test(m)) {
    return "I'm doing well, thank you for asking! 💜 But more importantly, how are YOU feeling? Is there something specific on your mind today?";
  }

  // Goodbye
  if (/bye|goodbye|see you|take care|gotta go|leaving/i.test(m)) {
    return "Take care of yourself, sister! 💜 Remember, I'm here whenever you need support. Wishing you wellness and peace! 🌸";
  }

  // What can you do / Help
  if (
    /what can you|help me|what do you do|who are you|your purpose|what are you/i.test(
      m,
    )
  ) {
    return `I'm Sister, your supportive AI companion at SisterCare! 💜

I can help with:

🌸 Menstrual Health - understanding your cycle, period symptoms and what's normal, hygiene and product questions.

💜 Symptom Support - cramp relief strategies, PMS and mood management, sleep and energy tips.

🌿 Wellness Guidance - nutrition advice, self-care practices, knowing when to see a doctor.

✨ Emotional Support - a safe space to share, someone to listen, and coping strategies.

What would you like to talk about? 🌸`;
  }

  // Food/nutrition/cravings - use word boundaries to avoid matching "created" etc.
  if (/(\bfood\b|\beat\b|\beating\b|\bdiet\b|\bnutrition\b|\bcraving\b|\bhungry\b|\bchocolate\b|\bsnack\b)/.test(m)) {
    if (/(craving|chocolate|want to eat)/.test(m)) {
      return `Period cravings are real! 💜

Why they happen: Serotonin drops before your period, and carbs or sugar temporarily boost your mood. Your metabolism actually increases too!

Smart ways to satisfy cravings: Try dark chocolate (70%+) which has magnesium, a banana with almond butter, trail mix with dark chocolate, or Greek yogurt with berries.

Don't deprive yourself - enjoy mindfully! 🌸`;
    }

    return `Best foods during your period 💜

Foods to embrace: Iron-rich foods like spinach, beans, and red meat. Omega-3s from salmon and walnuts. Potassium from bananas and avocados. Magnesium from dark chocolate and nuts. And of course, stay hydrated with plenty of water!

Foods to limit: Excess salt causes bloating, caffeine worsens cramps, and alcohol disrupts sleep.

Small changes make a big difference! 🌸`;
  }

  // Sleep/fatigue
  if (/(sleep|tired|fatigue|exhaust|insomnia|energy|rest)/.test(m)) {
    if (/(can't sleep|insomnia|trouble sleeping)/.test(m)) {
      return `Sleep struggles during your period? 💜

Why it happens: Hormone drops affect sleep chemicals, your body temperature fluctuates, and pain or discomfort can keep you awake.

Tips: Keep your room cool (65-68°F). Avoid screens 1 hour before bed. Sleep on your side with a pillow between your knees. No caffeine after 2pm. Try magnesium before bed.

Sweet dreams! 🌸`;
    }

    return `Feeling exhausted? 💜

Why period fatigue happens: Iron loss from bleeding, hormone fluctuations, and poor sleep quality all play a role.

Energy boosters: Eat iron-rich foods, stay hydrated, try gentle movement, get some sunlight, and rest without guilt!

If extreme fatigue happens every month, check your iron levels with a doctor. 🌸`;
  }

  // DEFAULT CONVERSATIONAL RESPONSE
  // For anything else, be a supportive listener
  return `I'm here for you. 💜

I'd love to help! Could you tell me a bit more about what's on your mind?

I can support you with health questions about periods, cycles, and symptoms. I'm here to listen and provide emotional support. I can share wellness tips on self-care, nutrition, and sleep. And I can help you find resources when you need more help.

What would you like to talk about? 🌸`;
}
