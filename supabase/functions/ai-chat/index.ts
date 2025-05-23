// --- Imports ---
// @ts-ignore Deno-style import, valid in Supabase Edge Functions
import { encode } from "https://esm.sh/gpt-tokenizer@2.1.1";
// @ts-ignore Deno-style import, valid in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore Deno standard library
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// --- Utility Functions ---

/**
 * Truncates a message transcript to a maximum token count using a tokenizer, keeping the most recent messages.
 * @param messages The array of chat messages to truncate.
 * @param maxTokens The maximum number of tokens allowed in the transcript.
 * @returns The truncated array of chat messages.
 */
function truncateTranscript(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    let currentTokenCount = 0;
    const truncatedMessages: ChatMessage[] = [];
    let originalTokenCount = 0;

    // Calculate actual original tokens using the tokenizer
    messages.forEach(message => {
        try {
            // Ensure parts exist and text is defined before encoding
            const textToEncode = message.parts?.[0]?.text;
            if (typeof textToEncode === 'string') {
                originalTokenCount += encode(textToEncode).length;
            }
        } catch (e) {
            console.error("Tokenizer error during initial count:", e);
        }
    });

    // Iterate backwards through the messages
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        const messageText = message.parts?.[0]?.text;
        let messageTokens = 0;

        // Only encode if text exists
        if (typeof messageText === 'string') {
            try {
                messageTokens = encode(messageText).length;
            } catch (e) {
                console.error("Tokenizer error during truncation loop:", e);
                // Skip this message if tokenizer fails
                continue;
            }
        } else {
            // Skip message if it has no text part
            continue;
        }

        // Stop if adding the next message would exceed the limit
        if (currentTokenCount + messageTokens > maxTokens) {
            // If even the first message (most recent) is too long, attempt to truncate it (still approximate)
            // A truly accurate truncation would involve encoding, slicing tokens, and decoding.
            if (truncatedMessages.length === 0 && messageTokens > maxTokens && typeof messageText === 'string') {
                console.warn(`Truncating the most recent message as its token count (${messageTokens}) exceeds maxTokens (${maxTokens}). Inner truncation is approximate.`);
                // Attempt a character-based approximation for truncation
                const avgCharsPerToken = messageText.length / messageTokens;
                const allowedChars = Math.floor(maxTokens * avgCharsPerToken * 0.9); // Be conservative
                const truncatedText = messageText.slice(-allowedChars);
                let truncatedTokens = maxTokens; // Assume it fills the budget after truncation
                try {
                    // Try to get a more accurate count of the truncated text
                    truncatedTokens = encode(`... (truncated) ${truncatedText}`).length;
                } catch(e) { console.error("Tokenizer error on truncated text:", e); }

                truncatedMessages.unshift({ ...message, parts: [{ text: `... (truncated) ${truncatedText}` }] });
                currentTokenCount = truncatedTokens; // Use the potentially more accurate count
            }
            break; // Stop adding messages
        }

        // Add the message to the beginning of the truncated list
        truncatedMessages.unshift(message);
        currentTokenCount += messageTokens;
    }

    if (originalTokenCount > maxTokens) {
      console.log(`Transcript truncated: Original tokens: ${originalTokenCount}, Truncated tokens: ${currentTokenCount} (Max: ${maxTokens})`);
    }

    return truncatedMessages;
}

/**
 * Generates a SHA-256 hash for a given object (typically the request payload).
 * @param obj The object to hash.
 * @returns A promise that resolves to the hex-encoded SHA-256 hash.
 */
async function generateQueryHash(obj: unknown): Promise<string> {
    try {
        const jsonString = JSON.stringify(obj);
        const msgUint8 = new TextEncoder().encode(jsonString); // encode as (utf-8) Uint8Array
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
        const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
        return hashHex;
    } catch (error) {
        console.error("Error generating query hash:", error);
        // Fallback or re-throw depending on desired behavior
        throw new Error("Failed to generate query hash");
    }
}

