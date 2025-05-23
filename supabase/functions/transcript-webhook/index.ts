
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// Create a Supabase client with the Auth context of the function
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const payload = await req.json();
    
    // Check if this is a health check request
    if (payload.type === 'HEALTH_CHECK') {
      console.log(`[WEBHOOK] Received health check request`);
      return new Response(JSON.stringify({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { record, type } = payload;
    
    console.log(`[WEBHOOK] Received event: ${type} for transcript ID ${record?.id || 'unknown'}`);
    console.log(`[WEBHOOK] Full record data:`, JSON.stringify(record, null, 2));
    
    // Handle n8n processing completion
    if (type === 'N8N_PROCESSING_COMPLETE') {
      console.log(`[WEBHOOK] Received n8n processing completion for transcript ${record.id}`);
      
      // Update the transcript with processed data
      const { error: updateError } = await supabaseAdmin
        .from('transcripts')
        .update({
          is_processed: true,
          metadata: {
            ...record.metadata,
            webhook_processed_at: new Date().toISOString()
          }
        })
        .eq('id', record.id);
      
      if (updateError) {
        console.error('[WEBHOOK] Error updating transcript after n8n processing:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`[WEBHOOK] Successfully updated transcript ${record.id} after n8n processing`);
      return new Response(JSON.stringify({ success: true, message: 'n8n processing completed' }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Only process INSERT events and forced processing for initial processing
    if (type !== 'INSERT' && type !== 'FORCE_PROCESSING') {
      console.log(`[WEBHOOK] Ignoring non-processing event: ${type}`);
      return new Response('Not a processing event, ignoring', { 
        status: 200,
        headers: corsHeaders 
      });
    }
    
    // Validate record
    if (!record || !record.id) {
      console.error('[WEBHOOK] Invalid record format:', record);
      return new Response('Invalid webhook payload', { 
        status: 400,
        headers: corsHeaders 
      });
    }
    
    // Don't process if transcript is already processed (unless force processing)
    if (record.is_processed === true && type !== 'FORCE_PROCESSING') {
      console.log(`[WEBHOOK] Transcript ${record.id} already processed, skipping`);
      return new Response('Transcript already processed', { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Check if there is already a processing_started_at timestamp in metadata
    // and it's not a forced processing request
    if (type !== 'FORCE_PROCESSING' && record.metadata?.processing_started_at) {
      const processingStartedAt = new Date(record.metadata.processing_started_at);
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      // If processing started less than 5 minutes ago, don't start another process
      if (processingStartedAt > fiveMinutesAgo) {
        console.log(`[WEBHOOK] Transcript ${record.id} is already being processed (started at ${processingStartedAt}), skipping`);
        return new Response('Transcript is already being processed', { 
          status: 200,
          headers: corsHeaders 
        });
      } else {
        console.log(`[WEBHOOK] Transcript ${record.id} processing started more than 5 minutes ago, restarting processing`);
      }
    }
    
    // Get the current transcript data to make sure we have the most up-to-date information
    const { data: transcript, error: fetchError } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('id', record.id)
      .single();
      
    if (fetchError) {
      console.error(`[WEBHOOK] Error fetching transcript ${record.id}:`, fetchError);
      return new Response(JSON.stringify({ 
        error: `Failed to fetch transcript: ${fetchError.message}` 
      }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
      
    if (!transcript) {
      console.error(`[WEBHOOK] Transcript ${record.id} not found in database`);
      return new Response(JSON.stringify({ 
        error: 'Transcript not found in database'
      }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[WEBHOOK] Starting processing for transcript: ${transcript.id}`);

    // Update the transcript status to indicate it's being processed
    console.log(`[WEBHOOK] Updating transcript ${record.id} to mark as in processing`);
    const { error: updateError } = await supabaseAdmin
      .from('transcripts')
      .update({ 
        metadata: { 
          ...transcript.metadata,
          processing_started_at: new Date().toISOString(),
          webhook_triggered_at: new Date().toISOString()
        } 
      })
      .eq('id', record.id);
    
    if (updateError) {
      console.error('[WEBHOOK] Error updating transcript processing status:', updateError);
    } else {
      console.log(`[WEBHOOK] Successfully marked transcript ${record.id} as in processing`);
    }
    
    // Call the process-transcript function to start processing
    console.log(`[WEBHOOK] Invoking process-transcript function for transcript ${record.id}`);
    const { data, error } = await supabaseAdmin.functions.invoke('process-transcript', {
      body: { transcript_id: record.id }
    });
    
    if (error) {
      console.error('[WEBHOOK] Error invoking process-transcript function:', error);
      
      // Try to mark the transcript as processed with error
      try {
        console.log(`[WEBHOOK] Marking transcript ${record.id} as failed due to invocation error`);
        await supabaseAdmin
          .from('transcripts')
          .update({ 
            is_processed: true,
            metadata: { 
              ...transcript.metadata,
              processing_completed_at: new Date().toISOString(),
              processing_error: `Failed to invoke processing: ${error.message}`,
              processing_failed: true
            } 
          })
          .eq('id', record.id);
      } catch (markError) {
        console.error('[WEBHOOK] Failed to mark transcript as failed:', markError);
      }
      
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[WEBHOOK] Successfully invoked process-transcript for ${record.id}, response:`, data);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Processing initiated',
      data
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[WEBHOOK] Error in transcript-webhook function:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
