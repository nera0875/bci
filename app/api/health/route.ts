import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    // Test simple: requête minimale sur projects (limite 1)
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1)

    if (error) {
      return NextResponse.json({ ok: false, service: 'supabase', error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, service: 'supabase', rows: data?.length || 0 })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
