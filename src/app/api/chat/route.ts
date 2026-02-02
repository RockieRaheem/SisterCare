import { NextRequest, NextResponse } from "next/server";

// System prompt for SisterCare AI assistant
const SYSTEM_PROMPT = `You are "Sister", a compassionate and knowledgeable AI support assistant for SisterCare, a digital platform for women's well-being, guidance, and menstrual health.

Your role is to:
1. Provide emotional support with empathy, warmth, and understanding
2. Answer questions about menstrual health, cycles, and related topics
3. Offer practical tips for managing periods, PMS symptoms, and emotional well-being
4. Guide users on when to seek professional medical help
5. Create a safe, non-judgmental space for sensitive discussions

Guidelines:
- Always be warm, supportive, and encouraging
- Use inclusive and respectful language
- Acknowledge feelings and validate emotions
- Provide accurate, evidence-based health information
- Never diagnose medical conditions or prescribe treatments
- Encourage professional medical consultation when appropriate
- Maintain confidentiality and respect privacy
- Be culturally sensitive and aware
- Keep responses concise but helpful (2-4 paragraphs max)
- Use emojis sparingly to add warmth (💜, 🌸, ✨)

Topics you can help with:
- Menstrual cycle phases and what to expect
- Managing period pain and cramps naturally
- PMS symptoms and coping strategies
- Emotional well-being and mood changes
- Self-care tips and relaxation techniques
- Hygiene and product recommendations
- When to see a doctor
- Nutrition and exercise during menstruation
- Sleep and rest advice
- Stress management

Remember: You are not a replacement for medical professionals. Always encourage users to consult healthcare providers for medical concerns.`;

