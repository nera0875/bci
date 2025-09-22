export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          goal: string | null
          api_keys: Json
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          goal?: string | null
          api_keys?: Json
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          goal?: string | null
          api_keys?: Json
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      memory_nodes: {
        Row: {
          id: string
          project_id: string
          type: 'folder' | 'document' | 'widget' | 'pattern' | 'exploit' | 'metric'
          name: string
          content: Json
          embedding: number[] | null
          color: string
          icon: string
          parent_id: string | null
          metadata: Json
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: 'folder' | 'document' | 'widget' | 'pattern' | 'exploit' | 'metric'
          name: string
          content?: Json
          embedding?: number[] | null
          color?: string
          icon?: string
          parent_id?: string | null
          metadata?: Json
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: 'folder' | 'document' | 'widget' | 'pattern' | 'exploit' | 'metric'
          name?: string
          content?: Json
          embedding?: number[] | null
          color?: string
          icon?: string
          parent_id?: string | null
          metadata?: Json
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          project_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          streaming: boolean
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          streaming?: boolean
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          streaming?: boolean
          metadata?: Json
          created_at?: string
        }
      }
      rules: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          trigger: string
          action: string
          config: Json
          enabled: boolean
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          trigger: string
          action: string
          config?: Json
          enabled?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          trigger?: string
          action?: string
          config?: Json
          enabled?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      requests: {
        Row: {
          id: string
          project_id: string
          method: string | null
          url: string | null
          headers: Json | null
          body: string | null
          parsed_data: Json | null
          embedding: number[] | null
          vulnerability_score: number
          tested: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          method?: string | null
          url?: string | null
          headers?: Json | null
          body?: string | null
          parsed_data?: Json | null
          embedding?: number[] | null
          vulnerability_score?: number
          tested?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          method?: string | null
          url?: string | null
          headers?: Json | null
          body?: string | null
          parsed_data?: Json | null
          embedding?: number[] | null
          vulnerability_score?: number
          tested?: boolean
          created_at?: string
        }
      }
      vulnerabilities: {
        Row: {
          id: string
          project_id: string
          request_id: string | null
          type: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          payload: string | null
          evidence: Json | null
          confidence: number
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          request_id?: string | null
          type: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          payload?: string | null
          evidence?: Json | null
          confidence?: number
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          request_id?: string | null
          type?: string
          severity?: 'low' | 'medium' | 'high' | 'critical'
          payload?: string | null
          evidence?: Json | null
          confidence?: number
          verified?: boolean
          created_at?: string
        }
      }
      attack_patterns: {
        Row: {
          id: string
          project_id: string
          pattern_type: string
          pattern: Json
          success_rate: number
          usage_count: number
          last_success: string | null
          mutations: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          pattern_type: string
          pattern: Json
          success_rate?: number
          usage_count?: number
          last_success?: string | null
          mutations?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          pattern_type?: string
          pattern?: Json
          success_rate?: number
          usage_count?: number
          last_success?: string | null
          mutations?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      search_similar_memories: {
        Args: {
          project_uuid: string
          query_embedding: number[]
          match_count?: number
        }
        Returns: {
          id: string
          name: string
          content: Json
          similarity: number
        }[]
      }
      get_memory_tree: {
        Args: {
          project_uuid: string
        }
        Returns: {
          id: string
          parent_id: string | null
          name: string
          type: string
          color: string
          icon: string
          level: number
          path: string[]
        }[]
      }
    }
  }
}