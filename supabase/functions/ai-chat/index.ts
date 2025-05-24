import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = 'gemini-2.0-flash'

// M&A specific prompts
const SYSTEM_RULES = `You are an AI assistant specializing in M&A (Mergers and Acquisitions) based on Carl Allen's teachings. 

Key behaviors:
1. Be conversational but professional
2. Ask 1-2 relevant follow-up questions to better understand the user's situation
3. Focus on practical, actionable advice
4. Reference specific deal structures when relevant
5. Keep responses concise but comprehensive

When unsure about specific details, acknowledge it and ask clarifying questions.`

// Helper to generate follow-up questions
function generateFollowUpQuestions(query: string, context: string): string[] {
  const questions = []
  
  // Topic-based follow-ups
  if (query.toLowerCase().includes('valuation')) {
    questions.push("What industry is the target business in?")
    questions.push("Do you have access to their financial statements?")
  } else if (query.toLowerCase().includes('financing')) {
    questions.push("What's your available capital for this acquisition?")
    questions.push("Have you considered seller financing options?")
  } else if (query.toLowerCase().includes('due diligence')) {
    questions.push("What's your timeline for completing the acquisition?")
    questions.push("Have you identified any red flags so far?")
  } else if (query.toLowerCase().includes('negotiat')) {
    questions.push("What's your walk-away point for this deal?")
    questions.push("Have you identified the seller's key motivations?")
  }
  
  // Default questions if no specific topic
  if (questions.length === 0) {
    questions.push("What stage of the acquisition process are you currently in?")
    questions.push("What's your biggest concern about this deal?")
  }
  
  return questions.slice(0, 2) // Max 2 questions
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  let ragChunkCount = 0
  let relevantContext = ""
  let chunkSources: any[] = []
  let isUnknownQuery = false

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { query, messages, conversationId, enableOnlineSearch, requestId } = await req.json()
    
    console.log(`[${requestId}] Processing query: "${query?.substring(0, 50)}..."`)

    // Get conversation context
    let conversationContext = null
    if (conversationId) {
      const { data: contextData } = await supabase
        .from('conversation_context')
        .select('*')
        .eq('conversation_id', conversationId)
        .single()
      
      conversationContext = contextData
    }

    // Search for relevant chunks
    if (query) {
      try {
        console.log(`[${requestId}] Searching RAG chunks...`)
        
        // Enhanced chunk search with better relevance
        const { data: chunks, error: searchError } = await supabase
          .from('chunks')
          .select('id, content, chunk_type, transcript_id, topic, metadata')
          .textSearch('content', query)
          .limit(10) // Get more chunks for better context
        
        if (!searchError && chunks && chunks.length > 0) {
          // Score and sort chunks by relevance
          const scoredChunks = chunks.map(chunk => {
            const content = chunk.content.toLowerCase()
            const queryLower = query.toLowerCase()
            const queryWords = queryLower.split(' ')
            
            // Calculate relevance score
            let score = 0
            queryWords.forEach(word => {
              if (content.includes(word)) score += 1
            })
            
            // Boost score for exact phrase matches
            if (content.includes(queryLower)) score += 5
            
            // Boost for matching chunk type
            if (chunk.chunk_type === 'parent') score += 2
            
            return { ...chunk, relevanceScore: score }
          })
          
          // Sort by relevance and take top 5
          const topChunks = scoredChunks
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 5)
          
          ragChunkCount = topChunks.length
          console.log(`[${requestId}] Found ${ragChunkCount} relevant chunks`)
          
          // Build context
          relevantContext = topChunks
            .map(chunk => `[${chunk.chunk_type}] ${chunk.content}`)
            .join('\n\n---\n\n')
          
          // Track sources with metadata
          const transcriptIds = [...new Set(topChunks.map(c => c.transcript_id))]
          chunkSources = await Promise.all(
            transcriptIds.map(async (tid) => {
              const { data: transcript } = await supabase
                .from('transcripts')
                .select('id, title, source')
                .eq('id', tid)
                .single()
              return transcript
            })
          )
        } else {
          console.log(`[${requestId}] No relevant chunks found`)
          isUnknownQuery = true
        }
      } catch (ragError) {
        console.error(`[${requestId}] RAG search error:`, ragError)
      }
    }

    // Check verified knowledge base
    let verifiedAnswer = null
    if (query && !relevantContext) {
      const { data: knowledge } = await supabase
        .from('verified_knowledge')
        .select('*')
        .textSearch('question', query)
        .limit(1)
      
      if (knowledge && knowledge.length > 0) {
        verifiedAnswer = knowledge[0]
        console.log(`[${requestId}] Found verified answer`)
        
        // Update usage count
        await supabase
          .from('verified_knowledge')
          .update({ usage_count: verifiedAnswer.usage_count + 1 })
          .eq('id', verifiedAnswer.id)
      }
    }

    // Prepare enhanced system prompt
    let systemPrompt = SYSTEM_RULES + '\n\n'
    
    if (conversationContext) {
      systemPrompt += `Conversation context: ${conversationContext.context_summary}\n`
      systemPrompt += `Key topics discussed: ${conversationContext.key_topics?.join(', ')}\n\n`
    }
    
    if (verifiedAnswer) {
      systemPrompt += `Verified answer from knowledge base:\n${verifiedAnswer.answer}\n\n`
    } else if (relevantContext) {
      systemPrompt += `Context from transcripts:\n${relevantContext}\n\n`
      systemPrompt += `Use this context to provide accurate answers based on Carl Allen's methodology.`
    } else {
      systemPrompt += `Note: No specific context found for this query. Provide general guidance based on M&A best practices.`
    }

    // Call Gemini API
    let responseText = ''
    let followUpQuestions: string[] = []
    
    try {
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured')
      }

      // Prepare conversation history
      const chatHistory = messages.slice(-10).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content || msg.parts?.[0]?.text || '' }]
      }))

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
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
      
      // Generate follow-up questions
      followUpQuestions = generateFollowUpQuestions(query, responseText)
      
    } catch (error) {
      console.error(`[${requestId}] Gemini API error:`, error)
      responseText = 'I apologize, but I encountered an error. Please try again.'
    }

    const processingTime = Date.now() - startTime
    const ragPercentage = ragChunkCount > 0 ? Math.min(100, ragChunkCount * 20) : 0

    // Track unknown queries if needed
    if (isUnknownQuery && query) {
      await supabase.rpc('track_unknown_query', {
        p_query: query,
        p_conversation_id: conversationId,
        p_user_id: user.id
      })
    }

    // Update conversation context
    if (conversationId) {
      await supabase
        .from('conversation_context')
        .upsert({
          conversation_id: conversationId,
          context_summary: `Last query: ${query}`,
          key_topics: [/* Extract topics from conversation */],
          message_count: messages.length,
          updated_at: new Date().toISOString()
        })
    }

    // Log enhanced analytics
    await supabase.from('chat_analytics').insert({
      conversation_id: conversationId,
      query: query,
      response_length: responseText.length,
      source_type: verifiedAnswer ? 'knowledge_base' : (ragChunkCount > 0 ? 'rag' : 'direct'),
      api_time_ms: processingTime,
      successful: true,
      used_online_search: enableOnlineSearch || false,
      rag_chunk_count: ragChunkCount,
      response_metadata: {
        rag_percentage: ragPercentage,
        sources_count: chunkSources.length,
        has_verified_answer: !!verifiedAnswer,
        is_unknown_query: isUnknownQuery,
        model_used: GEMINI_MODEL
      },
      follow_up_questions: followUpQuestions
    })

    // Build enhanced response
    const response = {
      content: responseText,
      source: verifiedAnswer ? 'knowledge_base' : (ragChunkCount > 0 ? 'rag' : 'gemini'),
      citations: chunkSources.length > 0 ? chunkSources : undefined,
      conversationId: conversationId,
      model: GEMINI_MODEL,
      metadata: {
        ragContext: ragChunkCount > 0,
        ragPercentage: ragPercentage,
        processingTime: processingTime,
        followUpQuestions: followUpQuestions,
        sourcesUsed: chunkSources.map(s => s?.title).filter(Boolean)
      }
    }

    console.log(`[${requestId}] Response ready - RAG: ${ragPercentage}%, Time: ${processingTime}ms`)

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('[ERROR] ai-chat function:', error)
    
    return new Response(
      JSON.stringify({
        content: 'I apologize, but I encountered an error processing your request.',
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
