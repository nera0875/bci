// Types principaux pour l'application BCI Tool

export interface HttpRequest {
  id: string
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  timestamp: string
  vectorized?: boolean
  embedding?: number[]
  embeddingText?: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'done' | 'failed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  vulnType?: VulnerabilityType
  createdAt: string
  updatedAt: string
  attempts: number
}

export interface VulnerabilityType {
  type: 'sql_injection' | 'xss' | 'idor' | 'auth_bypass' | 'csrf' | 'xxe' | 'ssrf' | 'other'
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  description: string
  evidence?: string
  remediation?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  context?: any
}

export interface Project {
  id: string
  name: string
  description?: string
  requests: HttpRequest[]
  tasks: Task[]
  vulnerabilities: VulnerabilityType[]
  chatHistory: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface EmbeddingRule {
  id: string
  name: string
  prompt: string
  active: boolean
  order: number
}

export interface ApiConfig {
  openai: {
    apiKey: string
    model: string
    embeddingModel: string
  }
  claude: {
    apiKey: string
    model: string
    maxTokens: number
  }
}