'use client'

import { Block, HeadingBlock, TextBlock, ChecklistBlock, TestResultBlock, HttpRequestBlock, CodeBlock, NoteBlock } from '@/types/memory'
import { Globe, Link2, Eye, AlertTriangle, ListChecks, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BlockTemplate {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  blocks: Omit<Block, 'id'>[]
}

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    id: 'http-request',
    name: 'HTTP Request',
    icon: Globe,
    description: 'Complete HTTP request with headers and body',
    blocks: [
      {
        type: 'heading',
        content: 'HTTP Request',
        level: 2
      } as Omit<HeadingBlock, 'id'>,
      {
        type: 'http_request',
        method: 'GET',
        url: '/api/',
        headers: {
          'Content-Type': 'application/json'
        }
      } as Omit<HttpRequestBlock, 'id'>
    ]
  },
  {
    id: 'endpoint',
    name: 'Endpoint',
    icon: Link2,
    description: 'Simple API endpoint',
    blocks: [
      {
        type: 'code',
        language: 'http',
        code: 'GET /api/endpoint'
      } as Omit<CodeBlock, 'id'>
    ]
  },
  {
    id: 'observation',
    name: 'Observation',
    icon: Eye,
    description: 'Pentesting observation or finding',
    blocks: [
      {
        type: 'note',
        variant: 'info',
        content: 'Your observation here...'
      } as Omit<NoteBlock, 'id'>
    ]
  },
  {
    id: 'vulnerability',
    name: 'Vulnerability',
    icon: AlertTriangle,
    description: 'Document a security vulnerability',
    blocks: [
      {
        type: 'heading',
        content: 'Vulnerability Name',
        level: 1
      } as Omit<HeadingBlock, 'id'>,
      {
        type: 'note',
        variant: 'error',
        content: 'Severity: HIGH'
      } as Omit<NoteBlock, 'id'>,
      {
        type: 'heading',
        content: 'Description',
        level: 2
      } as Omit<HeadingBlock, 'id'>,
      {
        type: 'text',
        content: 'Describe the vulnerability...'
      } as Omit<TextBlock, 'id'>,
      {
        type: 'heading',
        content: 'Proof of Concept',
        level: 2
      } as Omit<HeadingBlock, 'id'>,
      {
        type: 'http_request',
        method: 'POST',
        url: '/api/vulnerable-endpoint',
        headers: {},
        body: ''
      } as Omit<HttpRequestBlock, 'id'>,
      {
        type: 'heading',
        content: 'Exploitation',
        level: 2
      } as Omit<HeadingBlock, 'id'>,
      {
        type: 'test_result',
        name: 'Exploitation attempt',
        status: 'pending'
      } as Omit<TestResultBlock, 'id'>
    ]
  },
  {
    id: 'workflow',
    name: 'Workflow',
    icon: ListChecks,
    description: 'Step-by-step testing workflow',
    blocks: [
      {
        type: 'heading',
        content: 'Workflow',
        level: 2
      } as Omit<HeadingBlock, 'id'>,
      {
        type: 'checklist',
        items: [
          { id: crypto.randomUUID(), text: 'Step 1', checked: false },
          { id: crypto.randomUUID(), text: 'Step 2', checked: false },
          { id: crypto.randomUUID(), text: 'Step 3', checked: false }
        ]
      } as Omit<ChecklistBlock, 'id'>
    ]
  },
  {
    id: 'blank',
    name: 'Blank',
    icon: FileText,
    description: 'Start with empty text block',
    blocks: [
      {
        type: 'text',
        content: ''
      } as Omit<TextBlock, 'id'>
    ]
  }
]

interface TemplateSelectorProps {
  onSelect: (blocks: Block[]) => void
  className?: string
}

export function TemplateSelector({ onSelect, className }: TemplateSelectorProps) {
  const handleSelect = (template: BlockTemplate) => {
    const blocks: Block[] = template.blocks.map(block => ({
      ...block,
      id: crypto.randomUUID()
    })) as Block[]

    onSelect(blocks)
  }

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {BLOCK_TEMPLATES.map((template) => {
        const Icon = template.icon

        return (
          <button
            key={template.id}
            onClick={() => handleSelect(template)}
            className={cn(
              'p-4 border border-gray-200 dark:border-gray-700 rounded-lg',
              'hover:bg-gray-50 dark:hover:bg-gray-800',
              'hover:border-purple-300 dark:hover:border-purple-600',
              'transition-all duration-150',
              'text-left group'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {template.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {template.description}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