// supabase/functions/ai-chat/index.ts
/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />

// @ts-ignore Deno-style import, valid in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
    ChatMessage,
    validateChatApiRequest,
    normalizeMessage,
    REQUEST_TIMEOUT_MS
} from "./utils.ts";
import { callVertexAI } from "./vertex.ts";
import { checkServiceAccountHealth } from "./health.ts";

// --- Supabase Client ---
// Use service_role key for backend operations, bypassing RLS
// @ts-ignore Deno specific environment variable access
const supabaseUrl = Deno.env.get('SUPABASE_URL');
// @ts-ignore Deno specific environment variable access
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

// Create a single Supabase client instance
const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
      })
    : null;

// --- Constants ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_TABLE_NAME = 'chat_cache';
const ANALYTICS_TABLE_NAME = 'chat_analytics';
const CURRENT_MODEL_ID = 'gemini-2.0-flash';

const FALLBACK_RESPONSE = `
# Unable to Connect to AI Service

I apologize, but I'm currently having trouble connecting to the AI service. This may be due to:

- Service account configuration issues
- Temporary connection issues
- API capacity limits

Please check the service account configuration or try again later.
`;

const SYSTEM_PROMPT = `
You are an AI assistant designed to have natural conversations. Here are your instructions:

1. Respond to user questions directly and clearly.
2. Use proper markdown formatting:
   - **Bold** for emphasis
   - # Headings for main topics
   - ## Subheadings for subtopics
   - Bullet lists (-) for multiple points
   - Numbered lists (1.) for sequential steps
3. Always acknowledge questions with a direct answer first.
4. When providing structured information, use clear sections.
5. Maintain a conversational, helpful tone.
6. If your knowledge comes from Carl Allen's materials, cite the source specifically, e.g. "According to Carl Allen's 2025 Business Acquisitions Summit..."
7. When providing business acquisition advice, refer to specific details from relevant transcripts when available.
`;

// --- Main Server Handler ---

