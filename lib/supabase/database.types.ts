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
          type: 'folder' | 'document'
          name: string
          content: Json | null
          embedding: number[] | null
          color: string | null
          icon: string | null
          parent_id: string | null
          metadata: Json | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: 'folder' | 'document'
          name: string
          content?: Json | null
          embedding?: number[] | null
          color?: string | null
          icon?: string | null
          parent_id?: string | null
          metadata?: Json | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: 'folder' | 'document'
          name?: string
          content?: Json | null
          embedding?: number[] | null
          color?: string | null
          icon?: string | null
          parent_id?: string | null
          metadata?: Json | null
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      table_data: {
        Row: {
          id: string
          node_id: string
          row_index: number
          row_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          node_id: string
          row_index?: number
          row_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          node_id?: string
          row_index?: number
          row_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
      table_columns: {
        Row: {
          id: string
          node_id: string
          column_name: string
          column_type: 'text' | 'select' | 'number' | 'boolean' | 'date' | 'tags'
          column_options: Json
          visible: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          node_id: string
          column_name: string
          column_type: 'text' | 'select' | 'number' | 'boolean' | 'date' | 'tags'
          column_options?: Json
          visible?: boolean
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          node_id?: string
          column_name?: string
          column_type?: 'text' | 'select' | 'number' | 'boolean' | 'date' | 'tags'
          column_options?: Json
          visible?: boolean
          order_index?: number
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          project_id: string
          conversation_id: string | null
          role: 'user' | 'assistant' | 'system'
          content: string
          streaming: boolean | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          conversation_id?: string | null
          role: 'user' | 'assistant' | 'system'
          content: string
          streaming?: boolean | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          conversation_id?: string | null
          role?: 'user' | 'assistant' | 'system'
          content?: string
          streaming?: boolean | null
          metadata?: Json | null
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          project_id: string
          title: string
          is_active: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      message_cache: {
        Row: {
          id: string
          content_hash: string
          response: string
          usage_count: number
          last_used: string
          created_at: string
        }
        Insert: {
          id?: string
          content_hash: string
          response: string
          usage_count?: number
          last_used?: string
          created_at?: string
        }
        Update: {
          id?: string
          content_hash?: string
          response?: string
          usage_count?: number
          last_used?: string
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
          config: Json | null
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
          config?: Json | null
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
          config?: Json | null
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
          mutations: Json | null
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
          mutations?: Json | null
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
          mutations?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      folder_rules: {
        Row: {
          id: string
          project_id: string
          folder_id: string
          rule_name: string
          rule_description: string | null
          rule_type: 'behavior' | 'validation' | 'formatting' | 'security'
          rule_content: string
          is_active: boolean
          priority: number
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          folder_id: string
          rule_name: string
          rule_description?: string | null
          rule_type?: 'behavior' | 'validation' | 'formatting' | 'security'
          rule_content: string
          is_active?: boolean
          priority?: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          folder_id?: string
          rule_name?: string
          rule_description?: string | null
          rule_type?: 'behavior' | 'validation' | 'formatting' | 'security'
          rule_content?: string
          is_active?: boolean
          priority?: number
          metadata?: Json | null
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
      search_similar_nodes: {
        Args: {
          query_embedding: number[]
          project_id: string
          match_limit?: number
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
