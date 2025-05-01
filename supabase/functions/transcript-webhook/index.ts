
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
    const { record, type } = await req.json()
    
    console.log(`[WEBHOOK] Received event: ${type} for transcript ID ${record?.id || 'unknown'}`);
    console.log(`[WEBHOOK] Full record data:`, JSON.stringify(record, null, 2));
    
    // Only process INSERT events
    if (type !== 'INSERT') {
      console.log(`[WEBHOOK] Ignoring non-INSERT event: ${type}`);
      return new Response('Not an INSERT event, ignoring', { 
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
    
    // Don't process if transcript is already being processed or processed
    if (record.is_processed === true) {
      console.log(`[WEBHOOK] Transcript ${record.id} already processed, skipping`);
      return new Response('Transcript already processed', { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Check if there is already a processing_started_at timestamp in metadata
    if (record.metadata?.processing_started_at) {
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
    
    console.log(`[WEBHOOK] Received new transcript, triggering processing: ${record.id}`);

    // Update the transcript status to indicate it's being processed
    console.log(`[WEBHOOK] Updating transcript ${record.id} to mark as in processing`);
    const { error: updateError } = await supabaseAdmin
      .from('transcripts')
      .update({ 
        metadata: { 
          ...record.metadata,
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
    })
    
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
              ...record.metadata,
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
