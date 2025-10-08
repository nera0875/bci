import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey })

    // Quick test with minimal tokens
    await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    })

    return NextResponse.json({ valid: true })
  } catch (error: any) {
    console.error('OpenAI key test failed:', error.message)
    return NextResponse.json({ valid: false, error: error.message }, { status: 401 })
  }
}
