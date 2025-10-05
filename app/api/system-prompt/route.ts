import { NextResponse } from 'next/server'
import { BASE_SYSTEM_PROMPT } from '@/lib/services/systemPrompt'

export async function GET() {
  return NextResponse.json({
    prompt: BASE_SYSTEM_PROMPT,
    deprecated: true,
    warning: 'This prompt is deprecated and will be removed soon. Use project.system_prompt instead.'
  })
}

export async function POST(req: Request) {
  try {
    const { newPrompt } = await req.json()

    // Pour l'instant, on ne permet pas de modifier le BASE_SYSTEM_PROMPT
    // car c'est deprecated. Il faudrait plutôt utiliser system_prompt du projet

    return NextResponse.json({
      success: false,
      message: 'BASE_SYSTEM_PROMPT is deprecated and read-only. Use project system_prompt instead.'
    }, { status: 403 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to update prompt'
    }, { status: 500 })
  }
}
