'use client'

import React, { useMemo, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { marked } from 'marked'

interface StreamingMarkdownProps {
  content: string
}

// Parse markdown en blocs (chaque bloc = paragraphe, header, code, etc.)
function parseMarkdownIntoBlocks(markdown: string): string[] {
  if (!markdown) return []

  try {
    const tokens = marked.lexer(markdown)
    return tokens.map(token => token.raw)
  } catch (e) {
    // Si parsing échoue pendant streaming (markdown incomplet), retourner le texte brut
    return [markdown]
  }
}

// Bloc individuel memoizé - Ne re-render QUE si contenu change
const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    const memoizedComponents = useMemo(() => ({
      // Paragraphs
      p: ({ children }: any) => (
        <div className="mb-4 leading-7">{children}</div>
      ),

      // Headers
      h1: ({ children }: any) => (
        <h1 className="text-2xl font-bold mb-4 mt-6 text-[#202123]">{children}</h1>
      ),
      h2: ({ children }: any) => (
        <h2 className="text-xl font-bold mb-3 mt-5 text-[#202123]">{children}</h2>
      ),
      h3: ({ children }: any) => (
        <h3 className="text-lg font-semibold mb-2 mt-4 text-[#202123]">{children}</h3>
      ),

      // Code blocks
      code: ({ className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '')
        const isInline = !match

        if (isInline) {
          return (
            <code className="bg-[#1e1e1e] text-[#d4d4d4] px-2 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          )
        }

        return (
          <div className="my-4 rounded-lg overflow-hidden border border-gray-700">
            <div className="bg-[#1e1e1e] px-4 py-2 text-xs text-gray-400 border-b border-gray-700 font-mono">
              {match[1].toUpperCase()}
            </div>
            <pre className="bg-[#1e1e1e] p-4 overflow-x-auto">
              <code className={`${className} text-[#d4d4d4]`} {...props}>
                {children}
              </code>
            </pre>
          </div>
        )
      },

      // Tables
      table: ({ children }: any) => (
        <div className="my-4 overflow-x-auto rounded-lg border border-gray-300">
          <table className="min-w-full divide-y divide-gray-300">{children}</table>
        </div>
      ),
      thead: ({ children }: any) => (
        <thead className="bg-gray-50">{children}</thead>
      ),
      tbody: ({ children }: any) => (
        <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
      ),
      tr: ({ children }: any) => (
        <tr className="hover:bg-gray-50">{children}</tr>
      ),
      th: ({ children }: any) => (
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          {children}
        </th>
      ),
      td: ({ children }: any) => (
        <td className="px-4 py-3 text-sm text-gray-900">{children}</td>
      ),

      // Lists
      ul: ({ children }: any) => (
        <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
      ),
      ol: ({ children }: any) => (
        <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
      ),
      li: ({ children }: any) => (
        <li className="leading-7">{children}</li>
      ),

      // Blockquotes (support emojis inline)
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 text-gray-700">
          {children}
        </blockquote>
      ),

      // Links
      a: ({ href, children }: any) => (
        <a
          href={href}
          className="text-blue-600 hover:text-blue-800 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
    }), [])

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={memoizedComponents}
      >
        {content}
      </ReactMarkdown>
    )
  },
  (prevProps, nextProps) => {
    // Re-render SEULEMENT si contenu change
    return prevProps.content === nextProps.content
  }
)

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock'

// Composant principal avec stratégie memoization Vercel
function StreamingMarkdown({ content }: StreamingMarkdownProps) {
  // Parse en blocs - Memoizé pour éviter re-parse à chaque token
  const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content])

  return (
    <div
      className="prose prose-sm max-w-none text-[#202123]"
      style={{
        // Transition smooth pour éviter le flash à la fin
        transition: 'opacity 0.15s ease-in-out, transform 0.15s ease-in-out',
        willChange: 'opacity, transform',
        // Hardware acceleration
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden' as const,
      }}
    >
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock
          key={`block-${index}`}
          content={block}
        />
      ))}
    </div>
  )
}

export default memo(StreamingMarkdown)
