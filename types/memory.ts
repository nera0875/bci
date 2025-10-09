/**
 * Document Blocks System for Memory Facts
 *
 * Flexible block-based storage for pentesting data.
 * Inspired by Notion's block architecture.
 */

// ============================================================================
// Block Types
// ============================================================================

export type BlockType =
  | 'heading'
  | 'text'
  | 'checklist'
  | 'test_result'
  | 'http_request'
  | 'code'
  | 'note'
  | 'divider'

// ============================================================================
// Base Block Interface
// ============================================================================

interface BaseBlock {
  id: string
  type: BlockType
}

// ============================================================================
// Individual Block Types
// ============================================================================

export interface HeadingBlock extends BaseBlock {
  type: 'heading'
  content: string
  level: 1 | 2 | 3
}

export interface TextBlock extends BaseBlock {
  type: 'text'
  content: string
}

export interface ChecklistBlock extends BaseBlock {
  type: 'checklist'
  items: Array<{
    id: string
    text: string
    checked: boolean
  }>
}

export interface TestResultBlock extends BaseBlock {
  type: 'test_result'
  name: string
  status: 'success' | 'failed' | 'pending'
  details?: string
  timestamp?: string
}

export interface HttpRequestBlock extends BaseBlock {
  type: 'http_request'
  method: string
  url: string
  headers?: Record<string, string>
  body?: any
  bodyPreview?: string  // First 500 chars for performance
  response?: {
    status: number
    headers?: Record<string, string>
    body?: any
    bodyPreview?: string
  }
}

export interface CodeBlock extends BaseBlock {
  type: 'code'
  language: string
  code: string
}

export interface NoteBlock extends BaseBlock {
  type: 'note'
  content: string
  variant?: 'info' | 'warning' | 'success' | 'error'
}

export interface DividerBlock extends BaseBlock {
  type: 'divider'
}

// ============================================================================
// Union Type for All Blocks
// ============================================================================

export type Block =
  | HeadingBlock
  | TextBlock
  | ChecklistBlock
  | TestResultBlock
  | HttpRequestBlock
  | CodeBlock
  | NoteBlock
  | DividerBlock

// ============================================================================
// Memory Node with Blocks
// ============================================================================

export interface MemoryNodeMetadata {
  blocks?: Block[]
  version?: number
}

export interface MemoryNode {
  id: string
  project_id: string
  fact: string
  content?: string  // Legacy field, kept for backward compatibility
  category?: string
  tags?: string[]
  metadata?: MemoryNodeMetadata
  created_at?: string
  updated_at?: string
}

// ============================================================================
// API Types
// ============================================================================

export interface ParseInputRequest {
  input: string
  projectId: string
}

export interface ParseInputResponse {
  fact: string
  category: string
  tags: string[]
  blocks: Block[]
}

export interface UpdateBlocksRequest {
  action: 'append' | 'update' | 'delete' | 'reorder'
  blocks?: Block[]
  blockId?: string
  newOrder?: string[]
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface BlockRendererProps {
  block: Block
  onEdit?: (block: Block) => void
  onDelete?: (blockId: string) => void
  onDuplicate?: (block: Block) => void
  onMoveUp?: (blockId: string) => void
  onMoveDown?: (blockId: string) => void
}

export interface BlockEditorProps {
  block: Block
  onSave: (block: Block) => void
  onCancel: () => void
}

// ============================================================================
// Helper Types
// ============================================================================

export type BlockTypeLabel = {
  [K in BlockType]: {
    label: string
    icon: string
    description: string
  }
}

export const BLOCK_TYPE_CONFIG: BlockTypeLabel = {
  heading: {
    label: 'Heading',
    icon: 'TextHOne',
    description: 'Section title'
  },
  text: {
    label: 'Text',
    icon: 'TextAlignLeft',
    description: 'Paragraph'
  },
  checklist: {
    label: 'Checklist',
    icon: 'ListChecks',
    description: 'Todo list'
  },
  test_result: {
    label: 'Test Result',
    icon: 'TestTube',
    description: 'Test outcome'
  },
  http_request: {
    label: 'HTTP Request',
    icon: 'Globe',
    description: 'API call'
  },
  code: {
    label: 'Code',
    icon: 'Code',
    description: 'Code snippet'
  },
  note: {
    label: 'Note',
    icon: 'Note',
    description: 'Important note'
  },
  divider: {
    label: 'Divider',
    icon: 'Minus',
    description: 'Visual separator'
  }
}
