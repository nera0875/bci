import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    // 1. Attack Patterns avec success_rate > 70%
    const { error: attackError } = await supabase.from('attack_patterns').insert([
      {
        project_id: projectId,
        pattern_type: 'sqli',
        pattern: { payload: "' UNION SELECT 1,2,3-- -", method: 'UNION-based' },
        context: 'authentication',
        technique: 'UNION-based SQLi with ORDER BY enumeration',
        usage_count: 20,
        success_count: 17,
        last_success_at: new Date().toISOString()
      },
      {
        project_id: projectId,
        pattern_type: 'idor',
        pattern: { payload: 'id=1,2,3...100', method: 'Sequential enumeration' },
        context: 'api',
        technique: 'Sequential ID enumeration with JWT token',
        usage_count: 30,
        success_count: 27,
        last_success_at: new Date().toISOString()
      },
      {
        project_id: projectId,
        pattern_type: 'xss',
        pattern: { payload: '<script>alert(1)</script>', method: 'Stored XSS' },
        context: 'business-logic',
        technique: 'Stored XSS via user profile fields',
        usage_count: 16,
        success_count: 12,
        last_success_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ])

    if (attackError) {
      console.error('Attack patterns error:', attackError)
    }

    // 2. Learned Patterns avec confidence > 80%
    const { error: learnedError } = await supabase.from('learned_patterns').insert([
      {
        project_id: projectId,
        pattern_type: 'save_memory',
        condition: { context: 'success_detected', keywords: ['vulnerability found', 'exploit successful'] },
        action: { target_folder: 'Success', auto_save: true },
        confidence: 0.92,
        sample_size: 25
      },
      {
        project_id: projectId,
        pattern_type: 'rule_trigger',
        condition: { context: 'repeated_attempt', min_count: 3 },
        action: { create_rule: true, template: 'Always test multiple payloads for this endpoint' },
        confidence: 0.88,
        sample_size: 18
      }
    ])

    if (learnedError) {
      console.error('Learned patterns error:', learnedError)
    }

    // 3. Suggestions en attente (pending)
    const { error: suggestionsError } = await supabase.from('suggestions_queue').insert([
      {
        project_id: projectId,
        type: 'storage',
        status: 'pending',
        confidence: 0.89,
        suggestion: {
          name: 'XSS Payload Collection',
          content: '<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n<svg onload=alert(1)>',
          target_folder_id: null,
          reason: 'Detected successful XSS exploitation pattern'
        }
      },
      {
        project_id: projectId,
        type: 'rule',
        status: 'pending',
        confidence: 0.85,
        suggestion: {
          name: 'Auto-test IDOR on API endpoints',
          trigger: 'When new API endpoint discovered',
          action: 'Automatically test sequential ID enumeration (user IDs 1-100)',
          reason: '90% success rate detected on IDOR attacks in API context'
        }
      },
      {
        project_id: projectId,
        type: 'improvement',
        status: 'pending',
        confidence: 0.76,
        suggestion: {
          type: 'prompt_optimization',
          recommendation: 'Add SQLi focus when context=authentication detected',
          rationale: '85% success rate with UNION-based SQLi in auth flows'
        }
      }
    ])

    if (suggestionsError) {
      console.error('Suggestions error:', suggestionsError)
    }

    // 4. User Decisions pour pattern learning
    const { error: decisionsError } = await supabase.from('user_decisions').insert([
      {
        project_id: projectId,
        decision_type: 'save_memory',
        context: { type: 'storage', target: 'Success' },
        proposed_action: { action: 'save', folder: 'Success', content: 'XSS payload' },
        user_choice: 'accept'
      },
      {
        project_id: projectId,
        decision_type: 'save_memory',
        context: { type: 'storage', target: 'Success' },
        proposed_action: { action: 'save', folder: 'Success', content: 'SQLi payload' },
        user_choice: 'accept'
      },
      {
        project_id: projectId,
        decision_type: 'accept_rule',
        context: { type: 'rule', trigger: 'IDOR' },
        proposed_action: { action: 'create_rule', trigger: 'IDOR detected', action: 'Test sequential IDs' },
        user_choice: 'accept'
      },
      {
        project_id: projectId,
        decision_type: 'reject_suggestion',
        context: { type: 'storage', target: 'Failed' },
        proposed_action: { action: 'save', folder: 'Failed', content: 'Irrelevant data' },
        user_choice: 'reject'
      },
      {
        project_id: projectId,
        decision_type: 'save_memory',
        context: { type: 'storage', target: 'Success' },
        proposed_action: { action: 'save', folder: 'Success', content: 'IDOR technique' },
        user_choice: 'accept'
      }
    ])

    if (decisionsError) {
      console.error('Decisions error:', decisionsError)
    }

    return NextResponse.json({
      success: true,
      message: 'Test data seeded successfully',
      errors: {
        attack_patterns: attackError?.message,
        learned_patterns: learnedError?.message,
        suggestions: suggestionsError?.message,
        decisions: decisionsError?.message
      }
    })

  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
