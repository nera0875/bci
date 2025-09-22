import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_URL = 'https://api.openai.com/v1'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, apiKey, ...params } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    let endpoint = ''
    let requestBody = {}

    switch (action) {
      case 'embedding':
        endpoint = '/embeddings'
        requestBody = {
          model: params.model || 'text-embedding-3-small',
          input: params.input,
        }
        break

      case 'chat':
        endpoint = '/chat/completions'
        requestBody = {
          model: params.model || 'gpt-4-turbo-preview',
          messages: params.messages,
          max_tokens: params.maxTokens || 2048,
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const response = await fetch(`${OPENAI_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'OpenAI API error' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('OpenAI API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}