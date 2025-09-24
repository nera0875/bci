import { NextRequest, NextResponse } from 'next/server';
import { MemoryServiceV4 } from '@/lib/services/memoryServiceV4';
import { SupabaseApiKeyService } from '@/lib/services/apiKeyService';

export async function POST(request: NextRequest) {
  try {
    const { projectId, userId } = await request.json();

    // Get Mem0 API key from Supabase
    const apiKeyService = new SupabaseApiKeyService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const mem0Key = await apiKeyService.get('mem0');
    if (!mem0Key || !mem0Key.api_key) {
      return NextResponse.json(
        { error: 'Mem0 API key not configured' },
        { status: 401 }
      );
    }

    const service = new MemoryServiceV4({
      apiKey: mem0Key.api_key,
      projectId: projectId,
      userId: userId || 'system',
      orgId: undefined
    });

    // Get stats for each compartment from config
    const { compartmentsConfig } = await import('@/lib/config/compartments.config');
    const compartments = compartmentsConfig.map(c => c.id);
    const stats: Record<string, number> = {};

    for (const comp of compartments) {
      try {
        const results = await service.searchCompartment(comp, '', { limit: 100 });
        stats[comp] = results?.length || 0;
      } catch (err) {
        console.error(`Failed to get stats for ${comp}:`, err);
        stats[comp] = 0;
      }
    }

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Memory stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}