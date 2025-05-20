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

// n8n webhook URL for transcript processing
const N8N_TRANSCRIPT_WEBHOOK_URL = Deno.env.get('N8N_TRANSCRIPT_WEBHOOK_URL') || 'http://localhost:5678/webhook/e51e3a22-d283-4ba4-b0d1-62c3f8813d8f'

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
    const { transcriptId, forceProcess = false } = requestBody

    // Fetch the transcript from the database
    const { data: transcript, error: fetchError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single()

    if (fetchError || !transcript) {
      throw new Error(`Transcript not found: ${transcriptId}`)
    }

    // Check if already processed (unless force processing)
    if (transcript.is_processed && !forceProcess) {
      return new Response(
        JSON.stringify({
          message: 'Transcript already processed',
          transcriptId,
          status: 'already_processed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Forward to n8n webhook for processing
    const n8nPayload = {
      transcriptId: transcript.id,
      title: transcript.title,
      content: transcript.content,
      source: transcript.source,
      tags: transcript.tags || [],
      userId: user.id,
      forceProcess,
      metadata: {
        created_at: transcript.created_at,
        updated_at: transcript.updated_at,
        file_path: transcript.file_path,
        file_type: transcript.file_type
      }
    }

    let n8nData;
    try {
      const n8nResponse = await fetch(N8N_TRANSCRIPT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload),
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error('n8n webhook error:', errorText);
        throw new Error(`n8n webhook failed: ${n8nResponse.status}`);
      }

      n8nData = await n8nResponse.json();
      
      // Update transcript status to processed
      await supabase
        .from('transcripts')
        .update({ 
          is_processed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptId)

    } catch (error) {
      console.error('Error calling n8n webhook:', error);
      throw error;
    }

    // Return response
    return new Response(
      JSON.stringify({
        message: 'Transcript processing initiated',
        transcriptId,
        status: 'processing',
        n8nResponse: n8nData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
    
  } catch (error) {
    console.error('Error in process-transcript function:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message,
        transcriptId: null,
        status: 'error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})