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
      ai_insights_cache: {
        Row: {
          cache_key: string
          cached_at: string
          created_at: string
          id: number
          insights_data: Json
        }
        Insert: {
          cache_key: string
          cached_at?: string
          created_at?: string
          id?: number
          insights_data: Json
        }
        Update: {
          cache_key?: string
          cached_at?: string
          created_at?: string
          id?: number
          insights_data?: Json
        }
        Relationships: []
      }
      chat_analytics: {
        Row: {
          api_time_ms: number | null
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          query: string
          relevance_score: number | null
          response_length: number | null
          search_time_ms: number | null
          source_type: string | null
          successful: boolean | null
          transcript_title: string | null
          used_online_search: boolean | null
        }
        Insert: {
          api_time_ms?: number | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          query: string
          relevance_score?: number | null
          response_length?: number | null
          search_time_ms?: number | null
          source_type?: string | null
          successful?: boolean | null
          transcript_title?: string | null
          used_online_search?: boolean | null
        }
        Update: {
          api_time_ms?: number | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          query?: string
          relevance_score?: number | null
          response_length?: number | null
          search_time_ms?: number | null
          source_type?: string | null
          successful?: boolean | null
          transcript_title?: string | null
          used_online_search?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_cache: {
        Row: {
          created_at: string
          model_used: string | null
          query_hash: string
          response: string
        }
        Insert: {
          created_at?: string
          model_used?: string | null
          query_hash: string
          response: string
        }
        Update: {
          created_at?: string
          model_used?: string | null
          query_hash?: string
          response?: string
        }
        Relationships: []
      }
      chunks: {
        Row: {
          chunk_type: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          topic: string | null
          transcript_id: string
        }
        Insert: {
          chunk_type: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          topic?: string | null
          transcript_id: string
        }
        Update: {
          chunk_type?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          topic?: string | null
          transcript_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunks_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      embedding_feedback: {
        Row: {
          comment: string | null
          created_at: string
          embedding_id: string | null
          id: string
          is_relevant: boolean
          query: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          embedding_id?: string | null
          id?: string
          is_relevant: boolean
          query: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          embedding_id?: string | null
          id?: string
          is_relevant?: boolean
          query?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embedding_feedback_embedding_id_fkey"
            columns: ["embedding_id"]
            isOneToOne: false
            referencedRelation: "embeddings"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          feedback_count: number | null
          id: string
          metadata: Json
          relevance_score: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          feedback_count?: number | null
          id?: string
          metadata?: Json
          relevance_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          feedback_count?: number | null
          id?: string
          metadata?: Json
          relevance_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      file_status: {
        Row: {
          created_at: string
          dependencies: string[] | null
          file_path: string
          id: string
          last_used: string
          status: string
          tags: string[] | null
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          dependencies?: string[] | null
          file_path: string
          id?: string
          last_used?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          dependencies?: string[] | null
          file_path?: string
          id?: string
          last_used?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      message_feedback: {
        Row: {
          comment: string | null
          conversation_id: string | null
          created_at: string
          id: string
          message_id: string | null
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_user: boolean | null
          metadata: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_user?: boolean | null
          metadata?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_user?: boolean | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transcript_summaries: {
        Row: {
          created_at: string
          id: string
          key_points: Json | null
          model_used: string | null
          summary: string
          token_count: number | null
          transcript_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_points?: Json | null
          model_used?: string | null
          summary: string
          token_count?: number | null
          transcript_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_points?: Json | null
          model_used?: string | null
          summary?: string
          token_count?: number | null
          transcript_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_summaries_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          content: string
          created_at: string
          file_path: string | null
          id: string
          is_processed: boolean | null
          is_summarized: boolean | null
          metadata: Json | null
          source: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_path?: string | null
          id?: string
          is_processed?: boolean | null
          is_summarized?: boolean | null
          metadata?: Json | null
          source?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_path?: string | null
          id?: string
          is_processed?: boolean | null
          is_summarized?: boolean | null
          metadata?: Json | null
          source?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      get_top_queries: {
        Args: { time_period: string; limit_count: number }
        Returns: {
          query: string
          count: number
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: { user_id: string; role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "manager"],
    },
  },
} as const
