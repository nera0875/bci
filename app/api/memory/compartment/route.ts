import { NextRequest, NextResponse } from 'next/server';
import { MemoryServiceV4 } from '@/lib/services/memoryServiceV4';

export async function POST(request: NextRequest) {
  try {
    const { projectId, userId, compartment, query } = await request.json();

    if (!projectId || !userId || !compartment) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const service = new MemoryServiceV4({
      apiKey: process.env.MEM0_API_KEY!,
      projectId,
      userId,
      orgId: process.env.MEM0_ORG_ID
    });

    let memories;
    if (query) {
      memories = await service.searchInCompartment(compartment, query);
    } else {
      memories = await service.getCompartmentMemories(compartment);
    }

    return NextResponse.json({ memories });
  } catch (error) {
    console.error('Memory compartment API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}