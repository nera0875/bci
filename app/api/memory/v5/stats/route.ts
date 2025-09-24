import { NextRequest, NextResponse } from 'next/server';
import { MemoryServiceV5 } from '@/lib/services/memoryServiceV5';
import { getMem0Config } from '@/lib/config/mem0';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    const config = getMem0Config();
    const service = new MemoryServiceV5({
      apiKey: config.apiKey,
      projectId: config.projectId || projectId,
      userId: 'system',
      plan: 'STARTER'
    });

    // For now, return empty stats if the API key is invalid
    try {
      const stats = await service.getCategoryStats();
      return NextResponse.json({ success: true, stats });
    } catch (apiError) {
      console.warn('Mem0 API error (check API key):', apiError);
      // Return empty stats structure
      return NextResponse.json({
        success: true,
        stats: {
          reconnaissance: 0,
          exploitation: 0,
          privilege_escalation: 0,
          lateral_movement: 0,
          persistence: 0,
          collection: 0,
          exfiltration: 0,
          defense_evasion: 0
        }
      });
    }
  } catch (error) {
    console.error('Memory stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}