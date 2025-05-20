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

// n8n webhook URL
// Updated with localhost URL since ngrok has compatibility issues - 2025-05-17
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL') || 'http://localhost:5678/webhook/dws-chatbot'

// Fallback response in case n8n doesn't respond properly
const FALLBACK_RESPONSE = {
  content: "I'm having trouble connecting to the backend service. Please try again in a moment.",
  source: "system",
  model: "fallback"
}

serve(async (req) => {
  // Handle CORS preflight
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
    const requestBody = await req.json()
    const { 
      query, 
      messages, 
      conversationId, 
      enableOnlineSearch, 
      requestId 
    } = requestBody

    // Forward to n8n webhook
    let n8nData;
    try {
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatInput: query,
          sessionId: conversationId,
          message: query, // For Chat UI compatibility
          conversationId: conversationId,
          userId: user.id,
          messages: messages,
          enableOnlineSearch: enableOnlineSearch,
          metadata: {
            requestId,
            userEmail: user.email
          }
        }),
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error('n8n webhook error:', errorText);
        
        // Handle the specific "No Respond to Webhook node" error
        if (errorText.includes("No Respond to Webhook node found") || 
            errorText.includes("Workflow could not be started")) {
          console.warn("N8N webhook configuration issue - using fallback response");
          n8nData = FALLBACK_RESPONSE;
        } else {
          throw new Error(`n8n webhook failed: ${n8nResponse.status}`);
        }
      } else {
        n8nData = await n8nResponse.json();
      }
    } catch (error) {
      console.error('Error calling n8n webhook:', error);
      n8nData = FALLBACK_RESPONSE;
    }

    // Return response to frontend
    return new Response(
      JSON.stringify({
        content: n8nData.response || n8nData.text || n8nData.content || n8nData.message || 'No response generated',
        source: n8nData.source || 'dws-chatbot',
        citation: n8nData.citation,
        citations: n8nData.citations,
        conversationId: conversationId,
        model: n8nData.model || 'unknown'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
    
  } catch (error) {
    console.error('Error in gemini-chat function:', error)
    
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