// --- Imports ---
// @ts-ignore Deno-style import, valid in Supabase Edge Functions
import { encode } from "https://esm.sh/gpt-tokenizer@2.1.1"; // CH-01: Import tokenizer
// @ts-ignore Deno-style import, valid in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; // CH-04: Import Supabase client
// @ts-ignore Deno standard library
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"; // CH-04: Import crypto for hashing

// --- Utility Functions ---

/**
 * Truncates a message transcript to a maximum token count using a tokenizer, keeping the most recent messages.
 * @param messages The array of chat messages to truncate.
 * @param maxTokens The maximum number of tokens allowed in the transcript.
 * @returns The truncated array of chat messages.
 */
function truncateTranscript(messages: ChatMessage[], maxTokens: number): ChatMessage[] { // CH-02: Refactor
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

// supabase/functions/gemini-chat/index.ts
/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />

// @ts-ignore Deno-style import, valid in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
    ChatMessage,
    validateChatApiRequest,
    normalizeMessage
} from "./utils.ts";
import { callVertexAI } from "./vertex.ts";
import { checkServiceAccountHealth } from "./health.ts";

// --- Supabase Client (CH-04) ---
// Use service_role key for backend operations, bypassing RLS
// @ts-ignore Deno specific environment variable access
const supabaseUrl = Deno.env.get('SUPABASE_URL');
// @ts-ignore Deno specific environment variable access
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    // Optionally throw an error to prevent the function from starting without config
    // throw new Error("Supabase environment variables not set.");
}

// Create a single Supabase client instance
// Use { auth: { persistSession: false } } to prevent client trying to store session
const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false // Important for server-side usage
        }
      })
    : null;

