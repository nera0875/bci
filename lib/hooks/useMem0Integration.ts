'use client';

import { useEffect } from 'react';
import { getMem0Config } from '@/lib/config/mem0';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useMem0Integration(projectId: string) {
  // Initialize Mem0 compartments on mount
  useEffect(() => {
    const initializeMem0 = async () => {
      try {
        const response = await fetch('/api/memory/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, userId: 'system' })
        });

        if (response.ok) {
          console.log('✅ Mem0 compartments initialized');
        }
      } catch (error) {
        console.error('Failed to initialize Mem0:', error);
      }
    };

    const config = getMem0Config();
    if (config.apiKey) {
      initializeMem0();
    }
  }, [projectId]);

  // Process message through Mem0
  const processChatMessage = async (message: string, role: 'user' | 'assistant') => {
    try {
      // Analyze message for pentesting patterns
      const patterns = analyzeMessage(message);

      for (const pattern of patterns) {
        await fetch('/api/memory/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            userId: 'system',
            compartment: pattern.compartment,
            content: pattern.content,
            metadata: {
              role,
              timestamp: new Date().toISOString(),
              ...pattern.metadata
            }
          })
        });
      }
    } catch (error) {
      console.error('Failed to process message in Mem0:', error);
    }
  };

  return { processChatMessage };
}

function analyzeMessage(message: string): Array<{ compartment: string; content: string; metadata?: any }> {
  const patterns: Array<{ compartment: string; content: string; metadata?: any }> = [];
  const lowerMessage = message.toLowerCase();

  // Detect successful exploits
  if (lowerMessage.includes('successful') || lowerMessage.includes('vulnerability found') ||
      lowerMessage.includes('exploit worked') || lowerMessage.includes('gained access')) {
    patterns.push({
      compartment: 'success_exploits',
      content: message,
      metadata: { auto_detected: true }
    });
  }

  // Detect failed attempts
  if (lowerMessage.includes('failed') || lowerMessage.includes('blocked') ||
      lowerMessage.includes('denied') || lowerMessage.includes('didn\'t work')) {
    patterns.push({
      compartment: 'failed_attempts',
      content: message,
      metadata: { auto_detected: true }
    });
  }

  // Detect reconnaissance
  if (lowerMessage.includes('port') || lowerMessage.includes('scan') ||
      lowerMessage.includes('service') || lowerMessage.includes('version') ||
      lowerMessage.includes('technology') || lowerMessage.includes('framework')) {
    patterns.push({
      compartment: 'reconnaissance',
      content: message,
      metadata: { auto_detected: true }
    });
  }

  // Detect active plans
  if (lowerMessage.includes('next step') || lowerMessage.includes('plan') ||
      lowerMessage.includes('try') || lowerMessage.includes('should') ||
      lowerMessage.includes('will')) {
    patterns.push({
      compartment: 'active_plans',
      content: message,
      metadata: { auto_detected: true }
    });
  }

  // Detect patterns
  if (lowerMessage.includes('pattern') || lowerMessage.includes('technique') ||
      lowerMessage.includes('method') || lowerMessage.includes('approach')) {
    patterns.push({
      compartment: 'patterns',
      content: message,
      metadata: { auto_detected: true }
    });
  }

  return patterns;
}