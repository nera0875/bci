export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_valid: boolean | null
          last_verified_at: string | null
          metadata: Json | null
          service_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          is_valid?: boolean | null
          last_verified_at?: string | null
          metadata?: Json | null
          service_name: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_valid?: boolean | null
          last_verified_at?: string | null
          metadata?: Json | null
          service_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      attack_patterns: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          last_failure_at: string | null
          last_success: string | null
          last_success_at: string | null
          metadata: Json | null
          mutations: Json | null
          pattern: Json
          pattern_type: string
          project_id: string
          success_count: number | null
          success_rate: number | null
          technique: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          last_failure_at?: string | null
          last_success?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          mutations?: Json | null
          pattern: Json
          pattern_type: string
          project_id: string
          success_count?: number | null
          success_rate?: number | null
          technique?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          last_failure_at?: string | null
          last_success?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          mutations?: Json | null
          pattern?: Json
          pattern_type?: string
          project_id?: string
          success_count?: number | null
          success_rate?: number | null
          technique?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attack_patterns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          project_id: string
          role: string
          streaming: boolean | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          role: string
          streaming?: boolean | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          role?: string
          streaming?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          message_count: number | null
          project_id: string | null
          summary: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_count?: number | null
          project_id?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_count?: number | null
          project_id?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      implicit_rules: {
        Row: {
          action: Json
          condition: Json
          confidence: number
          created_at: string | null
          deprecated_at: string | null
          id: string
          name: string
          pattern_id: string | null
          project_id: string | null
          promoted_at: string | null
          rejection_count: number | null
          sample_size: number
          status: string
          success_rate: number | null
          updated_at: string | null
          user_id: string | null
          validation_count: number | null
        }
        Insert: {
          action: Json
          condition: Json
          confidence: number
          created_at?: string | null
          deprecated_at?: string | null
          id?: string
          name: string
          pattern_id?: string | null
          project_id?: string | null
          promoted_at?: string | null
          rejection_count?: number | null
          sample_size: number
          status?: string
          success_rate?: number | null
          updated_at?: string | null
          user_id?: string | null
          validation_count?: number | null
        }
        Update: {
          action?: Json
          condition?: Json
          confidence?: number
          created_at?: string | null
          deprecated_at?: string | null
          id?: string
          name?: string
          pattern_id?: string | null
          project_id?: string | null
          promoted_at?: string | null
          rejection_count?: number | null
          sample_size?: number
          status?: string
          success_rate?: number | null
          updated_at?: string | null
          user_id?: string | null
          validation_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "implicit_rules_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "learned_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "implicit_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      learned_patterns: {
        Row: {
          action: Json
          condition: Json
          confidence: number
          created_at: string | null
          decision_ids: string[] | null
          drift_score: number | null
          id: string
          last_validated: string | null
          pattern_type: string
          project_id: string | null
          sample_size: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action: Json
          condition: Json
          confidence: number
          created_at?: string | null
          decision_ids?: string[] | null
          drift_score?: number | null
          id?: string
          last_validated?: string | null
          pattern_type: string
          project_id?: string | null
          sample_size?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Json
          condition?: Json
          confidence?: number
          created_at?: string | null
          decision_ids?: string[] | null
          drift_score?: number | null
          id?: string
          last_validated?: string | null
          pattern_type?: string
          project_id?: string | null
          sample_size?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learned_patterns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_data: {
        Row: {
          created_at: string | null
          feedback: string | null
          id: string
          input_data: Json
          input_type: string
          output_data: Json
          output_type: string
          project_id: string | null
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          input_data: Json
          input_type: string
          output_data: Json
          output_type: string
          project_id?: string | null
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          input_data?: Json
          input_type?: string
          output_data?: Json
          output_type?: string
          project_id?: string | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          key: string
          label: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          key: string
          label: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          key?: string
          label?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          embedding: string | null
          end_position: number | null
          id: string
          metadata: Json | null
          node_id: string
          start_position: number | null
          updated_at: string | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          embedding?: string | null
          end_position?: number | null
          id?: string
          metadata?: Json | null
          node_id: string
          start_position?: number | null
          updated_at?: string | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          embedding?: string | null
          end_position?: number | null
          id?: string
          metadata?: Json | null
          node_id?: string
          start_position?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_chunks_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "memory_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_chunks_cache: {
        Row: {
          access_count: number | null
          cached_at: string | null
          chunk_id: string
          id: string
          last_accessed: string | null
        }
        Insert: {
          access_count?: number | null
          cached_at?: string | null
          chunk_id: string
          id?: string
          last_accessed?: string | null
        }
        Update: {
          access_count?: number | null
          cached_at?: string | null
          chunk_id?: string
          id?: string
          last_accessed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_chunks_cache_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "memory_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_facts: {
        Row: {
          content_hash: string | null
          created_at: string | null
          embedding: string | null
          fact: string
          id: string
          metadata: Json | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          content_hash?: string | null
          created_at?: string | null
          embedding?: string | null
          fact: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content_hash?: string | null
          created_at?: string | null
          embedding?: string | null
          fact?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_facts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_nodes: {
        Row: {
          color: string | null
          content: Json | null
          created_at: string | null
          embedding: string | null
          icon: string | null
          id: string
          metadata: Json | null
          name: string
          parent_id: string | null
          position: number | null
          project_id: string
          section: string
          type: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          content?: Json | null
          created_at?: string | null
          embedding?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          name: string
          parent_id?: string | null
          position?: number | null
          project_id: string
          section?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          content?: Json | null
          created_at?: string | null
          embedding?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          position?: number | null
          project_id?: string
          section?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "memory_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      message_cache: {
        Row: {
          content_hash: string
          created_at: string | null
          id: string
          last_used: string | null
          response: Json
          response_embedding: string | null
          usage_count: number | null
        }
        Insert: {
          content_hash: string
          created_at?: string | null
          id?: string
          last_used?: string | null
          response: Json
          response_embedding?: string | null
          usage_count?: number | null
        }
        Update: {
          content_hash?: string
          created_at?: string | null
          id?: string
          last_used?: string | null
          response?: Json
          response_embedding?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          content_hash: string | null
          conversation_id: string | null
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          role: string | null
          token_count: number | null
        }
        Insert: {
          content: string
          content_hash?: string | null
          conversation_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          role?: string | null
          token_count?: number | null
        }
        Update: {
          content?: string
          content_hash?: string | null
          conversation_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          role?: string | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      patterns: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          last_used: string | null
          pattern_name: string
          pattern_type: string
          payload: string | null
          project_id: string | null
          success_rate: number | null
          times_used: number | null
          validated: boolean | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          last_used?: string | null
          pattern_name: string
          pattern_type: string
          payload?: string | null
          project_id?: string | null
          success_rate?: number | null
          times_used?: number | null
          validated?: boolean | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          last_used?: string | null
          pattern_name?: string
          pattern_type?: string
          payload?: string | null
          project_id?: string | null
          success_rate?: number | null
          times_used?: number | null
          validated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "patterns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          created_at: string | null
          id: string
          prediction_type: string
          probability: number
          project_id: string | null
          reasoning: string | null
          target: string
          validated: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          prediction_type: string
          probability: number
          project_id?: string | null
          reasoning?: string | null
          target: string
          validated?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          prediction_type?: string
          probability?: number
          project_id?: string | null
          reasoning?: string | null
          target?: string
          validated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          api_keys: Json | null
          created_at: string | null
          goal: string | null
          id: string
          name: string
          project_type: string | null
          settings: Json | null
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          api_keys?: Json | null
          created_at?: string | null
          goal?: string | null
          id?: string
          name: string
          project_type?: string | null
          settings?: Json | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          api_keys?: Json | null
          created_at?: string | null
          goal?: string | null
          id?: string
          name?: string
          project_type?: string | null
          settings?: Json | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          body: string | null
          created_at: string | null
          embedding: string | null
          headers: Json | null
          id: string
          method: string | null
          parsed_data: Json | null
          project_id: string
          tested: boolean | null
          url: string | null
          vulnerability_score: number | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          embedding?: string | null
          headers?: Json | null
          id?: string
          method?: string | null
          parsed_data?: Json | null
          project_id: string
          tested?: boolean | null
          url?: string | null
          vulnerability_score?: number | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          embedding?: string | null
          headers?: Json | null
          id?: string
          method?: string | null
          parsed_data?: Json | null
          project_id?: string
          tested?: boolean | null
          url?: string | null
          vulnerability_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          action: string
          action_config: Json | null
          action_instructions: string | null
          action_type: string | null
          applies_to_node_id: string | null
          category: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          focus_type: string | null
          icon: string | null
          id: string
          metadata: Json | null
          name: string
          priority: number | null
          project_id: string
          target_categories: string[] | null
          target_folders: string[] | null
          target_tags: string[] | null
          trigger: string
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          action: string
          action_config?: Json | null
          action_instructions?: string | null
          action_type?: string | null
          applies_to_node_id?: string | null
          category?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          focus_type?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          name: string
          priority?: number | null
          project_id: string
          target_categories?: string[] | null
          target_folders?: string[] | null
          target_tags?: string[] | null
          trigger: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          action?: string
          action_config?: Json | null
          action_instructions?: string | null
          action_type?: string | null
          applies_to_node_id?: string | null
          category?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          focus_type?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          priority?: number | null
          project_id?: string
          target_categories?: string[] | null
          target_folders?: string[] | null
          target_tags?: string[] | null
          trigger?: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rules_applies_to_node_id_fkey"
            columns: ["applies_to_node_id"]
            isOneToOne: false
            referencedRelation: "memory_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions_queue: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          processed_at: string | null
          processed_by: string | null
          project_id: string
          status: string
          suggestion: Json
          type: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          project_id: string
          status?: string
          suggestion: Json
          type: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          project_id?: string
          status?: string
          suggestion?: Json
          type?: string
        }
        Relationships: []
      }
      system_prompts: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_prompts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      table_data: {
        Row: {
          created_at: string | null
          id: string
          node_id: string
          row_data: Json
          row_index: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          node_id: string
          row_data?: Json
          row_index?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          node_id?: string
          row_data?: Json
          row_index?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_data_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "memory_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_templates: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          name: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          project_id: string | null
          result: Json | null
          status: string | null
          technique: string
          tested_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          project_id?: string | null
          result?: Json | null
          status?: string | null
          technique: string
          tested_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          project_id?: string | null
          result?: Json | null
          status?: string | null
          technique?: string
          tested_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof Database["public"]["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
  ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