// --- Constants ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow requests from any origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_TABLE_NAME = 'chat_cache'; // CH-04: Define cache table name
const CURRENT_MODEL_ID = 'gemini-2.0-flash'; // Updated model identifier for caching and tracking

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
  const endpoint = pathSegments[pathSegments.length - 1]; // Last part of the path

  // --- Handle Health Check Endpoint ---
  if (req.method === 'GET' && endpoint === 'health') {
    console.log("Handling GET /health request");
    const healthStatus = {
      status: "ok",
      timestamp: new Date().toISOString(),
      serviceAccount: checkServiceAccountHealth() // Use imported health check
    };
    console.log("Health status:", healthStatus);
    return new Response(JSON.stringify(healthStatus), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: healthStatus.serviceAccount.isValid ? 200 : 503 // Service Unavailable if SA invalid
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

  try {
    // 1. Check Service Account Validity Early
    const saHealth = checkServiceAccountHealth();
    if (!saHealth.isValid) {
      console.error("Service account check failed:", saHealth.error);
      return new Response(JSON.stringify({
        error: `AI service configuration error: ${saHealth.error || 'Unknown issue'}. Please check the Vertex AI service account.`,
        content: FALLBACK_RESPONSE,
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503 // Service Unavailable
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
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(JSON.stringify({
        error: `Invalid request format: ${parseError.message}`,
        content: FALLBACK_RESPONSE, // Provide fallback content
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 // Bad Request
      });
    }

    // 3. Validate Request Data Structure
    const validation = validateChatApiRequest(requestData); // Use imported validator
    if (!validation.isValid) {
      console.error("Request validation failed:", validation.error, validation.errorDetails);
      return new Response(JSON.stringify({
        error: validation.error || "Invalid request structure.",
        errorDetails: validation.errorDetails,
        content: "I couldn't process your request due to validation errors. Please check the format and try again.",
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 // Bad Request
      });
    }
    console.log("Request validation passed.");

    // 4. Prepare Messages for AI
    const { messages: clientMessages = [], enableOnlineSearch = false } = requestData;
    let preparedMessages: ChatMessage[] = clientMessages;

    // Add system prompts
    preparedMessages.push({ role: 'system', parts: [{ text: SYSTEM_PROMPT }] });
    if (enableOnlineSearch) {
      preparedMessages.push({
        role: 'system',
        parts: [{ text: "Real-time online search is enabled. Include recent web information when relevant." }]
      });
    }

    // Normalize and add client messages (user/model roles only for the actual API call)
    const normalizedClientMessages = clientMessages
        .map(normalizeMessage) // Use imported normalizer
        .filter((msg: ChatMessage) => msg.role === 'user' || msg.role === 'model'); // Filter for valid roles for Vertex

    // Ensure conversation alternates user/model roles if needed (basic check)
    // Vertex API might require strict alternation. Add placeholder if needed.
    if (normalizedClientMessages.length > 0 && normalizedClientMessages[normalizedClientMessages.length - 1].role !== 'user') {
        console.warn("Last message in history is not 'user'. Vertex might require user/model alternation. Consider adjusting client-side logic.");
        // Example: If API strictly requires ending with user message:
        // normalizedClientMessages.push({ role: 'user', parts: [{ text: "(Continue)" }] });
    }

    // Combine system prompts and normalized client messages
    let combinedMessages = [
        ...preparedMessages.filter(m => m.role === 'system'), // Keep system prompts separate initially
        ...normalizedClientMessages
    ];

    // 5. Handle Transcript and Token Limits
    const maxInputTokens = 30000; // Increased for gemini-2.0-flash's larger context window
    const messagesForAI = truncateTranscript(combinedMessages, maxInputTokens);
    console.log(`Prepared ${messagesForAI.length} messages after potential truncation.`);

    // Calculate total actual tokens for the final payload using the tokenizer
    let totalInputTokens = 0;
    messagesForAI.forEach(msg => {
        try {
            totalInputTokens += encode(msg.parts[0]?.text || "").length;
        } catch (e) {
            console.error("Tokenizer error during final count:", e);
        }
    });
    console.log(`Total input tokens for Vertex AI (post-truncation): ${totalInputTokens}`);

    // Check if the *entire* payload might be too large (after truncation)
    if (totalInputTokens > maxInputTokens) {
        console.error(`Input tokens (${totalInputTokens}) exceed the limit (${maxInputTokens}) even after truncation. This indicates an issue with truncation or a very large message.`);
        // Returning an error as this indicates a potential issue with truncation logic or an extremely large single message.
        return new Response(JSON.stringify({
            error: `The request is too large (${totalInputTokens} tokens) to process, exceeding the limit of ${maxInputTokens} tokens.`,
            content: FALLBACK_RESPONSE,
            source: "system"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 413 // Payload Too Large
        });
    }

    // Filter out system messages before sending to Vertex, as they are handled differently by the API
    const validatedMessages: ChatMessage[] = messagesForAI.filter(msg => msg.role === 'user' || msg.role === 'model');

    console.log(`Sending ${validatedMessages.length} user/model messages to Vertex (after cache check).`);

    // 5. Generate Cache Key (CH-04)
    // Hash includes the validated messages and search setting
    const cachePayload = { messages: validatedMessages, enableOnlineSearch };
    let queryHash: string | null = null;
    try {
        queryHash = await generateQueryHash(cachePayload);
        console.log(`Generated query hash: ${queryHash}`);
    } catch (hashError) {
        console.error("Failed to generate query hash, skipping cache check:", hashError);
        // Proceed without caching if hashing fails
    }

    // 6. Check Cache (CH-04)
    if (queryHash && supabaseAdmin) {
        try {
            console.log(`Checking cache for hash: ${queryHash}`);
            const { data: cachedData, error: cacheError } = await supabaseAdmin
                .from(CACHE_TABLE_NAME)
                .select('response, created_at') // Select necessary fields
                .eq('query_hash', queryHash)
                // Optional: Add TTL check, e.g., .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Example: 24-hour TTL
                .maybeSingle(); // Expect 0 or 1 row

            if (cacheError) {
                console.error("Error checking chat cache:", cacheError);
                // Proceed without cache if error occurs
            } else if (cachedData) {
                console.log(`Cache hit for hash: ${queryHash}. Returning cached response.`);
                // Return cached response
                return new Response(JSON.stringify({
                    content: cachedData.response,
                    source: "cache", // Indicate response came from cache
                    cached_at: cachedData.created_at // Optionally include cache timestamp
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200 // OK
                });
            } else {
                console.log(`Cache miss for hash: ${queryHash}`);
            }
        } catch (cacheCheckError) {
            console.error("Unexpected error during cache check:", cacheCheckError);
            // Proceed without cache if error occurs
        }
    } else if (!supabaseAdmin) {
         console.warn("Supabase client not initialized, skipping cache check.");
    }

    // 7. Call Vertex AI (if no cache hit)
    let aiResponse;
    try {
      // Pass only the user/model messages to the AI function
      aiResponse = await callVertexAI(validatedMessages); // Pass the potentially truncated user/model messages
      console.log("Vertex AI call successful.");
      
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
      return new Response(JSON.stringify({
        error: `AI provider error: ${aiError.message}`,
        content: FALLBACK_RESPONSE,
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502 // Bad Gateway (error communicating with upstream server)
      });
    }

    // 8. Process Response & Write to Cache (CH-04)
    const responseText = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!responseText) {
      console.warn("Received empty or invalid response text from Vertex AI.");
      // Return a specific message instead of the generic fallback
      return new Response(JSON.stringify({
        error: "Received an empty response from the AI.",
        content: "I received an empty response from the AI service. Please try rephrasing your request or try again later.",
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 // Internal Server Error (as the AI failed to generate content)
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
                // Log error but don't fail the request if cache write fails
                console.error("Error writing to chat cache:", insertError);
                // Handle potential conflicts (e.g., duplicate hash if request was processed concurrently)
                if (insertError.code === '23505') { // PostgreSQL unique violation
                    console.warn(`Cache entry for hash ${queryHash} likely already exists.`);
                }
            } else {
                console.log(`Successfully cached response for hash: ${queryHash}`);
            }
        } catch (cacheWriteError) {
            console.error("Unexpected error during cache write:", cacheWriteError);
        }
    }

    // 9. Return Response
    const responseData = {
      content: responseText,
      source: "vertex", // Indicate the source of the response
      model: CURRENT_MODEL_ID // Include model information in response
    };

    console.log(`Successfully generated and sending response from Vertex AI (${CURRENT_MODEL_ID}).`);
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // OK
    });

  } catch (error) {
    // --- Catch-all for unexpected errors ---
    console.error("Unhandled error in main request handler:", error);
    return new Response(JSON.stringify({
      error: `Internal server error: ${error.message}`,
      content: FALLBACK_RESPONSE,
      source: "system"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 // Internal Server Error
    });
  }
});

console.log(`gemini-chat function initialized and listening (using model: ${CURRENT_MODEL_ID})...`);
