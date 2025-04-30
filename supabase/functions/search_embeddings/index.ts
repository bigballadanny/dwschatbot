
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const { query_text, filter_metadata, match_count, match_threshold } = await req.json()

    if (!query_text) {
      throw new Error('Query text is required')
    }

    // For now, we'll do a simple text search since we need to create embeddings first
    // In a production environment, you'd generate embeddings for the query here
    
    // Build the SQL query
    let query = supabaseClient.from('embeddings')
      .select('id, content, metadata, relevance_score')
      .textSearch('content', query_text)
    
    // Apply metadata filters if provided
    if (filter_metadata) {
      const filters = JSON.parse(filter_metadata)
      for (const [key, value] of Object.entries(filters)) {
        query = query.filter(`metadata->${key}`, 'eq', value)
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
    const results = data.map((item, index) => {
      // For now, use relevance_score if available or position-based scoring
      const score = item.relevance_score ?? (1.0 - (index * 0.1))
      return {
        id: item.id,
        content: item.content,
        metadata: item.metadata,
        score: score 
      }
    })
    
    // Filter by threshold if specified
    const filteredResults = match_threshold 
      ? results.filter(item => item.score >= match_threshold)
      : results

    // Return results
    return new Response(JSON.stringify(filteredResults), {
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
