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

    console.log('🔑 Using Mem0 API key:', mem0Key.api_key.substring(0, 10) + '...');

    // Instead of using SDK which creates projects, just check if we can connect to Mem0 API
    const testResponse = await fetch(`https://api.mem0.ai/v1/memories/?user_id=${userId || projectId}&limit=1`, {
      headers: {
        'Authorization': `Token ${mem0Key.api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (testResponse.ok || testResponse.status === 404) {
      console.log('✅ Compartments initialized using metadata organization');
      return NextResponse.json({
        success: true,
        message: 'Mem0 connection verified and ready for compartment-based memories',
        projectId: projectId,
        approach: 'metadata-based'
      });
    } else {
      const errorText = await testResponse.text();
      console.error('❌ Mem0 API connection failed:', errorText);
      throw new Error(`Mem0 API connection failed: ${testResponse.status}`);
    }
  } catch (error) {
    console.error('❌ Erreur initialisation:', error);
    return NextResponse.json(
      { error: 'Failed to initialize memory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}