// --- Utility Functions ---

/**
 * Estimates the token count of a string using a simple character count proxy.
 * @param text The string to estimate the token count for.
 * @returns The estimated token count.
 */
function estimateTokenCount(text: string): number {
    // This is a very rough estimate.  A more accurate method would use a tokenizer.
    return Math.ceil(text.length / 4); // Assuming 4 characters per token on average
}

/**
 * Truncates a message transcript to a maximum token count, keeping the most recent messages.
 * @param messages The array of chat messages to truncate.
 * @param maxTokens The maximum number of tokens allowed in the transcript.
 * @returns The truncated array of chat messages.
 */
function truncateTranscript(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    let currentTokenCount = 0;
    const truncatedMessages: ChatMessage[] = [];
    let estimatedOriginalTokens = 0;

    // Calculate estimated original tokens for logging
    messages.forEach(message => {
        estimatedOriginalTokens += estimateTokenCount(message.parts[0]?.text || "");
    });

    // Iterate backwards through the messages
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        const messageText = message.parts[0]?.text || "";
        const messageTokens = estimateTokenCount(messageText);

        // Stop if adding the next message would exceed the limit
        if (currentTokenCount + messageTokens > maxTokens) {
            // If even the first message (most recent) is too long, truncate it
            if (truncatedMessages.length === 0 && messageTokens > maxTokens) {
                console.warn(`Truncating the most recent message as it exceeds maxTokens (${maxTokens}).`);
                const allowedChars = maxTokens * 4; // Rough estimate back to chars
                const truncatedText = messageText.slice(-allowedChars); // Keep the end of the message
                truncatedMessages.unshift({ ...message, parts: [{ text: `... (truncated) ${truncatedText}` }] });
                currentTokenCount = maxTokens; // Set count to max as we truncated
            }
            break; // Stop adding messages
        }

        // Add the message to the beginning of the truncated list
        truncatedMessages.unshift(message);
        currentTokenCount += messageTokens;
    }

    if (estimatedOriginalTokens > maxTokens) {
      console.log(`Transcript truncated: Original estimated tokens: ${estimatedOriginalTokens}, Truncated estimated tokens: ${currentTokenCount} (Max: ${maxTokens})`);
    }

    return truncatedMessages;
}


// supabase/functions/gemini-chat/index.ts
/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // Use a specific stable version
import {
    ChatMessage,
    validateChatApiRequest,
    normalizeMessage
} from "./utils.ts";
import { callVertexAI } from "./vertex.ts";
import { checkServiceAccountHealth } from "./health.ts";

// --- Constants ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow requests from any origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log("Service account check passed.");

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
    const maxInputTokens = 7000; // Set a maximum *input* token limit for Vertex AI (Gemini 1.5 Flash has a large context window, but let's be conservative)
    const messagesForAI = truncateTranscript(combinedMessages, maxInputTokens);
    console.log(`Prepared ${messagesForAI.length} messages after potential truncation.`);

    // Calculate total estimated tokens for the final payload
    let totalEstimatedInputTokens = 0;
    messagesForAI.forEach(msg => {
        totalEstimatedInputTokens += estimateTokenCount(msg.parts[0]?.text || "");
    });
    console.log(`Estimated total input tokens for Vertex AI: ${totalEstimatedInputTokens}`);

    // Check if the *entire* payload might be too large (after truncation)
    if (totalEstimatedInputTokens > maxInputTokens) {
        console.error(`Estimated input tokens (${totalEstimatedInputTokens}) exceed the limit (${maxInputTokens}) even after truncation. This shouldn't normally happen.`);
        // Returning an error as this indicates a potential issue with truncation logic or an extremely large single message.
        return new Response(JSON.stringify({
            error: "The request is too large to process, even after attempting to shorten the history.",
            content: FALLBACK_RESPONSE,
            source: "system"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 413 // Payload Too Large
        });
    }

    // Filter out system messages before sending to Vertex, as they are handled differently by the API
    const validatedMessages: ChatMessage[] = messagesForAI.filter(msg => msg.role === 'user' || msg.role === 'model');

    console.log(`Sending ${validatedMessages.length} user/model messages to Vertex.`);


    // 5. Call Vertex AI
    let aiResponse;
    try {
      // Pass only the user/model messages to the AI function
      aiResponse = await callVertexAI(validatedMessages); // Pass the potentially truncated user/model messages
      console.log("Vertex AI call successful.");
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

    // 6. Process and Return Response
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

    const responseData = {
      content: responseText,
      source: "vertex" // Indicate the source of the response
    };

    console.log("Successfully generated and sending response.");
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

console.log("gemini-chat function initialized and listening...");
