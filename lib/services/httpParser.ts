// HTTP Request Parser for automatic analysis

export interface ParsedRequest {
  method: string
  path: string
  host: string
  headers: Record<string, string>
  params: Record<string, any>
  body?: any
  cookies?: Record<string, string>
  queryParams?: Record<string, string>
  contentType?: string
  authorization?: string
}

export interface VulnerabilityPrediction {
  type: string
  probability: number
  reason: string
  suggestedTest: string
}

export function parseHttpRequests(input: string): ParsedRequest[] {
  const requests: ParsedRequest[] = []

  // Split by common HTTP request patterns
  const requestBlocks = input.split(/(?=(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\/)/gi)

  for (const block of requestBlocks) {
    if (!block.trim()) continue

    const lines = block.split('\n')
    if (lines.length === 0) continue

    // Parse request line
    const requestLine = lines[0]
    const requestMatch = requestLine.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s]+)(?:\s+HTTP\/[\d.]+)?/i)

    if (!requestMatch) continue

    const parsed: ParsedRequest = {
      method: requestMatch[1].toUpperCase(),
      path: requestMatch[2],
      host: '',
      headers: {},
      params: {}
    }

    // Parse headers
    let bodyStartIndex = -1
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]

      // Empty line indicates start of body
      if (line.trim() === '') {
        bodyStartIndex = i + 1
        break
      }

      // Parse header
      const headerMatch = line.match(/^([^:]+):\s*(.+)$/)
      if (headerMatch) {
        const key = headerMatch[1].toLowerCase()
        const value = headerMatch[2].trim()
        parsed.headers[key] = value

        // Extract specific headers
        if (key === 'host') parsed.host = value
        if (key === 'content-type') parsed.contentType = value
        if (key === 'authorization') parsed.authorization = value
        if (key === 'cookie') {
          parsed.cookies = parseCookies(value)
        }
      }
    }

    // Parse query parameters from path
    if (parsed.path.includes('?')) {
      const [path, queryString] = parsed.path.split('?')
      parsed.path = path
      parsed.queryParams = parseQueryParams(queryString)
      Object.assign(parsed.params, parsed.queryParams)
    }

    // Parse body if present
    if (bodyStartIndex > 0 && bodyStartIndex < lines.length) {
      const bodyLines = lines.slice(bodyStartIndex)
      const bodyText = bodyLines.join('\n').trim()

      if (bodyText) {
        try {
          // Try to parse as JSON
          parsed.body = JSON.parse(bodyText)

          // Extract parameters from JSON body
          if (typeof parsed.body === 'object') {
            Object.assign(parsed.params, flattenObject(parsed.body))
          }
        } catch {
          // Try to parse as form data
          if (parsed.contentType?.includes('application/x-www-form-urlencoded')) {
            parsed.body = parseQueryParams(bodyText)
            Object.assign(parsed.params, parsed.body)
          } else {
            parsed.body = bodyText
          }
        }
      }
    }

    requests.push(parsed)
  }

  return requests
}

