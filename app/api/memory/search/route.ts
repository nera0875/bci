import { NextRequest, NextResponse } from 'next/server';
import { MemoryServiceV4 } from '@/lib/services/memoryServiceV4';
import { getMem0Config } from '@/lib/config/mem0';

export async function POST(request: NextRequest) {
  try {
    const { query, compartment, projectId, userId, filters } = await request.json();

    const config = getMem0Config();

    const service = new MemoryServiceV4({
      apiKey: config.apiKey,
      projectId: config.projectId || projectId,
      userId: userId || 'system',
      orgId: config.orgId
    });

    let results;
    if (compartment) {
      results = await service.searchCompartment(compartment, query, filters);
    } else {
      results = await service.searchWithCriteria(query, filters);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Memory search error:', error);
    return NextResponse.json(
      { error: 'Failed to search memory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}