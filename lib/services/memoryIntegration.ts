/**
 * Integration between ChatStream and MemoryServiceV4
 * Allows AI to manage pentesting memories through conversation
 */

import { MemoryServiceV4, MemoryResult } from './memoryServiceV4';

interface MemoryCommand {
  action: 'add' | 'search' | 'update' | 'delete' | 'link' | 'analyze';
  compartment?: string;
  content?: string;
  query?: string;
  memoryId?: string;
  metadata?: Record<string, any>;
}

export class MemoryIntegration {
  private service: MemoryServiceV4;

  constructor(projectId: string, userId: string) {
    this.service = new MemoryServiceV4({
      apiKey: process.env.MEM0_API_KEY!,
      projectId,
      userId,
      orgId: process.env.MEM0_ORG_ID
    });
  }

  /**
   * Parse natural language to memory commands
   */
  parseCommand(message: string): MemoryCommand | null {
    const lowerMessage = message.toLowerCase();

    // Detect compartment mentions
    const compartments = [
      'success_exploits',
      'failed_attempts',
      'reconnaissance',
      'active_plans',
      'patterns'
    ];

    const detectedCompartment = compartments.find(c =>
      lowerMessage.includes(c.replace('_', ' ')) ||
      lowerMessage.includes(c)
    );

    // Add to compartment
    if (lowerMessage.includes('remember') || lowerMessage.includes('store') || lowerMessage.includes('save')) {
      return {
        action: 'add',
        compartment: detectedCompartment || this.inferCompartment(message),
        content: message
      };
    }

    // Search in compartments
    if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('look for')) {
      return {
        action: 'search',
        compartment: detectedCompartment,
        query: message
      };
    }

    // Analyze protection/failure
    if (lowerMessage.includes('analyze') || lowerMessage.includes('why failed') || lowerMessage.includes('protection')) {
      return {
        action: 'analyze',
        compartment: 'failed_attempts',
        content: message
      };
    }

    return null;
  }

  /**
   * Infer compartment from content
   */
  private inferCompartment(content: string): string {
    const lower = content.toLowerCase();

    // Success indicators
    if (lower.includes('success') || lower.includes('worked') ||
        lower.includes('bypass') || lower.includes('exploit found')) {
      return 'success_exploits';
    }

    // Failure indicators
    if (lower.includes('failed') || lower.includes('blocked') ||
        lower.includes('denied') || lower.includes('error')) {
      return 'failed_attempts';
    }

    // Recon indicators
    if (lower.includes('port') || lower.includes('service') ||
        lower.includes('scan') || lower.includes('technology')) {
      return 'reconnaissance';
    }

    // Planning indicators
    if (lower.includes('plan') || lower.includes('next') ||
        lower.includes('todo') || lower.includes('approach')) {
      return 'active_plans';
    }

    // Pattern indicators
    if (lower.includes('pattern') || lower.includes('technique') ||
        lower.includes('method') || lower.includes('template')) {
      return 'patterns';
    }

    // Default to active plans for general notes
    return 'active_plans';
  }

  /**
   * Execute memory command
   */
  async executeCommand(command: MemoryCommand): Promise<{
    success: boolean;
    result?: any;
    message: string;
  }> {
    try {
      switch (command.action) {
        case 'add':
          if (!command.compartment || !command.content) {
            return { success: false, message: 'Missing compartment or content' };
          }
          const memories = await this.service.addToCompartment(
            command.compartment,
            command.content,
            command.metadata
          );
          return {
            success: true,
            result: memories,
            message: `Stored in ${command.compartment}: ${memories.length} memories created`
          };

        case 'search':
          if (!command.query) {
            return { success: false, message: 'Missing search query' };
          }
          const results = command.compartment
            ? await this.service.searchInCompartment(command.compartment, command.query)
            : await this.service.searchWithCriteria(command.query);
          return {
            success: true,
            result: results,
            message: `Found ${results.length} matching memories`
          };

        case 'update':
          if (!command.memoryId || !command.content) {
            return { success: false, message: 'Missing memory ID or content' };
          }
          await this.service.updateMemory(command.memoryId, command.content, command.metadata);
          return {
            success: true,
            message: 'Memory updated successfully'
          };

        case 'delete':
          if (!command.memoryId) {
            return { success: false, message: 'Missing memory ID' };
          }
          await this.service.deleteMemory(command.memoryId);
          return {
            success: true,
            message: 'Memory deleted successfully'
          };

        case 'analyze':
          // Analyze failed attempts and suggest bypasses
          const failures = await this.service.searchInCompartment('failed_attempts', command.content || '');
          const successes = await this.service.searchInCompartment('success_exploits', 'similar');
          return {
            success: true,
            result: { failures, successes },
            message: `Analysis complete: ${failures.length} failures, ${successes.length} similar successes`
          };

        default:
          return { success: false, message: 'Unknown command action' };
      }
    } catch (error) {
      console.error('Memory command execution error:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Format memories for chat display
   */
  formatMemoriesForChat(memories: MemoryResult[]): string {
    if (!memories.length) return 'No memories found.';

    return memories.map((m, i) => {
      let output = `${i + 1}. ${m.memory}`;
      if (m.score) output += ` (confidence: ${(m.score * 100).toFixed(0)}%)`;
      if (m.metadata?.compartment) output += ` [${m.metadata.compartment}]`;
      return output;
    }).join('\n');
  }

  /**
   * Generate memory context for AI
   */
  async generateContext(query: string): Promise<string> {
    // Search across all compartments for relevant context
    const results = await this.service.searchWithCriteria(query, {
      recency: true,
      category_match: 0.7
    });

    if (!results.length) return '';

    return `## Relevant Memory Context:\n${this.formatMemoriesForChat(results)}`;
  }

  /**
   * Process chat message and handle memory operations
   */
  async processChatMessage(message: string): Promise<{
    memoryHandled: boolean;
    memoryResponse?: string;
    context?: string;
  }> {
    // Check if message contains memory command
    const command = this.parseCommand(message);

    if (command) {
      const result = await this.executeCommand(command);
      return {
        memoryHandled: true,
        memoryResponse: result.message,
        context: result.result ? this.formatMemoriesForChat(
          Array.isArray(result.result) ? result.result :
          result.result.failures ? result.result.failures : []
        ) : undefined
      };
    }

    // Generate context for non-command messages
    const context = await this.generateContext(message);
    return {
      memoryHandled: false,
      context
    };
  }
}