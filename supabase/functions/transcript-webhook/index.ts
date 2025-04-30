
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
    
    console.log(`Webhook received: ${type} for transcript ID ${record?.id || 'unknown'}`);
    
    // Only process INSERT events
    if (type !== 'INSERT') {
      console.log(`Ignoring non-INSERT event: ${type}`);
      return new Response('Not an INSERT event, ignoring', { 
        status: 200,
        headers: corsHeaders 
      });
    }
    
    // Validate record
    if (!record || !record.id) {
      console.error('Invalid record format:', record);
      return new Response('Invalid webhook payload', { 
        status: 400,
        headers: corsHeaders 
      });
    }
    
    // Don't process if transcript is already being processed
    if (record.is_processed === true) {
      console.log(`Transcript ${record.id} already processed, skipping`);
      return new Response('Transcript already processed', { 
        status: 200,
        headers: corsHeaders 
      });
    }
    
    console.log(`Received new transcript, triggering processing: ${record.id}`);

    // Update the transcript status to indicate it's being processed
    const { error: updateError } = await supabaseAdmin
      .from('transcripts')
      .update({ 
        metadata: { 
          ...record.metadata,
          processing_started_at: new Date().toISOString() 
        } 
      })
      .eq('id', record.id);
    
    if (updateError) {
      console.error('Error updating transcript processing status:', updateError);
    }
    
    // Call the process-transcript function to start processing
    const { data, error } = await supabaseAdmin.functions.invoke('process-transcript', {
      body: { transcript_id: record.id }
    })
    
    if (error) {
      console.error('Error invoking process-transcript function:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Processing initiated',
      data
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in transcript-webhook function:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
