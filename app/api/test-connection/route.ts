import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { service, apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key required' })
    }

    if (service === 'anthropic') {
      // Test Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 10
        })
      })

      if (response.status === 401) {
        return NextResponse.json({ success: false, error: 'Invalid API key' })
      }

      if (response.ok) {
        return NextResponse.json({ success: true, message: 'Anthropic API connected' })
      }

      return NextResponse.json({ success: false, error: 'Connection failed' })
    }

    if (service === 'openai') {
      // Test OpenAI API
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (response.status === 401) {
        return NextResponse.json({ success: false, error: 'Invalid API key' })
      }

      if (response.ok) {
        return NextResponse.json({ success: true, message: 'OpenAI API connected' })
      }

      return NextResponse.json({ success: false, error: 'Connection failed' })
    }

    return NextResponse.json({ success: false, error: 'Invalid service' })
  } catch (error) {
    console.error('API test error:', error)
    return NextResponse.json({ success: false, error: 'Test failed' })
  }
}