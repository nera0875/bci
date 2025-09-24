'use client';

import { useState, useCallback } from 'react';
import { MemoryIntegration } from '@/lib/services/memoryIntegration';

interface UseMemoryIntegrationProps {
  projectId: string;
  userId: string;
}

export function useMemoryIntegration({ projectId, userId }: UseMemoryIntegrationProps) {
  const [memoryContext, setMemoryContext] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const processMessage = useCallback(async (message: string) => {
    if (!projectId || !userId) return { memoryHandled: false };

    setIsProcessing(true);
    try {
      const integration = new MemoryIntegration(projectId, userId);
      const result = await integration.processChatMessage(message);

      // Update context if available
      if (result.context) {
        setMemoryContext(result.context);
      }

      return result;
    } catch (error) {
      console.error('Memory integration error:', error);
      return { memoryHandled: false };
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, userId]);

  const clearContext = useCallback(() => {
    setMemoryContext('');
  }, []);

  return {
    processMessage,
    memoryContext,
    clearContext,
    isProcessing
  };
}