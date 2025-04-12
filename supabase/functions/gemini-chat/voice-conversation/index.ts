
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Env variables
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
// Updated to use Gemini 2.0 Flash API (beta endpoint)
const GEMINI_API_URL = Deno.env.get('GEMINI_API_URL') || "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Removed prepareTextForSpeech function as it's no longer needed

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
    }
) {
    try {
        const { error } = await supabase.from('chat_analytics').insert([logData]);
        if (error) {
            console.error("Analytics logging failed:", error.message);
        } else {
            // console.log("Analytics logged successfully."); // Less verbose logging
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
    
    // --- Gemini API Call --- 
    const formattedMessages = messages
        .map((msg: any) => ({ role: msg.source === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }))
        .filter((msg: any) => msg.parts[0].text); // Ensure messages have content

    // Add system instructions if not present (Check based on content)
    const systemInstruction = "You are DWS AI, an assistant powered by Gemini, designed as a trusted guide for Carl Allen's M&A mastermind community.";
    if (!formattedMessages.some((msg: any) => msg.parts[0].text.includes("Carl Allen"))) {
      formattedMessages.unshift({ role: 'model', parts: [{ text: systemInstruction }] });
    }

    const geminiStartTime = Date.now();
    
    // Extract API key from environment and construct the URL
    const apiKey = GEMINI_API_KEY;
    const apiUrl = GEMINI_API_URL.includes('key=GEMINI_API_KEY') 
      ? GEMINI_API_URL.replace('GEMINI_API_KEY', apiKey) 
      : `${GEMINI_API_URL}?key=${apiKey}`;
    
    console.log("Calling Gemini API URL:", apiUrl.substring(0, apiUrl.indexOf('?')));
    
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: formattedMessages,
        // Adjusted generation config slightly - consider tuning these
        generationConfig: { temperature: 0.6, topP: 0.9, topK: 30, maxOutputTokens: 1024 }, 
      }),
    });
    const geminiEndTime = Date.now();
    geminiApiTime = geminiEndTime - geminiStartTime; // Record Gemini API time

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text(); // Read as text first for more details
      let errorDataMessage = `Gemini API failed status ${geminiResponse.status}`; 
      try { 
          const errorJson = JSON.parse(errorBody);
          errorDataMessage = errorJson.error?.message || errorBody;
      } catch { 
          errorDataMessage = errorBody || errorDataMessage;
      }
      errorMessage = errorDataMessage;
      console.error("Gemini API Error:", errorMessage);
      throw new Error(errorMessage); // Throw to trigger catch block
    }

    const geminiData = await geminiResponse.json();
    // Safe access to response text
    responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ""; 
    if (!responseText) {
        console.warn("Gemini API returned empty response text.");
        // Decide if this is an error or just an empty valid response
        // responseText = "(No content generated)"; // Placeholder if needed
    }
    isSuccess = true;
    console.log(`Generated text length: ${responseText.length}`);

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
        transcript_title: transcriptTitle 
    });

    // --- Return Success Response (Text Only) --- 
    return new Response(JSON.stringify({ 
      content: responseText,
      // audioContent: null, // Explicitly null
      source: responseSource,
      citation: citation
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
    });

    // --- Return Error Response --- 
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
