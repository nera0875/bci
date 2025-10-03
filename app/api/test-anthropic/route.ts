import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { apiKey, model } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    // Test the API key from server-side (no CORS)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-5-20250929',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    })

    if (response.ok) {
      return NextResponse.json({ success: true })
    } else {
      const error = await response.text()
      return NextResponse.json({ success: false, error }, { status: response.status })
    }
  } catch (error) {
    console.error('Error testing API key:', error)
    return NextResponse.json({ error: 'Failed to test API key' }, { status: 500 })
  }
}