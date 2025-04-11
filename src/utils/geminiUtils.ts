
import { SupabaseClient } from '@supabase/supabase-js';

// Define types for our analytics data
interface BaseAnalyticsData {
  userId?: string;
  query: string;
  response: string;
  conversationId?: string;
  source: string;
  responseTime: number;
  tokensUsed: number;
  cost: number;
  isAudioEnabled: boolean;
}

interface AudioAnalyticsData {
  audioDuration: number | null;
  audioCost: number | null;
  audioTokens: number | null;
}

interface ModelData {
  geminiModel: string;
  geminiApiKey?: string;
  geminiEmbeddingModel?: string;
  geminiEmbeddingApiKey?: string;
}

interface EmbeddingData {
  embeddingTime: number | null;
  embeddingTokens: number | null;
  embeddingCost: number | null;
}

interface VectorSearchData {
  isVectorSearch: boolean;
  vectorSearchTime: number | null;
  vectorSearchCost: number | null;
  vectorSearchResults: number | null;
}

interface RagData {
  isRagEnabled: boolean;
  ragTime: number | null;
  ragCost: number | null;
  ragResults: number | null;
}

interface ToolUseData {
  isToolUse: boolean;
  toolUseTime: number | null;
  toolUseCost: number | null;
  toolUseResults: number | null;
  toolUseTokens: number | null;
  toolUseName: string | null;
  toolUseDescription: string | null;
  toolUseInput: string | null;
  toolUseOutput: string | null;
  toolUseError: string | null;
  toolUseSuccess: boolean | null;
  toolUseModel: string | null;
  toolUseApiKey: string | null;
}

interface ToolEmbeddingData {
  toolUseEmbeddingModel: string | null;
  toolUseEmbeddingApiKey: string | null;
  toolUseEmbeddingTime: number | null;
  toolUseEmbeddingCost: number | null;
  toolUseEmbeddingTokens: number | null;
}

interface ToolVectorData {
  toolUseVectorSearch: boolean | null;
  toolUseVectorSearchTime: number | null;
  toolUseVectorSearchCost: number | null;
  toolUseVectorSearchResults: number | null;
}

interface ToolRagData {
  toolUseRag: boolean | null;
  toolUseRagTime: number | null;
  toolUseRagCost: number | null;
  toolUseRagResults: number | null;
}

interface ToolLlmData {
  toolUseLlm: string | null;
  toolUseLlmTime: number | null;
  toolUseLlmCost: number | null;
  toolUseLlmTokens: number | null;
  toolUseLlmError: string | null;
  toolUseLlmSuccess: boolean | null;
  toolUseLlmModel: string | null;
  toolUseLlmApiKey: string | null;
}

// Combined analytics data interface
export interface AnalyticsData extends 
  BaseAnalyticsData, 
  AudioAnalyticsData, 
  ModelData, 
  EmbeddingData, 
  VectorSearchData, 
  RagData, 
  ToolUseData, 
  ToolEmbeddingData, 
  ToolVectorData, 
  ToolRagData, 
  ToolLlmData {}

/**
 * Log analytics data to Supabase
 * @param supabase Supabase client
 * @param data Analytics data object containing all parameters
 */
export const logAnalytics = async (
  supabase: SupabaseClient,
  data: AnalyticsData
): Promise<void> => {
  try {
    await supabase.from('analytics').insert([{
      user_id: data.userId,
      query: data.query,
      response: data.response,
      conversation_id: data.conversationId,
      source: data.source,
      response_time: data.responseTime,
      tokens_used: data.tokensUsed,
      cost: data.cost,
      is_audio_enabled: data.isAudioEnabled,
      audio_duration: data.audioDuration,
      audio_cost: data.audioCost,
      audio_tokens: data.audioTokens,
      gemini_model: data.geminiModel,
      gemini_api_key: data.geminiApiKey ? true : false,
      gemini_embedding_model: data.geminiEmbeddingModel,
      gemini_embedding_api_key: data.geminiEmbeddingApiKey ? true : false,
      embedding_time: data.embeddingTime,
      embedding_tokens: data.embeddingTokens,
      embedding_cost: data.embeddingCost,
      is_vector_search: data.isVectorSearch,
      vector_search_time: data.vectorSearchTime,
      vector_search_cost: data.vectorSearchCost,
      vector_search_results: data.vectorSearchResults,
      is_rag_enabled: data.isRagEnabled,
      rag_time: data.ragTime,
      rag_cost: data.ragCost,
      rag_results: data.ragResults,
      is_tool_use: data.isToolUse,
      tool_use_time: data.toolUseTime,
      tool_use_cost: data.toolUseCost,
      tool_use_results: data.toolUseResults,
      tool_use_tokens: data.toolUseTokens,
      tool_use_name: data.toolUseName,
      tool_use_description: data.toolUseDescription,
      tool_use_input: data.toolUseInput,
      tool_use_output: data.toolUseOutput,
      tool_use_error: data.toolUseError,
      tool_use_success: data.toolUseSuccess,
      tool_use_model: data.toolUseModel,
      tool_use_api_key: data.toolUseApiKey ? true : false,
      tool_use_embedding_model: data.toolUseEmbeddingModel,
      tool_use_embedding_api_key: data.toolUseEmbeddingApiKey ? true : false,
      tool_use_embedding_time: data.toolUseEmbeddingTime,
      tool_use_embedding_cost: data.toolUseEmbeddingCost,
      tool_use_embedding_tokens: data.toolUseEmbeddingTokens,
      tool_use_vector_search: data.toolUseVectorSearch,
      tool_use_vector_search_time: data.toolUseVectorSearchTime,
      tool_use_vector_search_cost: data.toolUseVectorSearchCost,
      tool_use_vector_search_results: data.toolUseVectorSearchResults,
      tool_use_rag: data.toolUseRag,
      tool_use_rag_time: data.toolUseRagTime,
      tool_use_rag_cost: data.toolUseRagCost,
      tool_use_rag_results: data.toolUseRagResults,
      tool_use_llm: data.toolUseLlm,
      tool_use_llm_time: data.toolUseLlmTime,
      tool_use_llm_cost: data.toolUseLlmCost,
      tool_use_llm_tokens: data.toolUseLlmTokens,
      tool_use_llm_error: data.toolUseLlmError,
      tool_use_llm_success: data.toolUseLlmSuccess,
      tool_use_llm_model: data.toolUseLlmModel,
      tool_use_llm_api_key: data.toolUseLlmApiKey ? true : false
      // Nested tool use data can be added if needed in the future
    }]);
  } catch (error) {
    console.error('Error logging analytics:', error);
  }
};
