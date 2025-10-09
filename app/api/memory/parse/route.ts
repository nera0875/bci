import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { Block } from '@/types/memory'

/**
 * AI Parser endpoint for Document Blocks
 *
 * Takes raw pentesting input (any format) and parses it into structured blocks.
 * Uses Claude with temperature 0 for consistency.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { input, projectId } = body

    console.log('🧠 Parse API called:', { hasInput: !!input, projectId })

    if (!input || !projectId) {
      return NextResponse.json(
        { error: 'input and projectId are required' },
        { status: 400 }
      )
    }

    // Get project API key
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('api_keys, settings')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const apiKey = (project as any).api_keys?.anthropic || process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Anthropic API key configured' },
        { status: 400 }
      )
    }

    // Initialize Anthropic with project API key
    const anthropic = new Anthropic({ apiKey })

    // System prompt for parsing
    const systemPrompt = `You are a pentesting assistant that parses raw input into structured blocks.

**Available block types:**

1. **heading**: Section title
   - content: string (the heading text)
   - level: 1 | 2 | 3 (heading importance)

2. **text**: Regular paragraph
   - content: string

3. **checklist**: List of items (workflow, steps)
   - items: Array<{ text: string, checked: boolean }>

4. **test_result**: Test outcome
   - name: string (test name/description)
   - status: 'success' | 'failed' | 'pending'
   - details?: string (optional details)
   - timestamp?: string (ISO format)

5. **http_request**: HTTP API call
   - method: string (GET, POST, etc.)
   - url: string
   - headers?: Record<string, string>
   - body?: any (JSON object)
   - response?: { status: number, headers?: Record<string, string>, body?: any }

6. **code**: Code snippet
   - language: string (javascript, python, json, etc.)
   - code: string

7. **note**: Important observation
   - content: string
   - variant?: 'info' | 'warning' | 'success' | 'error'

8. **divider**: Visual separator (no fields)

**Your task:**
Parse the user input below and return a JSON object with:
{
  "fact": "Short descriptive title (max 100 chars)",
  "category": "api" | "auth" | "business_logic" | "data" | "general",
  "tags": ["tag1", "tag2"],
  "blocks": [
    { "type": "...", ... },
    ...
  ]
}

**Guidelines:**
- Extract meaningful structure from the input
- Use appropriate block types for different content
- For workflows/steps → use checklist
- For test results → use test_result with appropriate status
- For HTTP requests → use http_request with all available details
- For code/JSON → use code block
- Add dividers between major sections
- Keep fact short and descriptive
- Generate relevant tags
- Choose appropriate category

**Examples:**

Input: "IDOR /game/complete - Tests bonus\\nWorkflow:\\n- LANCER BONUS\\n- CLICK COLLECT\\nTest 1 (JWT demo→real) : échec confirmé"

Output:
{
  "fact": "IDOR /game/complete - Tests bonus",
  "category": "api",
  "tags": ["idor", "bonus", "game"],
  "blocks": [
    { "type": "heading", "content": "Workflow", "level": 2 },
    { "type": "checklist", "items": [
      { "text": "LANCER BONUS", "checked": false },
      { "text": "CLICK COLLECT", "checked": false }
    ]},
    { "type": "test_result", "name": "Test 1 (JWT demo→real)", "status": "failed", "details": "échec confirmé" }
  ]
}

Input: "POST /api/users\\nHeaders: Authorization: Bearer abc123\\nBody: {\\"username\\":\\"test\\"}"

Output:
{
  "fact": "POST /api/users endpoint test",
  "category": "api",
  "tags": ["users", "api", "authentication"],
  "blocks": [
    { "type": "http_request", "method": "POST", "url": "/api/users", "headers": { "Authorization": "Bearer abc123" }, "body": { "username": "test" } }
  ]
}

Return ONLY valid JSON, no markdown formatting.`

    const userPrompt = `Parse this pentesting input:\n\n${input}`

    console.log('🤖 Calling Claude for parsing...')

    // Call Claude with temperature 0 for consistency
    const response = await anthropic.messages.create({
      model: (project as any).settings?.aiModel || 'claude-sonnet-4-5',
      max_tokens: 2000,
      temperature: 0,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    })

    const rawContent = (response.content[0] as any).text
    console.log('✅ Claude response received:', rawContent.substring(0, 200))

    // Parse JSON response
    let parsed: any
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = rawContent.match(/```json\n([\s\S]*?)\n```/) || rawContent.match(/```\n([\s\S]*?)\n```/)
      const jsonText = jsonMatch ? jsonMatch[1] : rawContent
      parsed = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('❌ Failed to parse Claude response as JSON:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: rawContent },
        { status: 500 }
      )
    }

    // Add unique IDs to all blocks
    if (parsed.blocks && Array.isArray(parsed.blocks)) {
      parsed.blocks = parsed.blocks.map((block: any) => ({
        id: crypto.randomUUID(),
        ...block
      }))
    }

    console.log('✅ Parsed successfully:', {
      fact: parsed.fact,
      category: parsed.category,
      tags: parsed.tags,
      blockCount: parsed.blocks?.length || 0
    })

    return NextResponse.json(parsed)

  } catch (error: any) {
    console.error('❌ Parse API error:', error)

    let errorMessage = 'Failed to parse input'
    let statusCode = 500

    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid API key'
      statusCode = 401
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded'
      statusCode = 429
    }

    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: statusCode }
    )
  }
}

// OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
