import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Gemini API configuration (using Google AI Studio API)
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = 'gemini-2.0-flash'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { query, messages, conversationId, enableOnlineSearch, requestId } = await req.json()

    // Search for relevant chunks from transcripts
    let relevantContext = "";
    let chunkSources: string[] = [];
    
    if (query) {
      try {
        console.log(`Searching for relevant chunks for query: "${query}"`);
        
        // Search for relevant chunks using vector similarity
        const { data: chunks, error: searchError } = await supabase
          .rpc('search_chunks', {
            query_text: query,
            match_count: 5
          });
        
        if (!searchError && chunks && chunks.length > 0) {
          console.log(`Found ${chunks.length} relevant chunks`);
          
          // Build context from chunks
          relevantContext = chunks
            .map((chunk: any) => `[${chunk.chunk_type}] ${chunk.content}`)
            .join('\n\n---\n\n');
          
          // Track unique transcript sources
          const uniqueTranscriptIds = [...new Set(chunks.map((c: any) => c.transcript_id))];
          chunkSources = uniqueTranscriptIds as string[];
        }
      } catch (ragError) {
        console.error("Error in RAG search:", ragError);
        // Continue without RAG context
      }
    }

    // Call Gemini AI directly
    let responseText = '';
    const startTime = Date.now();
    
    try {
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      // Prepare messages for Gemini
      const chatHistory = messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content || msg.parts?.[0]?.text || '' }]
      }))

      // Add context if available
      const systemPrompt = relevantContext ? 
        `You are an AI assistant helping with M&A (Mergers and Acquisitions) questions based on Carl Allen's teachings. 

Context from knowledge base:
${relevantContext}

Use this context along with your general knowledge to provide helpful, accurate answers about deal-making, business acquisitions, and related topics.` :
        `You are an AI assistant helping with M&A (Mergers and Acquisitions) questions based on Carl Allen's teachings.`;

      // Call Gemini API
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: chatHistory,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
              topP: 0.95,
              topK: 40
            }
          })
        }
      )

      if (!geminiResponse.ok) {
        const error = await geminiResponse.text()
        throw new Error(`Gemini API error: ${geminiResponse.status} - ${error}`)
      }

      const geminiData = await geminiResponse.json()
      responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
      
    } catch (error) {
      console.error('Error calling Gemini AI:', error)
      responseText = 'I apologize, but I encountered an error processing your request. Please try again.'
    }

    const apiTime = Date.now() - startTime;

    // Log analytics
    try {
      await supabase.from('chat_analytics').insert({
        conversation_id: conversationId,
        query: query,
        response_length: responseText.length,
        source_type: chunkSources.length > 0 ? 'rag' : 'direct',
        api_time_ms: apiTime,
        successful: true,
        used_online_search: enableOnlineSearch || false,
      })
    } catch (analyticsError) {
      console.error('Failed to log analytics:', analyticsError)
    }

    // Return response
    return new Response(
      JSON.stringify({
        content: responseText,
        source: 'gemini-ai',
        citations: chunkSources.length > 0 ? chunkSources : undefined,
        conversationId: conversationId,
        model: GEMINI_MODEL,
        ragContext: relevantContext.length > 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
    
  } catch (error) {
    console.error('Error in ai-chat function:', error)
    
    return new Response(
      JSON.stringify({
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        error: error.message,
        conversationId: null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
