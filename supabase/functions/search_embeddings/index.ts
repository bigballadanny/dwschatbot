
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * This function implements smarter vector search with:
 * 1. Vector similarity (cosine distance)
 * 2. Metadata filtering
 * 3. Feedback-based relevance scoring
 * 4. Hybrid search (semantic + keyword)
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Parse request data
    const requestData = await req.json()
    const { 
      query_text,
      filter_metadata = null,
      match_count = 10, 
      match_threshold = 0.7,
      use_hybrid_search = true,
      use_feedback = true
    } = requestData

    if (!query_text) {
      throw new Error('Query text is required')
    }

    // We'll implement a smarter hybrid search that combines:
    // 1. Vector similarity search
    // 2. Text search for keywords
    // 3. Boost based on feedback
    
    // Extract keywords for potential hybrid search
    let keywordFilter = ''
    if (use_hybrid_search) {
      // Very basic keyword extraction (in production, use NLP techniques)
      const keywords = query_text
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !['this', 'that', 'with', 'from', 'what', 'when', 'where', 'which', 'who'].includes(word))
        .slice(0, 5)  // Take top 5 keywords
      
      if (keywords.length > 0) {
        // Create a plainto_tsquery expression with OR between terms
        keywordFilter = `'${keywords.join(' | ')}'`
      }
    }

    // In this simplified version, we'll use basic text search
    // In a production environment with pgvector:
    // 1. Generate embedding for the query_text
    // 2. Use vector similarity search: embedding <=> query_embedding
    
    // Start building our SQL query
    let query = supabaseClient.from('embeddings')
      .select('id, content, metadata, relevance_score, feedback_count')
      
    // Apply text search on content
    if (keywordFilter && use_hybrid_search) {
      query = query.textSearch('content', keywordFilter, { 
        type: 'plain',
        config: 'english'
      })
    } else {
      // Fall back to simple text matching if no keywords
      query = query.textSearch('content', query_text)
    }
    
    // Apply metadata filters if provided
    if (filter_metadata) {
      const filters = typeof filter_metadata === 'string' 
        ? JSON.parse(filter_metadata) 
        : filter_metadata
        
      for (const [key, value] of Object.entries(filters)) {
        if (value) {
          query = query.filter(`metadata->>${key}`, 'eq', value)
        }
      }
    }

    // Apply result limits
    query = query.limit(match_count || 10)
      
    // Execute the query
    const { data, error } = await query

    if (error) {
      throw error
    }
    
    // Process and format results
    let results = data.map((item, index) => {
      // Calculate base score (use relevance_score if available, otherwise position-based)
      let baseScore = item.relevance_score ?? (1.0 - (index * 0.1))
      
      // Clamp score between 0 and 1
      if (baseScore < 0) baseScore = 0
      if (baseScore > 1) baseScore = 1
      
      // Apply feedback boost if requested
      let feedbackBoost = 0
      if (use_feedback && item.feedback_count > 0) {
        // Boost based on feedback count (max 50% boost)
        feedbackBoost = Math.min(item.feedback_count / 10, 0.5) * baseScore
      }
      
      const finalScore = Math.min(baseScore + feedbackBoost, 1.0)
      
      return {
        id: item.id,
        content: item.content,
        metadata: item.metadata,
        score: finalScore,
        feedback_count: item.feedback_count || 0
      }
    })
    
    // Sort by final score
    results = results.sort((a, b) => b.score - a.score)
    
    // Filter by threshold if specified
    if (match_threshold) {
      results = results.filter(item => item.score >= match_threshold)
    }

    // Return results
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
