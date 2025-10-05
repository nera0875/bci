import TurndownService from 'turndown'

/**
 * Convert HTML (from Tiptap editor) to clean Markdown
 * Removes colors and HTML-specific styling that LLMs don't understand
 */
export function htmlToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: 'atx', // Use # for headings
    codeBlockStyle: 'fenced', // Use ``` for code blocks
    emDelimiter: '*', // Use * for italic
    strongDelimiter: '**', // Use ** for bold
  })

  // Remove color styles (LLMs don't understand them)
  turndownService.addRule('removeColors', {
    filter: (node) => {
      return node.nodeName === 'SPAN' && node.hasAttribute('style')
    },
    replacement: (content) => content // Keep only text content
  })

  // Remove highlight backgrounds (keep text)
  turndownService.addRule('removeHighlights', {
    filter: (node) => {
      return node.nodeName === 'MARK'
    },
    replacement: (content) => content
  })

  const markdown = turndownService.turndown(html)
  return markdown.trim()
}

/**
 * Convert Markdown to HTML (for displaying in Tiptap)
 */
export function markdownToHtml(markdown: string): string {
  // Simple conversion - Tiptap handles most of this internally
  return markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>')
    .replace(/^\d+\. (.+)$/gm, '<ol><li>$1</li></ol>')
}