export function predictVulnerabilities(request: ParsedRequest): VulnerabilityPrediction[] {
  const predictions: VulnerabilityPrediction[] = []

  // IDOR Detection
  if (request.path.match(/\/\d+/) || request.path.match(/[?&](id|user|userId|orderId|accountId)=\d+/i)) {
    predictions.push({
      type: 'IDOR',
      probability: 0.85,
      reason: 'Sequential numeric ID detected in path or parameters',
      suggestedTest: 'Try incrementing/decrementing the ID value'
    })
  }

  // SQL Injection
  const sqlParams = Object.keys(request.params).filter(key =>
    key.toLowerCase().includes('search') ||
    key.toLowerCase().includes('query') ||
    key.toLowerCase().includes('filter') ||
    key.toLowerCase().includes('sort')
  )

  if (sqlParams.length > 0) {
    predictions.push({
      type: 'SQL Injection',
      probability: 0.75,
      reason: `Query parameters detected: ${sqlParams.join(', ')}`,
      suggestedTest: "Add ' OR 1=1-- to parameters"
    })
  }

  // NoSQL Injection
  if (request.body && typeof request.body === 'object') {
    const hasOperators = JSON.stringify(request.body).includes('$')
    if (hasOperators || request.headers['content-type']?.includes('json')) {
      predictions.push({
        type: 'NoSQL Injection',
        probability: 0.70,
        reason: 'JSON body with potential MongoDB operators',
        suggestedTest: 'Try {$ne: null} or {$gt: ""} in parameters'
      })
    }
  }

  // JWT Issues
  if (request.authorization?.startsWith('Bearer ')) {
    predictions.push({
      type: 'JWT Misconfiguration',
      probability: 0.65,
      reason: 'JWT token detected in Authorization header',
      suggestedTest: 'Check algorithm confusion, try "none" algorithm'
    })
  }

  // Price/Quantity Manipulation
  const priceParams = Object.keys(request.params).filter(key =>
    key.toLowerCase().includes('price') ||
    key.toLowerCase().includes('amount') ||
    key.toLowerCase().includes('quantity') ||
    key.toLowerCase().includes('total')
  )

  if (priceParams.length > 0) {
    predictions.push({
      type: 'Price Manipulation',
      probability: 0.80,
      reason: `Price/quantity parameters detected: ${priceParams.join(', ')}`,
      suggestedTest: 'Try negative values or zero'
    })
  }

  // SSRF
  const urlParams = Object.keys(request.params).filter(key =>
    key.toLowerCase().includes('url') ||
    key.toLowerCase().includes('callback') ||
    key.toLowerCase().includes('webhook') ||
    key.toLowerCase().includes('redirect')
  )

  if (urlParams.length > 0) {
    predictions.push({
      type: 'SSRF',
      probability: 0.70,
      reason: `URL parameters detected: ${urlParams.join(', ')}`,
      suggestedTest: 'Try internal IPs like 127.0.0.1 or 169.254.169.254'
    })
  }

  // Race Condition
  if (request.path.includes('checkout') ||
      request.path.includes('payment') ||
      request.path.includes('transfer') ||
      request.path.includes('withdraw')) {
    predictions.push({
      type: 'Race Condition',
      probability: 0.60,
      reason: 'Financial/critical operation endpoint detected',
      suggestedTest: 'Send multiple concurrent requests'
    })
  }

  // Information Disclosure
  if (request.path.includes('debug') ||
      request.path.includes('test') ||
      request.path.includes('admin') ||
      request.path.includes('.git') ||
      request.path.includes('backup')) {
    predictions.push({
      type: 'Information Disclosure',
      probability: 0.75,
      reason: 'Sensitive path component detected',
      suggestedTest: 'Check for exposed debug information or files'
    })
  }

  // Sort by probability
  predictions.sort((a, b) => b.probability - a.probability)

  return predictions
}

// Helper functions
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  cookieString.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=')
    if (key) cookies[key] = value || ''
  })
  return cookies
}

function parseQueryParams(queryString: string): Record<string, string> {
  const params: Record<string, string> = {}
  queryString.split('&').forEach(param => {
    const [key, value] = param.split('=')
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '')
  })
  return params
}

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {}

  for (const key in obj) {
    const value = obj[key]
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey))
    } else {
      flattened[newKey] = value
    }
  }

  return flattened
}

// Analyze multiple requests for patterns
export function analyzeRequestSet(requests: ParsedRequest[]): {
  endpoints: string[]
  methods: string[]
  commonParams: string[]
  authTypes: string[]
  predictions: VulnerabilityPrediction[]
} {
  const endpoints = [...new Set(requests.map(r => r.path))]
  const methods = [...new Set(requests.map(r => r.method))]
  const allParams = new Set<string>()
  const authTypes = new Set<string>()

  requests.forEach(req => {
    Object.keys(req.params).forEach(param => allParams.add(param))

    if (req.authorization) {
      if (req.authorization.startsWith('Bearer ')) authTypes.add('JWT')
      else if (req.authorization.startsWith('Basic ')) authTypes.add('Basic')
      else authTypes.add('Custom')
    }
  })

  // Get predictions for all requests
  const allPredictions = requests.flatMap(req => predictVulnerabilities(req))

  // Deduplicate and average probabilities
  const predictionMap = new Map<string, VulnerabilityPrediction>()

  allPredictions.forEach(pred => {
    const existing = predictionMap.get(pred.type)
    if (existing) {
      existing.probability = (existing.probability + pred.probability) / 2
    } else {
      predictionMap.set(pred.type, { ...pred })
    }
  })

  return {
    endpoints,
    methods,
    commonParams: Array.from(allParams),
    authTypes: Array.from(authTypes),
    predictions: Array.from(predictionMap.values()).sort((a, b) => b.probability - a.probability)
  }
}