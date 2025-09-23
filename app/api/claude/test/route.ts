import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return Response.json({ error: "API key required" }, { status: 400 })
    }

    // Test Claude API with minimal request
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-opus-4-1-20250805", // Claude Opus 4.1
        max_tokens: 10,
        messages: [
          { role: "user", content: "test" }
        ]
      })
    })

    if (response.ok) {
      return Response.json({ success: true })
    } else {
      // Get the actual error from Claude
      const errorData = await response.text()
      console.error("Claude API Error:", response.status, errorData)
      return Response.json({
        error: "API test failed",
        details: errorData,
        status: response.status
      }, { status: response.status })
    }
  } catch (error) {
    console.error("Connection error:", error)
    return Response.json({ error: "Connection failed", details: error }, { status: 500 })
  }
}
