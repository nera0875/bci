import { NextRequest, NextResponse } from 'next/server';
import { MemoryServiceV4 } from '@/lib/services/memoryServiceV4';
import { getMem0Config } from '@/lib/config/mem0';

export async function POST(request: NextRequest) {
  try {
    const { projectId, userId, compartment, content, metadata } = await request.json();

    const config = getMem0Config();

    // Les appels Mem0 DOIVENT se faire côté serveur pour éviter CORS
    const service = new MemoryServiceV4({
      apiKey: config.apiKey,
      projectId: config.projectId || projectId,
      userId: userId || 'system',
      orgId: config.orgId
    });

    const result = await service.addToCompartment(compartment, content, metadata);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Memory add error:', error);
    return NextResponse.json(
      { error: 'Failed to add memory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}