/**
 * HTTP Request/Response Metadata Types
 * Pour requêtes Burp Suite et pentesting
 */

export interface HttpHeaders {
  [key: string]: string | string[]
}

export interface HttpRequestMetadata {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'
  protocol?: 'HTTP/1.1' | 'HTTP/2' | 'HTTP/3'
  host?: string
  path?: string
  headers: HttpHeaders
  body?: string | object
  cookies?: Record<string, string>
}

export interface HttpResponseMetadata {
  status: number
  statusText?: string
  headers: HttpHeaders
  body?: string | object
  size?: number
  time?: number // Response time in ms
}

export interface FactRelation {
  fact_id: string
  type: 'enables' | 'requires' | 'similar_to' | 'mitigates' | 'blocks'
  note?: string
}

export interface AttackChain {
  id: string
  step: number
  label: string
  total_steps?: number
}

export interface FactMetadata {
  // Existant (conservé)
  type: 'vulnerability' | 'endpoint' | 'test_result' | 'note' | 'general'
  technique?: 'BLV' | 'IDOR' | 'SQLi' | 'XSS' | 'CSRF' | 'SSRF' | 'RCE' | 'Price Manipulation' | string | null
  endpoint?: string | null
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | string | null
  params?: Record<string, any>
  result?: 'success' | 'failed' | null
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info' | null
  category?: string | null
  confidence?: number
  tags?: string[]
  position?: number

  // Nouveau: HTTP Request complet
  http_request?: HttpRequestMetadata
  http_response?: HttpResponseMetadata

  // Notes de test
  test_notes?: string
  exploit_steps?: string[]

  // Relations simples (pas besoin de graph DB)
  related_to?: FactRelation[]

  // Attack chain tracking
  attack_chain?: AttackChain

  // Pattern tags (auto-détection)
  patterns?: string[]

  // Prerequisites pour exploiter cette faille
  prerequisites?: string[]

  // Impact combiné (quand utilisé avec d'autres facts)
  combined_impact?: string
}

/**
 * Parse une requête Burp Suite raw (format texte)
 * Supporte HTTP/1.1 et HTTP/2
 */
export function parseBurpRequest(rawRequest: string): HttpRequestMetadata | null {
  try {
    const lines = rawRequest.trim().split('\n')
    if (lines.length === 0) return null

    // Parse request line (ex: POST /game/play HTTP/2)
    const requestLineMatch = lines[0].match(/^(\w+)\s+([^\s]+)\s+(HTTP\/[\d.]+)/)
    if (!requestLineMatch) return null

    const [_, method, path, protocol] = requestLineMatch
    const headers: HttpHeaders = {}
    let bodyStartIndex = -1

    // Parse headers
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()

      // Empty line = end of headers
      if (line === '') {
        bodyStartIndex = i + 1
        break
      }

      // Parse header (Key: Value)
      const headerMatch = line.match(/^([^:]+):\s*(.+)$/)
      if (headerMatch) {
        const [__, key, value] = headerMatch
        headers[key] = value
      }
    }

    // Parse body
    let body: string | object | undefined
    if (bodyStartIndex !== -1 && bodyStartIndex < lines.length) {
      const bodyText = lines.slice(bodyStartIndex).join('\n').trim()

      // Try parse as JSON
      if (bodyText.startsWith('{') || bodyText.startsWith('[')) {
        try {
          body = JSON.parse(bodyText)
        } catch {
          body = bodyText
        }
      } else {
        body = bodyText
      }
    }

    // Extract host and construct URL
    const host = headers['Host'] as string || headers['host'] as string
    const scheme = protocol.includes('2') || protocol.includes('3') ? 'https' : 'http'
    const url = host ? `${scheme}://${host}${path}` : path

    // Parse cookies from Cookie header
    let cookies: Record<string, string> | undefined
    const cookieHeader = headers['Cookie'] as string || headers['cookie'] as string
    if (cookieHeader) {
      cookies = {}
      cookieHeader.split(';').forEach(cookie => {
        const [key, ...valueParts] = cookie.trim().split('=')
        if (key) cookies![key] = valueParts.join('=')
      })
    }

    return {
      url,
      method: method as any,
      protocol: protocol as any,
      host,
      path,
      headers,
      body,
      cookies
    }
  } catch (error) {
    console.error('Error parsing Burp request:', error)
    return null
  }
}

/**
 * Format une requête HTTP en texte lisible (pour copier-coller)
 */
export function formatHttpRequest(req: HttpRequestMetadata): string {
  let result = `${req.method} ${req.path || req.url} ${req.protocol || 'HTTP/1.1'}\n`

  // Headers
  Object.entries(req.headers).forEach(([key, value]) => {
    const valStr = Array.isArray(value) ? value.join(', ') : value
    result += `${key}: ${valStr}\n`
  })

  // Body
  if (req.body) {
    result += '\n'
    if (typeof req.body === 'object') {
      result += JSON.stringify(req.body, null, 2)
    } else {
      result += req.body
    }
  }

  return result
}

/**
 * Extrait les informations sensibles d'une requête (pour alertes)
 */
export function extractSensitiveInfo(req: HttpRequestMetadata): {
  hasAuth: boolean
  hasSessionId: boolean
  hasApiKey: boolean
  hasPassword: boolean
} {
  const headersStr = JSON.stringify(req.headers).toLowerCase()
  const bodyStr = typeof req.body === 'string'
    ? req.body.toLowerCase()
    : JSON.stringify(req.body || {}).toLowerCase()

  return {
    hasAuth: headersStr.includes('authorization') || headersStr.includes('auth'),
    hasSessionId: headersStr.includes('session') || bodyStr.includes('session'),
    hasApiKey: headersStr.includes('api-key') || headersStr.includes('apikey'),
    hasPassword: bodyStr.includes('password') || bodyStr.includes('passwd')
  }
}
