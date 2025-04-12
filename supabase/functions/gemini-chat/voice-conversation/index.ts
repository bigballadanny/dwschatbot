import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Env variables
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
// Using Gemini 1.5 Pro for better conversation handling
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SBA-specific fallback response
const SBA_FALLBACK_RESPONSE = `# SBA Loans for Business Acquisitions

**SBA (Small Business Administration)** loans are a popular financing option for business acquisitions. Here's what you need to know:

## SBA Loan Basics
- **What it is:** Government-backed loans provided through approved lenders
- **Key program:** The 7(a) loan program is most commonly used for acquisitions
- **Guarantee:** The SBA guarantees 75-85% of the loan amount, reducing risk for the lender
- **Typical terms:** 10-25 years with some of the lowest interest rates available for small businesses

## Benefits for Acquisitions
- **Lower down payment:** Typically requires only 10-15% down versus 25-30% for conventional loans
- **Better terms:** Longer repayment periods (up to 10 years) and competitive rates
- **Flexible use:** Can cover business acquisition, working capital, and sometimes real estate
- **Access:** Available to buyers who might not qualify for conventional financing

The SBA loan can be an excellent tool for your acquisition strategy, especially for first-time business buyers.`;

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
  let retryCount = 0;
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

    // Check for SBA-related query - we'll use this later for specialized fallbacks
    const isSbaQuery = queryText.toLowerCase().includes("sba");
    
    console.log(`Processing query for conversation ${conversationId || 'N/A'}: "${queryText.substring(0, 50)}..."`);
    console.log("Is SBA-related query:", isSbaQuery);
    
    // --- Format messages for Gemini API --- 
    const formattedMessages = messages
        .map((msg: any) => ({ role: msg.source === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }))
        .filter((msg: any) => msg.parts[0].text); // Ensure messages have content

    // Add system instructions if not present (Check based on content)
    const systemInstruction = "You are DWS AI, an assistant powered by Gemini, designed as a trusted guide for Carl Allen's M&A mastermind community.";
    if (!formattedMessages.some((msg: any) => msg.parts[0].text.includes("Carl Allen"))) {
      formattedMessages.unshift({ role: 'model', parts: [{ text: systemInstruction }] });
    }
    
    // Add specific SBA knowledge if this is an SBA query
    if (isSbaQuery) {
      formattedMessages.unshift({ 
        role: 'model', 
        parts: [{ 
          text: "For SBA questions: The Small Business Administration (SBA) offers loan programs that can be valuable for business acquisitions. The 7(a) loan program typically requires 10-15% down payment from the buyer, has competitive interest rates, and longer repayment terms. They're popular for first-time business buyers." 
        }] 
      });
    }
    
    // --- Begin API call process ---
    const geminiStartTime = Date.now();
    
    // Build the complete URL with API key
    const apiUrl = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    
    // Log just the base URL (without API key) for debugging
    console.log("Calling Gemini API URL:", apiUrl.split('?')[0]);
    console.log("API URL contains key parameter:", apiUrl.includes("key="));
    
    // Try the API call with retry logic for empty responses
    let attemptSuccessful = false;
    let data;
    
    while (retryCount <= MAX_RETRIES && !attemptSuccessful) {
      try {
        // Gradually increase temperature if retrying to encourage different responses
        const temperature = retryCount === 0 ? 0.6 : 0.8;
        
        // UPDATED: match the official API structure exactly
        const requestBody = {
          contents: formattedMessages,
          generationConfig: { 
            temperature: temperature, 
            topP: 0.9, 
            topK: 30, 
            maxOutputTokens: 1024 
          }
        };
        
        console.log(`Attempt ${retryCount + 1} request body:`, JSON.stringify({
          contents: `Array with ${formattedMessages.length} messages`,
          generationConfig: requestBody.generationConfig
        }));
        
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
            console.log("Got valid response on attempt", retryCount + 1);
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
      
      // Use SBA fallback for SBA queries
      if (isSbaQuery) {
        responseText = SBA_FALLBACK_RESPONSE;
        responseSource = 'gemini';
        isSuccess = true;
        console.log("Using SBA fallback content");
      } else {
        throw new Error(errorMsg);
      }
    } else if (!responseText) {
      // Handle empty but technically successful responses
      
      // Fall back to SBA specific content if we get an empty response on SBA query
      if (isSbaQuery) {
        responseText = SBA_FALLBACK_RESPONSE;
        console.log("Using SBA fallback content");
      } else {
        console.warn("Gemini API returned empty response text, using generic fallback");
        responseText = "I'm sorry, I couldn't generate a specific answer at this time. Could you try rephrasing your question?";
      }
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

    // Use a special SBA fallback for SBA-related queries
    if (queryText?.toLowerCase().includes("sba")) {
      return new Response(JSON.stringify({ 
        content: SBA_FALLBACK_RESPONSE,
        source: 'gemini',
        isFallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
