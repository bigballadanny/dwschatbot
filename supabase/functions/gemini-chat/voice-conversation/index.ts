import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Env variables
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

// Use Gemini 2.0 Flash with fallback to 1.5 Pro
const GEMINI_2_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_FALLBACK_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generic fallback response
const FALLBACK_RESPONSE = `I apologize, but I'm having trouble processing your request at the moment. Please try asking your question again in a slightly different way or try again later when the service has more capacity.`;

// System instructions to improve conversation quality
const SYSTEM_PROMPT = `
You are an AI assistant designed to have natural conversations. Here are your instructions:

1. Respond to voice questions directly and clearly
2. Use proper markdown formatting:
   - **Bold** for emphasis
   - # Headings for main topics
   - ## Subheadings for subtopics
   - Bullet lists for multiple points
   - Numbered lists for sequential steps

3. Always acknowledge questions with a direct answer first
4. When providing structured information, use clear sections
5. Maintain a conversational, helpful tone
`;

// --- Analytics Logging Function (Keep as is) ---
async function logAnalytics(
    supabase: SupabaseClient,
    logData: { 
        conversation_id: string | null; 
        query: string; 
        response_length: number | null;
        source_type: string | null;
        relevance_score?: number | null; 
        search_time_ms?: number | null; 
        api_time_ms: number | null;
        successful: boolean | null;
        transcript_title?: string | null; 
        error_message?: string | null;
        used_online_search: boolean | null;
        model_used?: string | null;
    }
) {
    try {
        const { error } = await supabase.from('chat_analytics').insert([logData]);
        if (error) {
            console.error("Analytics logging failed:", error.message);
        } else {
            console.log("Analytics logged successfully for model:", logData.model_used);
        }
    } catch (err) {
        console.error("Exception during analytics logging:", err);
    }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!,
    {
        // Pass auth header for RLS
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
    }
  );

  let startTime = Date.now();
  let queryText = "";
  let conversationId: string | null = null;
  let isSuccess = false;
  let errorMessage: string | null = null;
  let responseText = "";
  let responseSource = 'gemini';
  let usedOnlineSearch = false;
  let geminiApiTime: number | null = null;
  let retryCount = 0;
  let modelUsed = "gemini-2.0-flash";
  const MAX_RETRIES = 2; // Maximum number of retries if we get empty responses

  try {
    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing required environment variables");
    }

    const { query, messages, isVoiceInput, enableOnlineSearch, conversationId: convId } = await req.json();
    
    conversationId = convId || null;
    usedOnlineSearch = enableOnlineSearch || false;
    // Get query text from explicit 'query' field or fallback to last message
    queryText = query || (messages && messages.length > 0 ? messages[messages.length - 1]?.content : null);
    
    if (!queryText) {
      throw new Error("No query text provided in request body");
    }
    
    console.log(`Processing query for conversation ${conversationId || 'N/A'}: "${queryText.substring(0, 50)}..."`);
    
    // --- Format messages for Gemini API --- 
    const formattedMessages = messages
        .map((msg: any) => ({ role: msg.source === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }))
        .filter((msg: any) => msg.parts[0].text); // Ensure messages have content

    // Add system instructions if not present
    let hasSystemPrompt = false;
    for (const msg of formattedMessages) {
      if (msg.role === 'model' && msg.parts[0].text.includes("You are an AI assistant")) {
        hasSystemPrompt = true;
        break;
      }
    }

    if (!hasSystemPrompt) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: SYSTEM_PROMPT }]
      });
    }
    
    // --- Begin API call process ---
    const geminiStartTime = Date.now();
    
    // Try the API call with retry logic for empty responses
    let attemptSuccessful = false;
    let data;
    
    while (retryCount <= MAX_RETRIES && !attemptSuccessful) {
      try {
        // Use Gemini 2.0 for first attempt, fall back to 1.5 if needed
        const useGemini2 = (retryCount < 1);
        const apiUrl = `${useGemini2 ? GEMINI_2_API_URL : GEMINI_FALLBACK_API_URL}?key=${GEMINI_API_KEY}`;
        modelUsed = useGemini2 ? "gemini-2.0-flash" : "gemini-1.5-pro";
        
        // Gradually increase temperature if retrying to encourage different responses
        const temperature = retryCount === 0 ? 0.7 : 0.8;
        
        // Match the official API structure exactly
        const requestBody = {
          contents: formattedMessages,
          generationConfig: { 
            temperature: temperature, 
            topP: 0.9, 
            topK: 30, 
            maxOutputTokens: 4096  // Increased token limit
          }
        };
        
        console.log(`Attempt ${retryCount + 1} using model: ${modelUsed}`);
        console.log(`Request with ${formattedMessages.length} messages, temperature: ${temperature}`);
        
        const geminiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        
        console.log(`API attempt ${retryCount + 1} status:`, geminiResponse.status);
        
        // Get the full response text for debugging
        const responseText = await geminiResponse.text();
        console.log(`API attempt ${retryCount + 1} raw response (truncated):`, responseText.substring(0, 100) + "...");
        
        // Parse the text response back to JSON
        try {
          data = JSON.parse(responseText);
          
          // Check for empty or "I'm sorry" responses
          const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          if (generatedText && 
              generatedText.length > 20 &&
              !generatedText.includes("I couldn't generate") &&
              !generatedText.includes("I'm sorry, I can't")) {
            // We got a valid response
            attemptSuccessful = true;
            console.log("Got valid response on attempt", retryCount + 1, "with model:", modelUsed);
            responseText = generatedText;
          } else {
            console.log("Empty or apologetic response on attempt", retryCount + 1);
            retryCount++;
          }
        } catch (parseError) {
          console.error("Error parsing API response:", parseError);
          retryCount++; // Count parsing errors as failed attempts
        }
      } catch (fetchError) {
        console.error(`API fetch error on attempt ${retryCount + 1}:`, fetchError);
        retryCount++;
      }
    }
    
    const geminiEndTime = Date.now();
    geminiApiTime = geminiEndTime - geminiStartTime; // Record Gemini API time
    
    // If we don't have a valid response by now, handle the error cases
    if (!data) {
      const errorMsg = "Failed to get a valid response from the API after retries";
      console.error(errorMsg);
      
      responseText = FALLBACK_RESPONSE;
      responseSource = 'fallback';
      isSuccess = true;
      console.log("Using fallback content");
    } else if (!responseText) {
      // Handle empty but technically successful responses
      console.warn("Gemini API returned empty response text, using generic fallback");
      responseText = FALLBACK_RESPONSE;
      responseSource = 'fallback';
    }
    
    isSuccess = true;
    console.log(`Generated text length: ${responseText.length} using model: ${modelUsed}`);

    // --- Determine Source & Citation --- 
    const citationMatch = responseText.match(/\(Source: (.*?)\)/i); // Case-insensitive match
    const citation = citationMatch ? [citationMatch[0]] : undefined;
    // Extract transcript title more reliably if possible
    let transcriptTitle: string | null = null; 
    if (citation) {
        // Basic extraction - might need refinement based on actual citation format
        transcriptTitle = citationMatch[1]?.trim() || null;
    }

    if (transcriptTitle && transcriptTitle.toLowerCase().includes("call")) {
      responseSource = 'transcript';
    } else if (usedOnlineSearch && !citation) {
      responseSource = 'web';
    } else if (!citation) {
      responseSource = 'gemini'; // Default if no citation
    }

    // --- Log Analytics (Success) ---
    await logAnalytics(supabase, {
        conversation_id: conversationId,
        query: queryText,
        response_length: responseText.length,
        source_type: responseSource,
        api_time_ms: geminiApiTime, 
        successful: isSuccess,
        used_online_search: usedOnlineSearch,
        error_message: null,
        transcript_title: transcriptTitle,
        model_used: modelUsed
    });

    // --- Return Success Response (Text Only) --- 
    return new Response(JSON.stringify({ 
      content: responseText,
      source: responseSource,
      citation: citation,
      model: modelUsed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    // Ensure errorMessage is set
    errorMessage = error instanceof Error ? error.message : "An unexpected error occurred in the function.";
    isSuccess = false;
    const totalApiTimeOnError = Date.now() - startTime;

    // --- Log Analytics (Failure) --- 
    await logAnalytics(supabase, {
        conversation_id: conversationId,
        query: queryText, 
        response_length: null,
        source_type: 'error', // Set source to error on failure
        api_time_ms: geminiApiTime ?? totalApiTimeOnError, // Log Gemini time if available, else total
        successful: isSuccess,
        used_online_search: usedOnlineSearch, 
        error_message: errorMessage,
        model_used: "error"
    });

    // --- Return Error Response --- 
    return new Response(JSON.stringify({ 
      error: errorMessage,
      content: "I apologize, but I'm having trouble accessing my knowledge base right now. Please try your question again in a moment.",
      source: 'system'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