// Fallback responses when AI is not available
const FALLBACK_RESPONSES = [
  "I understand how you're feeling, and your feelings are completely valid. Remember, it's okay to take things one step at a time. Would you like me to share some tips that might help? 💜",
  "Thank you for sharing that with me. Many sisters experience similar feelings, and you're not alone in this. Let me share some gentle suggestions that might help you feel better.",
  "I hear you, and I want you to know that what you're experiencing is normal. Self-care is so important during this time. Would you like some practical tips for managing this?",
  "That's a great question! Understanding your body is empowering. Let me share some helpful information about that topic.",
  "I'm here to support you through this. Remember, your well-being matters, and taking care of yourself is not selfish—it's necessary. 🌸",
];

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

    // Check if we have a Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      // Use Google Gemini API
      try {
        const response = await callGeminiAPI(
          apiKey,
          message,
          conversationHistory,
        );
        return NextResponse.json({ response, source: "ai" });
      } catch (apiError) {
        console.error("Gemini API error:", apiError);
        // Fall back to intelligent responses
      }
    }

    // Use intelligent fallback responses
    const response = generateIntelligentResponse(message);
    return NextResponse.json({ response, source: "fallback" });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function callGeminiAPI(
  apiKey: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Build conversation context
  const contents = [
    {
      role: "user",
      parts: [{ text: SYSTEM_PROMPT }],
    },
    {
      role: "model",
      parts: [
        {
          text: "I understand. I'm Sister, your compassionate AI support assistant at SisterCare. I'm here to provide emotional support, answer questions about menstrual health, and create a safe space for you. How can I help you today? 💜",
        },
      ],
    },
    ...conversationHistory.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
    {
      role: "user",
      parts: [{ text: message }],
    },
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error("Invalid response format from Gemini API");
}

function generateIntelligentResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  // Cramps and pain
  if (
    lowerMessage.includes("cramp") ||
    lowerMessage.includes("pain") ||
    lowerMessage.includes("hurt")
  ) {
    return `I'm sorry you're experiencing discomfort. Period cramps can be really challenging! Here are some natural remedies that might help:

🌡️ **Heat therapy**: A heating pad or warm water bottle on your lower abdomen can relax the muscles
💧 **Stay hydrated**: Drink plenty of water and warm herbal teas like chamomile or ginger
🧘 **Gentle movement**: Light stretching or a short walk can help improve blood flow
🛁 **Warm bath**: Adding Epsom salts can provide extra relief

If your pain is severe or disrupting your daily life, please consider consulting a healthcare provider. You deserve to feel comfortable! 💜`;
  }

  // Anxiety or stress
  if (
    lowerMessage.includes("anxious") ||
    lowerMessage.includes("anxiety") ||
    lowerMessage.includes("stress") ||
    lowerMessage.includes("worried")
  ) {
    return `It's completely normal to feel anxious, especially around your cycle when hormones fluctuate. Your feelings are valid! 💜

Here are some grounding techniques that might help:

🌬️ **Deep breathing**: Try the 4-7-8 technique - inhale for 4 counts, hold for 7, exhale for 8
✍️ **Journaling**: Write down your thoughts to process your feelings
🎵 **Calming music**: Listen to soothing sounds or nature music
🌿 **Take a break**: Step away from stressors and do something you enjoy

Remember, it's okay to not be okay sometimes. If anxiety persists, talking to a counselor can provide additional support. You're doing great by reaching out! 🌸`;
  }

  // Sleep
  if (
    lowerMessage.includes("sleep") ||
    lowerMessage.includes("tired") ||
    lowerMessage.includes("insomnia") ||
    lowerMessage.includes("rest")
  ) {
    return `Getting quality sleep can be extra challenging during your cycle. Here are some tips to help you rest better:

🌙 **Create a routine**: Go to bed and wake up at the same time daily
📱 **Limit screens**: Put away devices 1 hour before bed
🍵 **Warm drink**: Chamomile tea or warm milk can help you relax
🛏️ **Comfortable position**: Try sleeping on your side with a pillow between your knees
🌡️ **Cool room**: Keep your bedroom slightly cool for better sleep

If you're on your period, keeping a heating pad nearby and wearing comfortable clothing can also help. Sweet dreams, sister! ✨`;
  }

  // Mood changes
  if (
    lowerMessage.includes("mood") ||
    lowerMessage.includes("emotional") ||
    lowerMessage.includes("sad") ||
    lowerMessage.includes("crying")
  ) {
    return `Mood changes during your cycle are so common, and what you're feeling is completely valid. Hormonal fluctuations can really affect how we feel! 💜

Here's what might help:

🎨 **Express yourself**: Creative activities like drawing, writing, or music can help process emotions
🤗 **Connect**: Talk to a friend or family member who understands
🚶 **Move gently**: Even a short walk can boost mood-lifting endorphins
🍫 **Dark chocolate**: A small piece can actually help (and tastes great!)
📝 **Track patterns**: Notice if certain days in your cycle affect your mood more

Be gentle with yourself during this time. Your emotions are real and temporary. You've got this! 🌸`;
  }

  // Cycle or period questions
  if (
    lowerMessage.includes("cycle") ||
    lowerMessage.includes("period") ||
    lowerMessage.includes("menstrual")
  ) {
    return `Understanding your cycle is empowering! The menstrual cycle typically has four phases:

📅 **Menstrual Phase (Days 1-5)**: Your period - focus on rest and self-care
🌱 **Follicular Phase (Days 6-13)**: Energy increases - great for new projects
🌟 **Ovulation (Days 14-16)**: Peak energy and fertility
🌙 **Luteal Phase (Days 17-28)**: Winding down - practice extra self-compassion

Cycles can range from 21-35 days and still be considered normal. Every body is unique! If you have specific questions about your cycle, I'm here to help. 💜`;
  }

  // Greetings
  if (
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hey") ||
    lowerMessage.match(/^(good\s)?(morning|afternoon|evening)/)
  ) {
    return `Hello, sister! 💜 I'm so glad you're here. How are you feeling today? Whether you have questions about your health, need someone to listen, or just want to chat, I'm here for you. What's on your mind?`;
  }

  // Thank you
  if (lowerMessage.includes("thank") || lowerMessage.includes("thanks")) {
    return `You're so welcome! 💜 I'm always here whenever you need support, information, or just someone to talk to. Taking care of yourself is important, and reaching out is a wonderful first step. Is there anything else I can help you with today? 🌸`;
  }

  // Default response
  return FALLBACK_RESPONSES[
    Math.floor(Math.random() * FALLBACK_RESPONSES.length)
  ];
}
