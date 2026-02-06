import { NextResponse } from "next/server";

// Health check endpoint to verify API configuration
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  // Test the Gemini API if key exists
  let apiStatus = "not_configured";
  let apiError = null;

  if (apiKey && apiKey.trim() !== "") {
    try {
      // Make a simple test call to verify the API key works
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Say hello" }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      if (response.ok) {
        apiStatus = "working";
      } else {
        const errorData = await response.text();
        apiStatus = "error";
        apiError = `Status ${response.status}: ${errorData.substring(0, 200)}`;
      }
    } catch (err) {
      apiStatus = "error";
      apiError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    geminiApi: {
      configured: !!apiKey && apiKey.trim() !== "",
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey ? apiKey.substring(0, 8) + "..." : null,
      status: apiStatus,
      error: apiError,
    },
  });
}
