import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return Response.json({ error: "API key required" }, { status: 400 })
    }

    // Test OpenAI API with minimal request
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    })

    if (response.ok) {
      return Response.json({ success: true })
    } else {
      return Response.json({ error: "Invalid API key" }, { status: 401 })
    }
  } catch (error) {
    return Response.json({ error: "Connection failed" }, { status: 500 })
  }
}
