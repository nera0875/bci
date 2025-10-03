import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { OptimizationEngine } from '@/lib/services/optimizationEngine'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status, modifiedData, processed_at } = await request.json()

    // Update suggestion status
    const { data: suggestion, error } = await supabase
      .from('suggestions_queue')
      .update({
        status,
        processed_at,
        processed_by: 'user',
        metadata: modifiedData ? { ...modifiedData, original_modified: true } : undefined
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // If accepted, apply the suggestion
    if (status === 'accepted' && suggestion) {
      const engine = new OptimizationEngine(suggestion.project_id)
      await engine.acceptSuggestion(suggestion.id, {
        type: suggestion.type,
        confidence: suggestion.confidence,
        suggestion: modifiedData || suggestion.suggestion,
        metadata: suggestion.metadata
      })
    }

    return NextResponse.json(suggestion)
  } catch (error) {
    console.error('Error processing suggestion:', error)
    return NextResponse.json({ error: 'Failed to process suggestion' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await supabase
      .from('suggestions_queue')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting suggestion:', error)
    return NextResponse.json({ error: 'Failed to delete suggestion' }, { status: 500 })
  }
}