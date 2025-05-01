
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { id } = await req.json();

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Transcript ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[PROCESS] Received request to process transcript ${id}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[PROCESS] Missing Supabase environment variables');
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Get the transcript
    const { data: transcript, error: getError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (getError || !transcript) {
      console.error(`[PROCESS] Error fetching transcript ${id}:`, getError?.message || 'Not found');
      return new Response(
        JSON.stringify({ error: getError?.message || 'Transcript not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`[PROCESS] Found transcript ${id}: "${transcript.title}"`);

    // Update metadata to indicate processing
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        metadata: {
          ...transcript.metadata,
          processing_started_at: new Date().toISOString(),
          processing_triggered_by: 'diagnostic-tool'
        }
      })
      .eq('id', id);

    if (updateError) {
      console.error(`[PROCESS] Error updating transcript ${id} metadata:`, updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[PROCESS] Updated metadata for transcript ${id}`);

    // Call the transcript webhook function to trigger processing
    console.log(`[PROCESS] Invoking transcript-webhook for transcript ${id}`);
    const { error: webhookError } = await supabase.functions.invoke('transcript-webhook', {
      body: { 
        type: 'INSERT',
        record: { id: transcript.id } 
      }
    });

    if (webhookError) {
      console.error(`[PROCESS] Error calling webhook for transcript ${id}:`, webhookError);
      return new Response(
        JSON.stringify({ error: webhookError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[PROCESS] Successfully triggered processing for transcript ${id}`);
    return new Response(
      JSON.stringify({ success: true, message: 'Transcript processing triggered' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[PROCESS] Error processing transcript:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
