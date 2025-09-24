import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { serviceName, apiKey } = await req.json()

    if (!serviceName || !apiKey) {
      return NextResponse.json({ error: 'Service name and API key required' }, { status: 400 })
    }

    let isValid = false

    switch (serviceName) {
      case 'mem0':
        try {
          console.log('Verifying Mem0 API key...')
          // Use a simple GET request with required user_id parameter for verification
          const mem0Response = await fetch('https://api.mem0.ai/v1/memories/?user_id=test-user', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          })
          console.log('Mem0 API response status:', mem0Response.status)

          // For Mem0, we consider 200 (success) and 404 (no memories) as valid authentication
          // 401/403 would indicate invalid API key
          isValid = mem0Response.status === 200 || mem0Response.status === 404

          if (!isValid) {
            console.log('Mem0 API response headers:', Object.fromEntries(mem0Response.headers))
            const errorText = await mem0Response.text()
            console.log('Mem0 API error response:', JSON.parse(errorText))
          }
        } catch (error) {
          console.error('Mem0 API verification failed:', error)
          isValid = false
        }
        break

      case 'openai':
        try {
          const openaiResponse = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          })
          isValid = openaiResponse.ok
        } catch (error) {
          console.error('OpenAI API verification failed:', error)
          isValid = false
        }
        break

      case 'anthropic':
        try {
          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 1
            })
          })
          isValid = anthropicResponse.status !== 401
        } catch (error) {
          console.error('Anthropic API verification failed:', error)
          isValid = false
        }
        break

      case 'supabase':
        // Pour Supabase, on considère que la clé est valide si elle est fournie
        isValid = true
        break

      default:
        return NextResponse.json({ error: 'Unsupported service' }, { status: 400 })
    }

    return NextResponse.json({
      isValid,
      serviceName,
      verifiedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('API key verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}