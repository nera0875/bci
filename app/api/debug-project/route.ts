import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()

    // Get project data
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Project not found',
        details: error
      }, { status: 404 })
    }

    // Check what's in the project
    const hasAnthropicKey = !!project?.api_keys?.anthropic
    const hasOpenAIKey = !!project?.api_keys?.openai
    const currentModel = project?.settings?.aiModel || 'Not set'
    const hasGlobalRules = !!project?.settings?.globalRules

    // Check env variables
    const hasEnvAnthropicKey = !!process.env.ANTHROPIC_API_KEY
    const hasEnvOpenAIKey = !!process.env.OPENAI_API_KEY

    return NextResponse.json({
      projectId,
      projectName: project.name,
      apiKeys: {
        anthropic: hasAnthropicKey ? 'Set' : 'Not set',
        openai: hasOpenAIKey ? 'Set' : 'Not set'
      },
      envKeys: {
        anthropic: hasEnvAnthropicKey ? 'Available' : 'Not available',
        openai: hasEnvOpenAIKey ? 'Available' : 'Not available'
      },
      settings: {
        model: currentModel,
        globalRules: hasGlobalRules ? 'Configured' : 'Not configured'
      },
      recommendation: !hasAnthropicKey && !hasEnvAnthropicKey
        ? 'You need to set an Anthropic API key in the project settings or environment variables'
        : 'API keys are properly configured'
    })
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error.message
    }, { status: 500 })
  }
}