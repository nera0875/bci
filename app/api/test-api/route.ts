import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()

    // Get API key and model from project settings
    const { data: project } = await supabase
      .from('projects')
      .select('api_keys, settings')
      .eq('id', projectId)
      .single()

    const anthropicApiKey = project?.api_keys?.anthropic || process.env.ANTHROPIC_API_KEY
    const customModel = project?.settings?.aiModel || 'claude-3-5-sonnet-20241022'

    console.log('API Key exists:', !!anthropicApiKey)
    console.log('Model:', customModel)
    console.log('Project found:', !!project)

    if (!anthropicApiKey) {
      return NextResponse.json({
        error: 'No API key found',
        hasProjectKey: !!project?.api_keys?.anthropic,
        hasEnvKey: !!process.env.ANTHROPIC_API_KEY
      }, { status: 400 })
    }

    // Test the API
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    })

    const response = await anthropic.messages.create({
      model: customModel,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Test' }]
    })

    return NextResponse.json({
      success: true,
      model: customModel,
      response: response
    })
  } catch (error: any) {
    console.error('Test API error:', error)
    return NextResponse.json({
      error: error.message,
      details: error.response?.data || error
    }, { status: 500 })
  }
}