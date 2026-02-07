import { NextResponse } from "next/server";

// Health check endpoint to verify API configuration
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  // Test the Gemini API if key exists
  let apiStatus = "not_configured";
  let apiError = null;
  let workingModel = null;

  if (apiKey && apiKey.trim() !== "") {
    // Try multiple models to find one that works
    const testModels = [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    for (const model of testModels) {
      try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(testUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Hi" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        });

        if (response.ok) {
          apiStatus = "working";
          workingModel = model;
          break;
        } else {
          const errorData = await response.text();
          apiError = `${model}: Status ${response.status} - ${errorData.substring(0, 100)}`;
        }
      } catch (err) {
        apiError = err instanceof Error ? err.message : "Unknown error";
      }
    }

    if (apiStatus !== "working") {
      apiStatus = "error";
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
      workingModel,
      error: apiError,
    },
  });
}