serve(async (req: Request) => {
  console.log(`=== ${new Date().toISOString()} New request received: ${req.method} ${req.url} ===`);

  // --- Handle OPTIONS request (CORS preflight) ---
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  // --- Parse URL for potential health check ---
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const endpoint = pathSegments[pathSegments.length - 1];

  // --- Handle Health Check Endpoint ---
  if (req.method === 'GET' && endpoint === 'health') {
    console.log("Handling GET /health request");
    const healthStatus = {
      status: "ok",
      timestamp: new Date().toISOString(),
      serviceAccount: checkServiceAccountHealth()
    };
    console.log("Health status:", healthStatus);
    return new Response(JSON.stringify(healthStatus), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: healthStatus.serviceAccount.isValid ? 200 : 503
    });
  }

  // --- Handle Main Chat Endpoint (POST) ---
  if (req.method !== 'POST') {
      console.error(`Invalid method: ${req.method}`);
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  }

  console.log("Handling POST chat request");
  const startTime = Date.now();
  let analyticsData: any = {
    successful: false,
    created_at: new Date().toISOString()
  };

  try {
    // 1. Check Service Account Validity Early
    const saHealth = checkServiceAccountHealth();
    if (!saHealth.isValid) {
      console.error("Service account check failed:", saHealth.error);
      analyticsData.error_message = `AI service configuration error: ${saHealth.error || 'Unknown issue'}`;
      return new Response(JSON.stringify({
        error: `AI service configuration error: ${saHealth.error || 'Unknown issue'}. Please check the Vertex AI service account.`,
        content: FALLBACK_RESPONSE,
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503
      });
    }
    console.log("Service account check passed. Using service account with model:", CURRENT_MODEL_ID);

    // 2. Parse Request Body
    let requestData: any;
    try {
      requestData = await req.json();
      console.log("Request body parsed successfully.");
      // Log sanitized request details
      console.log("Request details:", {
          hasMessages: !!requestData.messages,
          messageCount: requestData.messages?.length ?? 0,
          queryProvided: !!requestData.query,
          conversationId: requestData.conversationId || "None",
          enableOnlineSearch: !!requestData.enableOnlineSearch
      });
      
      // Store basic analytics data
      analyticsData.query = requestData.query || '';
      analyticsData.conversation_id = requestData.conversationId || null;
      analyticsData.used_online_search = requestData.enableOnlineSearch || false;
      
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      analyticsData.error_message = `Invalid request format: ${parseError.message}`;
      return new Response(JSON.stringify({
        error: `Invalid request format: ${parseError.message}`,
        content: FALLBACK_RESPONSE,
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // 3. Validate Request Data Structure
    const validation = validateChatApiRequest(requestData);
    if (!validation.isValid) {
      console.error("Request validation failed:", validation.error, validation.errorDetails);
      analyticsData.error_message = validation.error || "Invalid request structure";
      return new Response(JSON.stringify({
        error: validation.error || "Invalid request structure.",
        errorDetails: validation.errorDetails,
        content: "I couldn't process your request due to validation errors. Please check the format and try again.",
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    console.log("Request validation passed.");

    // 4. Prepare Messages for AI
    const { messages: clientMessages = [], enableOnlineSearch = false, query } = requestData;
    let preparedMessages: ChatMessage[] = clientMessages;

    // Add system prompts
    preparedMessages.push({ role: 'system', parts: [{ text: SYSTEM_PROMPT }] });
    if (enableOnlineSearch) {
      preparedMessages.push({
        role: 'system',
        parts: [{ text: "Real-time online search is enabled. Include recent web information when relevant." }]
      });
    }

    // Normalize and filter client messages
    const normalizedClientMessages = clientMessages
        .map(normalizeMessage)
        .filter((msg: ChatMessage) => msg.role === 'user' || msg.role === 'model');

    // Ensure conversation alternates user/model roles if needed
    if (normalizedClientMessages.length > 0 && normalizedClientMessages[normalizedClientMessages.length - 1].role !== 'user') {
        console.warn("Last message in history is not 'user'. Vertex might require user/model alternation. Consider adjusting client-side logic.");
    }

    // 4a. Search for relevant chunks from transcripts
    let relevantContext = "";
    let chunkSources: string[] = [];
    
    if (query && supabaseAdmin) {
      try {
        console.log(`Searching for relevant chunks for query: "${query}"`);
        
        const { data: chunks, error: searchError } = await supabaseAdmin
          .rpc('search_chunks', {
            query_text: query,
            match_count: 5
          });
        
        if (searchError) {
          console.error("Error searching chunks:", searchError);
        } else if (chunks && chunks.length > 0) {
          console.log(`Found ${chunks.length} relevant chunks`);
          
          // Build context from chunks
          relevantContext = chunks
            .map((chunk: any) => chunk.content)
            .join('\n\n---\n\n');
          
          // Track sources
          const uniqueTranscriptIds = [...new Set(chunks.map((c: any) => c.transcript_id))];
          chunkSources = uniqueTranscriptIds as string[];
          
          // Add RAG context to system prompts
          preparedMessages.push({
            role: 'system',
            parts: [{
              text: `Here is relevant context from M&A transcripts that may help answer the user's question:\n\n${relevantContext}\n\nUse this information to provide a more accurate and detailed response. Always cite the specific transcript when using information from it.`
            }]
          });
          
          console.log(`Added RAG context from ${uniqueTranscriptIds.length} transcripts`);
        } else {
          console.log("No relevant chunks found for query");
        }
      } catch (ragError) {
        console.error("Error in RAG search:", ragError);
        // Continue without RAG context
      }
    }

    // Combine system prompts and normalized client messages
    let combinedMessages = [
        ...preparedMessages.filter(m => m.role === 'system'),
        ...normalizedClientMessages
    ];

    // 5. Handle Transcript and Token Limits
    const maxInputTokens = 30000; // Increased for gemini-2.0-flash's larger context window
    const messagesForAI = truncateTranscript(combinedMessages, maxInputTokens);
    console.log(`Prepared ${messagesForAI.length} messages after potential truncation.`);

    // Calculate total tokens for final payload
    let totalInputTokens = 0;
    messagesForAI.forEach(msg => {
        try {
            totalInputTokens += encode(msg.parts[0]?.text || "").length;
        } catch (e) {
            console.error("Tokenizer error during final count:", e);
        }
    });
    console.log(`Total input tokens for Vertex AI (post-truncation): ${totalInputTokens}`);

    // Check if payload is too large
    if (totalInputTokens > maxInputTokens) {
        console.error(`Input tokens (${totalInputTokens}) exceed the limit (${maxInputTokens}) even after truncation.`);
        analyticsData.error_message = `Request too large: ${totalInputTokens} tokens (limit: ${maxInputTokens})`;
        return new Response(JSON.stringify({
            error: `The request is too large (${totalInputTokens} tokens) to process, exceeding the limit of ${maxInputTokens} tokens.`,
            content: FALLBACK_RESPONSE,
            source: "system"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 413
        });
    }

    // Filter out system messages for Vertex
    const validatedMessages: ChatMessage[] = messagesForAI.filter(msg => msg.role === 'user' || msg.role === 'model');
    console.log(`Sending ${validatedMessages.length} user/model messages to Vertex (after cache check).`);

    // 5. Generate Cache Key
    const cachePayload = { messages: validatedMessages, enableOnlineSearch };
    let queryHash: string | null = null;
    try {
        queryHash = await generateQueryHash(cachePayload);
        console.log(`Generated query hash: ${queryHash}`);
    } catch (hashError) {
        console.error("Failed to generate query hash, skipping cache check:", hashError);
    }

    // 6. Check Cache
    if (queryHash && supabaseAdmin) {
        try {
            console.log(`Checking cache for hash: ${queryHash}`);
            const { data: cachedData, error: cacheError } = await supabaseAdmin
                .from(CACHE_TABLE_NAME)
                .select('response, created_at')
                .eq('query_hash', queryHash)
                .maybeSingle();

            if (cacheError) {
                console.error("Error checking chat cache:", cacheError);
            } else if (cachedData) {
                console.log(`Cache hit for hash: ${queryHash}. Returning cached response.`);
                
                // Record analytics for cached response
                analyticsData.successful = true;
                analyticsData.api_time_ms = 0; // Cached, so API time is 0
                analyticsData.source_type = "cache";
                analyticsData.response_length = cachedData.response.length;
                
                if (supabaseAdmin) {
                    try {
                        await supabaseAdmin
                            .from(ANALYTICS_TABLE_NAME)
                            .insert(analyticsData);
                        console.log("Analytics recorded for cached response");
                    } catch (analyticsError) {
                        console.error("Failed to record analytics for cached response:", analyticsError);
                    }
                }
                
                return new Response(JSON.stringify({
                    content: cachedData.response,
                    source: "cache",
                    cached_at: cachedData.created_at
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                });
            } else {
                console.log(`Cache miss for hash: ${queryHash}`);
            }
        } catch (cacheCheckError) {
            console.error("Unexpected error during cache check:", cacheCheckError);
        }
    } else if (!supabaseAdmin) {
         console.warn("Supabase client not initialized, skipping cache check.");
    }

    // 7. Call Vertex AI (if no cache hit)
    let aiResponse;
    const aiCallStartTime = Date.now();
    try {
      // Pass only the user/model messages to the AI function
      aiResponse = await callVertexAI(validatedMessages);
      console.log("Vertex AI call successful.");
      
      // Track API time
      analyticsData.api_time_ms = Date.now() - aiCallStartTime;
      
      // Log token usage if available
      if (aiResponse.usageMetadata) {
        console.log("Token usage:", 
          JSON.stringify({
            promptTokens: aiResponse.usageMetadata.promptTokenCount,
            responseTokens: aiResponse.usageMetadata.candidatesTokenCount,
            totalTokens: aiResponse.usageMetadata.totalTokenCount
          }, null, 2)
        );
      }
    } catch (aiError) {
      console.error("Error calling Vertex AI service:", aiError);
      analyticsData.error_message = `AI provider error: ${aiError.message}`;
      return new Response(JSON.stringify({
        error: `AI provider error: ${aiError.message}`,
        content: FALLBACK_RESPONSE,
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502
      });
    }

    // 8. Process Response & Write to Cache
    const responseText = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    analyticsData.response_length = responseText.length;

    // Extract citation information from the AI response if available
    let citation: string[] | undefined = undefined;
    if (aiResponse?.candidates?.[0]?.citationMetadata?.citations) {
        citation = aiResponse.candidates[0].citationMetadata.citations.map(
            (cite: any) => cite.title || cite.uri || "Unnamed source"
        );
        analyticsData.source_type = "transcript";
        analyticsData.transcript_title = citation[0] || null;
        console.log("Found citations in AI response:", citation);
    } else if (chunkSources.length > 0) {
        // Use transcript IDs from RAG search as citations
        citation = chunkSources;
        analyticsData.source_type = "transcript";
        analyticsData.transcript_title = `${chunkSources.length} transcripts`;
        console.log("Using transcript sources from RAG search:", citation);
    } else {
        analyticsData.source_type = enableOnlineSearch ? "online_search" : "gemini";
    }

    if (!responseText) {
      console.warn("Received empty or invalid response text from Vertex AI.");
      analyticsData.error_message = "Empty response from AI";
      return new Response(JSON.stringify({
        error: "Received an empty response from the AI.",
        content: "I received an empty response from the AI service. Please try rephrasing your request or try again later.",
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    // Write successful response to cache
    if (queryHash && supabaseAdmin) {
        try {
            console.log(`Writing response to cache for hash: ${queryHash}`);
            const { error: insertError } = await supabaseAdmin
                .from(CACHE_TABLE_NAME)
                .insert({
                    query_hash: queryHash,
                    response: responseText,
                    model_used: CURRENT_MODEL_ID
                });

            if (insertError) {
                console.error("Error writing to chat cache:", insertError);
                if (insertError.code === '23505') {
                    console.warn(`Cache entry for hash ${queryHash} likely already exists.`);
                }
            } else {
                console.log(`Successfully cached response for hash: ${queryHash}`);
            }
        } catch (cacheWriteError) {
            console.error("Unexpected error during cache write:", cacheWriteError);
        }
    }

    // 9. Record analytics
    analyticsData.successful = true;
    
    if (supabaseAdmin) {
        try {
            await supabaseAdmin
                .from(ANALYTICS_TABLE_NAME)
                .insert(analyticsData);
            console.log("Analytics recorded successfully");
        } catch (analyticsError) {
            console.error("Failed to record analytics:", analyticsError);
        }
    }

    // 10. Return Response
    const responseData = {
      content: responseText,
      source: "vertex", 
      model: CURRENT_MODEL_ID,
      citation: citation
    };

    console.log(`Successfully generated and sending response from Vertex AI (${CURRENT_MODEL_ID}).`);
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    // --- Catch-all for unexpected errors ---
    console.error("Unhandled error in main request handler:", error);
    analyticsData.error_message = `Internal server error: ${error.message}`;
    
    // Try to record the error in analytics
    if (supabaseAdmin) {
        try {
            await supabaseAdmin
                .from(ANALYTICS_TABLE_NAME)
                .insert(analyticsData);
            console.log("Error analytics recorded");
        } catch (analyticsError) {
            console.error("Failed to record error analytics:", analyticsError);
        }
    }
    
    return new Response(JSON.stringify({
      error: `Internal server error: ${error.message}`,
      content: FALLBACK_RESPONSE,
      source: "system"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

console.log(`ai-chat function initialized and listening (using model: ${CURRENT_MODEL_ID})...`);