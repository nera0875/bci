# HTTP Request Memory Format

## Overview

Facts can now store complete HTTP requests and responses from pentesting tools like Burp Suite. This allows the AI assistant to:
- Analyze security vulnerabilities in APIs
- Track test results across different endpoints
- Suggest attack vectors based on previous findings
- Generate exploit POCs with actual request data

## Metadata Schema

Facts with HTTP requests have extended metadata:

```typescript
{
  // Standard fields
  type: 'test_result' | 'vulnerability' | 'endpoint',
  severity: 'critical' | 'high' | 'medium' | 'low',
  technique: 'BLV' | 'IDOR' | 'SQLi' | 'Price Manipulation' | string,
  category: 'business_logic' | 'auth' | 'api' | 'payment',
  tags: ['SPIN', 'STAKE', 'EXPLOIT'],

  // HTTP Request (complete)
  http_request: {
    url: 'https://demo-eu.mkc03xpj.xyz/game/play',
    method: 'POST',
    protocol: 'HTTP/2',
    host: 'demo-eu.mkc03xpj.xyz',
    path: '/game/play',
    headers: {
      'User-Agent': 'Mozilla/5.0...',
      'Authorization': 'Bearer eyJhbGc...',
      'X-Session-Id': 'd1e41cc3-ddbb...',
      'Content-Type': 'application/json'
    },
    body: {
      game: 'florida-man',
      provider: 'avatarux',
      action: 'main',
      bet: 1
    },
    cookies: {
      session: 'abc123...'
    }
  },

  // HTTP Response (optional)
  http_response: {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      success: true,
      winnings: 1000
    },
    time: 245 // Response time in ms
  },

  // Test notes
  test_notes: 'Tested bet parameter manipulation',
  exploit_steps: [
    'Intercept /game/play request',
    'Change bet from 1 to -1000',
    'Observe negative balance results in profit'
  ]
}
```

## Usage Examples

### Creating a fact with HTTP request

When user pastes a Burp Suite request, create a fact like this:

```json
{
  "operation": "create_fact",
  "data": {
    "fact": "Business Logic Vulnerability: Negative bet exploit in /game/play",
    "category": "business_logic",
    "severity": "critical",
    "technique": "BLV",
    "tags": ["SPIN", "EXPLOIT"],
    "http_request": {
      "url": "https://demo-eu.mkc03xpj.xyz/game/play",
      "method": "POST",
      "headers": {...},
      "body": {"bet": -1000}
    }
  }
}
```

### Searching HTTP requests

Use the API to filter requests:

```bash
GET /api/memory/http-requests?projectId=xxx
POST /api/memory/http-requests/search
{
  "projectId": "xxx",
  "method": "POST",
  "host": "mkc03xpj.xyz",
  "technique": "BLV",
  "severity": "critical"
}
```

### Analyzing patterns

When asked to analyze vulnerabilities, check existing HTTP requests:

1. Load facts with `http_request` metadata
2. Group by technique, endpoint, or severity
3. Identify patterns (e.g., all /game/* endpoints vulnerable to BLV)
4. Suggest next tests based on findings

## AI Assistant Guidelines

When handling HTTP requests:

1. **Recognize request format**: If user pastes raw HTTP, parse it automatically
2. **Extract key info**: Pull out method, URL, sensitive headers (Authorization, Session)
3. **Suggest metadata**: Recommend severity, technique, tags based on content
4. **Link related requests**: If similar endpoint exists, mention relationship
5. **Generate exploits**: Use actual request data to create POC scripts

## Security Warnings

HTTP requests may contain:
- 🔒 **Authorization tokens**: Bearer tokens, API keys
- 🔑 **Session IDs**: Cookie values, X-Session-Id headers
- 🔐 **Passwords**: In body parameters
- 💳 **Sensitive data**: Payment info, PII

The UI automatically detects and highlights these in the HttpRequestViewer component.

## Integration with Memory Actions

The AI can propose memory actions with HTTP data:

```typescript
{
  "operation": "create_fact",
  "data": {
    "fact": "Vulnerability description",
    "http_request": {...}, // Full HTTP request object
    "http_response": {...} // Optional response
  }
}
```

Users can validate/reject these actions before they're saved to memory.
