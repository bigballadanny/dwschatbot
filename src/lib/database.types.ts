export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string | null
          content: string
          is_user: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id?: string | null
          content: string
          is_user?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string | null
          content?: string
          is_user?: boolean
          metadata?: Json | null
          created_at?: string
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
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      message_feedback: {
        Row: {
          id: string
          message_id: string
          user_id: string
          rating: number | null
          feedback_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          rating?: number | null
          feedback_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          rating?: number | null
          feedback_text?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      error_logs: {
        Row: {
          id: string
          function_name: string
          error_message: string | null
          error_stack: string | null
          request_body: string | null
          created_at: string
        }
        Insert: {
          id?: string
          function_name: string
          error_message?: string | null
          error_stack?: string | null
          request_body?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          function_name?: string
          error_message?: string | null
          error_stack?: string | null
          request_body?: string | null
          created_at?: string
        }
        Relationships: []
      }
      chat_cache: {
        Row: {
          id: string
          key: string
          value: Json
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          key: string
          value: Json
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          created_at?: string
          expires_at?: string | null
        }
        Relationships: []
      }
      ai_insights_cache: {
        Row: {
          id: number
          cache_key: string
          cached_at: string
          created_at: string
          insights_data: Json
        }
        Insert: {
          id?: number
          cache_key: string
          cached_at?: string
          created_at?: string
          insights_data: Json
        }
        Update: {
          id?: number
          cache_key?: string
          cached_at?: string
          created_at?: string
          insights_data?: Json
        }
        Relationships: []
      }
      chat_analytics: {
        Row: {
          id: string
          api_time_ms: number | null
          conversation_id: string | null
          created_at: string
          error_message: string | null
          query: string
          relevance_score: number | null
          response_length: number | null
          search_time_ms: number | null
          source_type: string | null
          successful: boolean | null
          transcript_title: string | null
          used_online_search: boolean | null
          user_id: string | null
        }
        Insert: {
          id?: string
          api_time_ms?: number | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          query: string
          relevance_score?: number | null
          response_length?: number | null
          search_time_ms?: number | null
          source_type?: string | null
          successful?: boolean | null
          transcript_title?: string | null
          used_online_search?: boolean | null
          user_id?: string | null
        }
        Update: {
          id?: string
          api_time_ms?: number | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          query?: string
          relevance_score?: number | null
          response_length?: number | null
          search_time_ms?: number | null
          source_type?: string | null
          successful?: boolean | null
          transcript_title?: string | null
          used_online_search?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          id: string
          user_id: string
          title: string
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      transcripts: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          tags: string[]
          status: string
          meeting_date: string | null
          duration_minutes: number | null
          participants: Json | null
          key_topics: string[] | null
          action_items: Json | null
          site_name: string | null
          division: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          tags?: string[]
          status?: string
          meeting_date?: string | null
          duration_minutes?: number | null
          participants?: Json | null
          key_topics?: string[] | null
          action_items?: Json | null
          site_name?: string | null
          division?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          tags?: string[]
          status?: string
          meeting_date?: string | null
          duration_minutes?: number | null
          participants?: Json | null
          key_topics?: string[] | null
          action_items?: Json | null
          site_name?: string | null
          division?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      embeddings: {
        Row: {
          id: string
          content: string
          metadata: Json | null
          embedding: number[]
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          metadata?: Json | null
          embedding: number[]
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          metadata?: Json | null
          embedding?: number[]
          created_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          provider: string
          provider_token: string | null
          provider_account_id: string
          provider_refresh_token: string | null
          access_token: string | null
          expires_at: string | null
          token_type: string | null
          scope: string | null
          id_token: string | null
          session_state: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider: string
          provider_token?: string | null
          provider_account_id: string
          provider_refresh_token?: string | null
          access_token?: string | null
          expires_at?: string | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: string
          provider_token?: string | null
          provider_account_id?: string
          provider_refresh_token?: string | null
          access_token?: string | null
          expires_at?: string | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}