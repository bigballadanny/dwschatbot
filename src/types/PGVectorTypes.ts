
/**
 * Type definitions for PGVector-related components
 */

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
  feedback_count: number;
}

export interface SearchParams {
  query_text: string;
  filter_metadata?: Record<string, any> | null;
  match_count?: number;
  match_threshold?: number;
  use_hybrid_search?: boolean;
  use_feedback?: boolean;
}

export interface ChunkingOptions {
  chunk_size?: number;
  overlap?: number;
  max_chars_per_chunk?: number;
  strategy?: 'sentence' | 'paragraph' | 'section';
}

export interface EmbeddingMetadata {
  transcript_id?: string;
  topic?: string;
  source?: string;
  chunk_index?: number;
  chunk_count?: number;
  chunking_strategy?: string;
  user_id?: string;
  rechunked?: boolean;
}

export interface ChunkingAnalysisResult {
  chunk_count: number;
  avg_chunk_length: number;
  min_chunk_length: number;
  max_chunk_length: number;
  std_dev: number;
  possible_issues: string[];
}

export interface TokenEstimate {
  chunk_count: number;
  total_characters: number;
  estimated_tokens: number;
  estimated_cost_usd: number;
}
