import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { message, projectId } = await request.json()

    console.log('Test chat request:', { message, projectId })

    // Get API key from project
    const supabase = createServerClient()
    console.log('Supabase client created')
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('api_keys')
      .eq('id', projectId)
      .single()

    console.log('Project query result:', { project, error: projectError })

    const apiKey = project?.api_keys?.claude

    if (!apiKey) {
      console.error('No API key found in project')
      return NextResponse.json({ error: 'No API key', project }, { status: 401 })
    }

    // Test Claude API directly
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: message }
        ],
        system: 'You are Claude, an AI assistant helping with penetration testing. Respond briefly.'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Claude API error:', response.status, error)
      return NextResponse.json({ error: 'Claude API error', details: error }, { status: response.status })
    }

    const data = await response.json()

    // Save assistant response to database
    if (data.content?.[0]?.text) {
      await supabase
        .from('chat_messages')
        .insert({
          project_id: projectId,
          role: 'assistant',
          content: data.content[0].text
        })
    }

    return NextResponse.json({
      success: true,
      response: data.content?.[0]?.text || 'No response'
    })
  } catch (error: any) {
    console.error('Test chat error:', error)
    return NextResponse.json({
      error: 'Internal error',
      message: error.message
    }, { status: 500 })
  }
}