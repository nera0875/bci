'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface RichMarkdownProps {
  content: string
}

export default function RichMarkdown({ content }: RichMarkdownProps) {
  return (
    <div className="prose prose-sm max-w-none text-[#202123] [&>*]:text-[#202123]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Paragraphs
          p: ({ children }) => (
            <div className="mb-4 leading-7">{children}</div>
          ),

          // Headers
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 text-[#202123]">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 text-[#202123]">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-2 mt-4 text-[#202123]">{children}</h3>
          ),

          // Code blocks with syntax highlighting
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

            // Block code with language detection
            return (
              <div className="my-4 rounded-lg overflow-hidden border border-gray-700">
                <div className="bg-[#1e1e1e] px-4 py-2 text-xs text-gray-400 border-b border-gray-700 font-mono">
                  {match[1].toUpperCase()}
                </div>
                <pre className="bg-[#1e1e1e] p-4 overflow-x-auto">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            )
          },

          // Tables
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-gray-300">
              <table className="min-w-full divide-y divide-gray-300">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-gray-900">{children}</td>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">{children}</li>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 italic text-gray-700">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          // Custom blocks with HTML
          div: ({ className, children }: any) => {
            // Success block
            if (className === 'success') {
              return (
                <div className="my-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">✅</span>
                    <div className="flex-1 text-green-800">{children}</div>
                  </div>
                </div>
              )
            }

            // Error block
            if (className === 'error') {
              return (
                <div className="my-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">❌</span>
                    <div className="flex-1 text-red-800">{children}</div>
                  </div>
                </div>
              )
            }

            // Warning block
            if (className === 'warning') {
              return (
                <div className="my-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">⚠️</span>
                    <div className="flex-1 text-yellow-800">{children}</div>
                  </div>
                </div>
              )
            }

            // Info block
            if (className === 'info') {
              return (
                <div className="my-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">ℹ️</span>
                    <div className="flex-1 text-blue-800">{children}</div>
                  </div>
                </div>
              )
            }

            // HTTP Request block
            if (className === 'http-request') {
              return (
                <div className="my-4 rounded-lg overflow-hidden border border-purple-300">
                  <div className="bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-800 border-b border-purple-300">
                    📡 HTTP Request
                  </div>
                  <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 overflow-x-auto text-xs font-mono">
                    {children}
                  </pre>
                </div>
              )
            }

            // HTTP Response block
            if (className === 'http-response') {
              return (
                <div className="my-4 rounded-lg overflow-hidden border border-green-300">
                  <div className="bg-green-100 px-4 py-2 text-sm font-semibold text-green-800 border-b border-green-300">
                    📥 HTTP Response
                  </div>
                  <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 overflow-x-auto text-xs font-mono">
                    {children}
                  </pre>
                </div>
              )
            }

            return <div className={className}>{children}</div>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
